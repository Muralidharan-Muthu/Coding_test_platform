import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearAllCandidates, deleteCandidate, getCandidates, importCandidates, updateCandidate } from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import Spinner from '../components/ui/Spinner'
import { ADMIN_NAV_ITEMS as NAV_ITEMS } from '../constants/data'
import * as XLSX from 'xlsx'
import { FiDownload, FiPlus, FiUploadCloud } from 'react-icons/fi'
import './CandidateOTP.css'

const EMPTY_EDIT_FORM = { username: '', email: '' }

function CandidateOTP() {
  const navigate = useNavigate()
  const toast = useToast()
  const [adminName, setAdminName] = useState('')
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [deleting, setDeleting] = useState({})
  const [saving, setSaving] = useState({})
  const [editingEmail, setEditingEmail] = useState('')
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in')
    const name = localStorage.getItem('admin_name')
    if (!loggedIn) {
      navigate('/admin')
      return
    }
    setAdminName(name || 'Admin User')
    loadCandidates()
  }, [navigate])

  useEffect(() => {
    const interval = setInterval(loadCandidates, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadCandidates = async () => {
    try {
      setLoading(true)
      const response = await getCandidates()
      setCandidates(response.candidates || [])
    } catch (err) {
      toast.error('Failed to load candidates')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const resetEditState = () => {
    setEditingEmail('')
    setEditForm(EMPTY_EDIT_FORM)
  }

  const validateCandidateInput = (username, email) => {
    const nextUsername = String(username || '').trim()
    const nextEmail = String(email || '').trim().toLowerCase()

    if (!nextUsername || !nextEmail) {
      return { valid: false, message: 'Please enter both username and email' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(nextEmail)) {
      return { valid: false, message: 'Please enter a valid email address' }
    }

    return {
      valid: true,
      username: nextUsername,
      email: nextEmail,
    }
  }

  const handleClearAllCandidates = async () => {
    if (!window.confirm('Are you sure you want to delete all imported candidates? This action cannot be undone.')) {
      return
    }

    setClearing(true)

    try {
      const response = await clearAllCandidates()
      toast.success(response.message || 'All candidates deleted successfully')
      resetEditState()
      await loadCandidates()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete candidates')
    } finally {
      setClearing(false)
    }
  }

  const handleDeleteCandidate = async (candidate) => {
    if (!window.confirm(`Delete candidate ${candidate.username}? This action cannot be undone.`)) {
      return
    }

    setDeleting((prev) => ({ ...prev, [candidate.email]: true }))

    try {
      const response = await deleteCandidate(candidate.email)
      if (editingEmail === candidate.email) {
        resetEditState()
      }
      toast.success(response.message || `Candidate ${candidate.username} deleted successfully`)
      await loadCandidates()
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to delete candidate ${candidate.username}`)
    } finally {
      setDeleting((prev) => ({ ...prev, [candidate.email]: false }))
    }
  }

  const handleAddCandidate = async () => {
    const validation = validateCandidateInput(newUsername, newEmail)
    if (!validation.valid) {
      toast.error(validation.message)
      return
    }

    setImporting(true)

    try {
      const response = await importCandidates([{ username: validation.username, email: validation.email }])
      const importedList = response.candidates || response.imported || []

      if (response.duplicates && response.duplicates.length > 0) {
        toast.warning(`Duplicate candidate skipped: ${validation.username} (${validation.email}) already exists`)
      } else if (importedList.length > 0) {
        toast.success(`Candidate ${validation.username} added successfully`)
        setNewUsername('')
        setNewEmail('')
      } else {
        toast.error('Failed to add candidate. Please try again.')
      }

      await loadCandidates()
    } catch (err) {
      console.error('Error adding candidate:', err)
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to add candidate'
      toast.error(errorMsg)
    } finally {
      setImporting(false)
    }
  }

  const extractCandidateRow = (row) => {
    if (!row || typeof row !== 'object') return null

    let username = ''
    let email = ''

    const keys = Object.keys(row)

    // 1. Try exact/fuzzy header matching
    for (const k of keys) {
      const normKey = String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '')
      const val = String(row[k] || '').trim()
      if (!val) continue

      if (!email && (normKey.includes('email') || normKey.includes('mail'))) {
        email = val
      } else if (!username && (normKey.includes('user') || normKey.includes('name') || normKey.includes('candidate') || normKey.includes('student'))) {
        username = val
      }
    }

    // 2. Fallback: if email wasn't found by header name, find any property containing '@'
    if (!email) {
      for (const k of keys) {
        const val = String(row[k] || '').trim()
        if (val.includes('@') && val.includes('.')) {
          email = val
          break
        }
      }
    }

    // 3. Fallback: if username is still empty, pick first non-email text value
    if (!username) {
      for (const k of keys) {
        const val = String(row[k] || '').trim()
        if (val && val !== email && !val.includes('@')) {
          username = val
          break
        }
      }
    }

    // 4. Final fallback: if username is empty but email exists, derive username from email prefix
    if (!username && email) {
      username = email.split('@')[0]
    }

    return { username, email }
  }

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      { username: 'aarav.sharma', email: 'aarav.sharma@example.com' },
      { username: 'bhavna.patel', email: 'bhavna.patel@example.com' },
      { username: 'chetan.kumar', email: 'chetan.kumar@example.com' },
    ]
    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates')
    XLSX.writeFile(workbook, 'candidate_import_template.xlsx')
    toast.success('Downloaded sample candidate import template!')
  }

  const handleImportExcel = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx, .xls, .csv'

    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }

      setImporting(true)

      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result)
          const workbook = XLSX.read(data, { type: 'array' })

          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Excel file has no sheets')
          }

          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

          const parsedCandidates = json
            .map((row) => {
              const extracted = extractCandidateRow(row)
              if (!extracted) return null
              const validation = validateCandidateInput(extracted.username, extracted.email)
              if (!validation.valid) return null
              return {
                username: validation.username,
                email: validation.email,
              }
            })
            .filter(Boolean)

          if (parsedCandidates.length === 0) {
            toast.error('No valid candidates found in file. Use "Download Sample Template" to download a valid Excel format.')
            setImporting(false)
            return
          }

          const response = await importCandidates(parsedCandidates)
          const importedList = response.candidates || response.imported || []
          let message = `Successfully imported ${importedList.length} candidate(s)`

          if (response.duplicates && response.duplicates.length > 0) {
            message += ` (${response.duplicates.length} duplicate candidate(s) skipped)`
          }

          toast.success(message)
          await loadCandidates()
        } catch (err) {
          console.error('Excel import error:', err)
          toast.error(err.message || 'Failed to parse uploaded Excel/CSV file')
        } finally {
          setImporting(false)
          input.value = ''
        }
      }

      reader.onerror = () => {
        toast.error('Failed to read file')
        setImporting(false)
      }

      reader.readAsArrayBuffer(file)
    }

    input.click()
  }

  const startEditing = (candidate) => {
    setEditingEmail(candidate.email)
    setEditForm({
      username: candidate.username || '',
      email: candidate.email || '',
    })
  }

  const cancelEditing = () => {
    resetEditState()
  }

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveEdit = async (candidate) => {
    const validation = validateCandidateInput(editForm.username, editForm.email)
    if (!validation.valid) {
      toast.error(validation.message)
      return
    }

    setSaving((prev) => ({ ...prev, [candidate.email]: true }))

    try {
      const response = await updateCandidate(candidate.email, validation.username, validation.email)
      toast.success(response.message || 'Candidate updated successfully')
      resetEditState()
      await loadCandidates()
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to update candidate ${candidate.username}`)
    } finally {
      setSaving((prev) => ({ ...prev, [candidate.email]: false }))
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_logged_in')
    navigate('/admin')
  }

  return (
    <AdminSidebarLayout
      className="otp-dashboard"
      adminName={adminName || 'Admin User'}
      navItems={NAV_ITEMS}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
    >
      <div className="otp-content">

        <div className="otp-instructions">
          <h3>How to Manage Candidates:</h3>
          <ol>
            <li><strong>Add Candidates:</strong> Upload an Excel file with columns "username" and "email", or add candidates manually</li>
            <li><strong>Edit Candidate:</strong> Use the new edit option to correct a candidate name or email before sending access details</li>
            <li><strong>Choose Test Type:</strong> Use the "Choose Test Type" sub-topic to assign each candidate their test format</li>
            <li><strong>Send Mail:</strong> Use the "Send Mail" sub-topic to generate OTP and send the login email</li>
          </ol>
        </div>

        <div className="otp-add-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Add or Import Candidates</h3>
            {candidates.length > 0 && (
              <button
                onClick={handleClearAllCandidates}
                disabled={clearing}
                className="otp-btn-clear"
              >
                {clearing ? 'Clearing...' : 'Clear All Candidates'}
              </button>
            )}
          </div>
          <p style={{ marginBottom: '15px', color: '#666' }}>Excel file should have columns: <strong>username</strong> and <strong>email</strong></p>
          <div className="otp-add-form">
            <input
              type="text"
              placeholder="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="otp-input"
            />
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="otp-input"
            />
            <button
              onClick={handleAddCandidate}
              disabled={importing}
              className="otp-btn-add"
            >
              <FiPlus style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {importing ? 'Adding...' : 'Add Candidate'}
            </button>
            <button
              onClick={handleImportExcel}
              disabled={importing}
              className="otp-btn-import"
            >
              <FiUploadCloud style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {importing ? 'Importing...' : 'Import from Excel / CSV'}
            </button>
            <button
              type="button"
              onClick={handleDownloadSampleExcel}
              disabled={importing}
              style={{
                padding: '10px 16px',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FiDownload style={{ verticalAlign: 'middle' }} />
              Sample Template
            </button>
          </div>
        </div>

        <div className="otp-table-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Imported Candidates ({candidates.length})</h3>
          </div>

          {loading ? (
            <Spinner label="Loading candidates…" size={40} />
          ) : candidates.length === 0 ? (
            <p className="otp-no-data">No candidates found. Add or import candidates above.</p>
          ) : (
            <div className="table-responsive">
              <table className="otp-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => {
                    const isEditing = editingEmail === candidate.email
                    const isSaving = Boolean(saving[candidate.email])
                    const isDeleting = Boolean(deleting[candidate.email])

                    return (
                      <tr key={candidate.email}>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.username}
                              onChange={(e) => handleEditChange('username', e.target.value)}
                              className="otp-input otp-table-input"
                            />
                          ) : (
                            candidate.username
                          )}
                        </td>
                        <td className="email-cell">
                          {isEditing ? (
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => handleEditChange('email', e.target.value)}
                              className="otp-input otp-table-input"
                            />
                          ) : (
                            candidate.email
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <div className="otp-inline-actions">
                              <button
                                onClick={() => handleSaveEdit(candidate)}
                                disabled={isSaving || isDeleting}
                                className="otp-btn-save"
                              >
                                {isSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEditing}
                                disabled={isSaving}
                                className="otp-btn-cancel"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(candidate)}
                              disabled={isDeleting}
                              className="otp-btn-edit"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteCandidate(candidate)}
                            disabled={isDeleting || isSaving}
                            className="otp-btn-delete"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminSidebarLayout>
  )
}

export default CandidateOTP
