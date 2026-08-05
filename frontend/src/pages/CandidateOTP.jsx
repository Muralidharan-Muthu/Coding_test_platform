import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearAllCandidates, deleteCandidate, getCandidates, importCandidates, updateCandidate } from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import * as XLSX from 'xlsx'
import './CandidateOTP.css'

const NAV_ITEMS = [
  {
    label: 'Assessment Dashboard',
    href: '/dashboard/assessment',
    activePaths: ['/dashboard/assessment'],
  },
  { label: 'Questions', href: '/admin/questions', activePaths: ['/admin/questions'] },
  {
    label: 'Manage Candidates',
    href: '/admin/otp',
    activePaths: ['/admin/otp'],
    children: [
      { label: 'Choose Test Type', href: '/admin/test-type', activePaths: ['/admin/test-type'] },
      { label: 'Send Mail', href: '/admin/send-mail', activePaths: ['/admin/send-mail'] },
    ],
  },
]

const EMPTY_EDIT_FORM = { username: '', email: '' }

function CandidateOTP() {
  const navigate = useNavigate()
  const [adminName, setAdminName] = useState('')
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
      setError('Failed to load candidates')
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

    setError('')
    setSuccess('')
    setClearing(true)

    try {
      const response = await clearAllCandidates()
      setSuccess(response.message || 'All candidates deleted successfully')
      resetEditState()
      await loadCandidates()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete candidates')
    } finally {
      setClearing(false)
    }
  }

  const handleDeleteCandidate = async (candidate) => {
    if (!window.confirm(`Delete candidate ${candidate.username}? This action cannot be undone.`)) {
      return
    }

    setError('')
    setSuccess('')
    setDeleting((prev) => ({ ...prev, [candidate.email]: true }))

    try {
      const response = await deleteCandidate(candidate.email)
      if (editingEmail === candidate.email) {
        resetEditState()
      }
      setSuccess(response.message || `Candidate ${candidate.username} deleted successfully`)
      await loadCandidates()
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to delete candidate ${candidate.username}`)
    } finally {
      setDeleting((prev) => ({ ...prev, [candidate.email]: false }))
    }
  }

  const handleAddCandidate = async () => {
    const validation = validateCandidateInput(newUsername, newEmail)
    if (!validation.valid) {
      setError(validation.message)
      return
    }

    setError('')
    setSuccess('')
    setImporting(true)

    try {
      const response = await importCandidates([{ username: validation.username, email: validation.email }])

      if (response.duplicates && response.duplicates.length > 0) {
        setError(`Duplicate candidate skipped: ${validation.username} (${validation.email}) already exists`)
        setSuccess('')
      } else if (response.imported && response.imported.length > 0) {
        setSuccess(`Candidate ${validation.username} added successfully`)
        setNewUsername('')
        setNewEmail('')
      } else {
        setError('Failed to add candidate. Please try again.')
      }

      await loadCandidates()
    } catch (err) {
      console.error('Error adding candidate:', err)
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to add candidate'
      setError(errorMsg)
    } finally {
      setImporting(false)
    }
  }

  const handleImportExcel = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx, .xls'

    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) {
        setError('No file selected')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }

      setError('')
      setSuccess('')
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
          const json = XLSX.utils.sheet_to_json(worksheet)

          const parsedCandidates = json
            .map((row) => {
              const validation = validateCandidateInput(row.username, row.email)
              if (!validation.valid) {
                return null
              }
              return {
                username: validation.username,
                email: validation.email,
              }
            })
            .filter(Boolean)

          if (parsedCandidates.length === 0) {
            setError('No valid candidates found in Excel file. Ensure columns are named "username" and "email".')
            setImporting(false)
            return
          }

          const response = await importCandidates(parsedCandidates)
          let message = `Successfully imported ${response.imported ? response.imported.length : 0} candidates`

          if (response.duplicates && response.duplicates.length > 0) {
            message += `, skipped ${response.duplicates.length} duplicates`
            if (response.duplicates.length <= 3) {
              const dupNames = response.duplicates.map((candidate) => candidate.username).join(', ')
              message += ` (${dupNames})`
            }
          }

          setSuccess(message)
          await loadCandidates()
        } catch (err) {
          console.error('Excel import error:', err)
          let errorMsg = 'Failed to parse Excel file. '
          if (err.message) {
            errorMsg += err.message
          } else {
            errorMsg += 'Make sure columns are named "username" and "email".'
          }
          setError(errorMsg)
        } finally {
          setImporting(false)
          input.value = ''
        }
      }

      reader.onerror = () => {
        setError('Failed to read file')
        setImporting(false)
      }

      reader.readAsArrayBuffer(file)
    }

    input.click()
  }

  const startEditing = (candidate) => {
    setError('')
    setSuccess('')
    setEditingEmail(candidate.email)
    setEditForm({
      username: candidate.username || '',
      email: candidate.email || '',
    })
  }

  const cancelEditing = () => {
    resetEditState()
    setError('')
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
      setError(validation.message)
      return
    }

    setError('')
    setSuccess('')
    setSaving((prev) => ({ ...prev, [candidate.email]: true }))

    try {
      const response = await updateCandidate(candidate.email, validation.username, validation.email)
      setSuccess(response.message || 'Candidate updated successfully')
      resetEditState()
      await loadCandidates()
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to update candidate ${candidate.username}`)
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
        {error && <div className="otp-error-msg">{error}</div>}
        {success && <div className="otp-success-msg">{success}</div>}

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
              {importing ? 'Adding...' : 'Add Candidate'}
            </button>
            <button
              onClick={handleImportExcel}
              disabled={importing}
              className="otp-btn-import"
            >
              {importing ? 'Importing...' : 'Import from Excel'}
            </button>
          </div>
        </div>

        <div className="otp-table-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Imported Candidates ({candidates.length})</h3>
          </div>

          {loading ? (
            <p>Loading...</p>
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
