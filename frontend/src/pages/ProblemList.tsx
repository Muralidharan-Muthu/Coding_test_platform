import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { FiArrowRight, FiDatabase } from 'react-icons/fi'
import { SiPython } from 'react-icons/si'
import { PlatformLogoSmall } from '../components/ui/Branding'

function ProblemList() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [problems, setProblems] = useState([])

  useEffect(() => {
    const name = localStorage.getItem('user_name')
    if (!name) { navigate('/'); return }
    setUserName(name)
    loadProblems()
  }, [navigate])

  const loadProblems = async () => {
    try {
      const response = await api.get('/admin/problems')
      setProblems(response.data)
    } catch (err) {
      console.error('Failed to load problems', err)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    navigate('/')
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return { bg: 'var(--color-easy-bg)', color: 'var(--color-easy)' }
      case 'medium': return { bg: 'var(--color-medium-bg)', color: 'var(--color-medium)' }
      case 'hard': return { bg: 'var(--color-hard-bg)', color: 'var(--color-hard)' }
      default: return { bg: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }
    }
  }

  return (
    <div className="problem-list-page">
      <header className="header">
        <PlatformLogoSmall onClick={() => navigate('/practice/problems')} />
        <div className="header-right">
          <ThemeToggle />
          <div className="user-info">
            <span className="user-name-text">{userName}</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </header>

      <div className="problem-list-container">
        <div className="pl-heading">
          <h2>Select a Problem</h2>
          <p className="pl-subtitle">{problems.length} problems available</p>
        </div>
        <div className="problems-grid">
          {problems.map((problem) => {
            const diff = getDifficultyColor(problem.difficulty)
            return (
              <div
                key={problem.id}
                className="problem-card"
                onClick={() => navigate(`/coding/${problem.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/coding/${problem.id}`)}
                aria-label={`${problem.title}, ${problem.language}, ${problem.difficulty}`}
              >
                <div className="problem-header">
                  <h3>{problem.title}</h3>
                  <span className={`language-badge ${problem.language.toLowerCase()}`}>
                    {problem.language === 'python' ? <SiPython /> : <FiDatabase />} {problem.language}
                  </span>
                </div>
                <div className="problem-footer">
                  <span
                    className="difficulty"
                    style={{ background: diff.bg, color: diff.color }}
                  >
                    {problem.difficulty}
                  </span>
                  <span className="problem-arrow" aria-hidden="true"><FiArrowRight /></span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ProblemList
