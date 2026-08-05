import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ThemeToggle from '../components/ui/ThemeToggle'
import { clearCandidateSession } from '../utils/sessionStorage'
import './SubmissionComplete.css'

function SubmissionComplete() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [userName, setUserName] = useState('')
  const isAutoSubmit = searchParams.get('auto') === 'true'

  useEffect(() => {
    const name = localStorage.getItem('user_name')
    if (name) setUserName(name)
  }, [])

  const handleBackToLogin = () => {
    clearCandidateSession()
    navigate('/')
  }

  return (
    <div className="submission-complete-page">
      <div className="sc-theme-corner">
        <ThemeToggle />
      </div>
      <div className="submission-content">
        <div className={`success-icon${isAutoSubmit ? ' auto' : ''}`} aria-hidden="true">
          {isAutoSubmit ? '⏰' : '✓'}
        </div>

        <h1>{isAutoSubmit ? "Time's Up!" : 'Exam Submitted!'}</h1>

        <p className="submission-message">
          {isAutoSubmit
            ? 'Your exam has been automatically submitted as the time expired.'
            : 'Your exam has been submitted successfully. Great job!'}
        </p>

        {userName && (
          <p className="candidate-name">
            Candidate: <strong>{userName}</strong>
          </p>
        )}

        <div className="info-card">
          <h3>What's Next?</h3>
          <ul>
            <li>
              <span aria-hidden="true">✓</span>
              Your submission has been recorded
            </li>
            <li>
              <span aria-hidden="true">✓</span>
              The Admin team will review your answers
            </li>
            <li>
              <span aria-hidden="true">✓</span>
              Results will be communicated via email
            </li>
          </ul>
        </div>

        <div className="submission-details">
          <div className="detail-item">
            <span className="detail-label">Submission Type</span>
            <span className={`detail-value${isAutoSubmit ? ' auto-tag' : ' manual-tag'}`}>
              {isAutoSubmit ? 'Auto-Submit (Timer Expired)' : 'Manual Submit'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Submission Time</span>
            <span className="detail-value">{new Date().toLocaleString()}</span>
          </div>
        </div>

        <div className="thank-you-message">
          <p>Thank you for completing the assessment!</p>
          <p className="good-luck">Best of luck! 🎉</p>
        </div>

        <button onClick={handleBackToLogin} className="btn-finish">
          Finish &amp; Exit
        </button>
      </div>
    </div>
  )
}

export default SubmissionComplete
