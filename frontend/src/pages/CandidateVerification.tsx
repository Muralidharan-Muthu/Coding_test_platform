import { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ui/ThemeToggle'
import { PlatformLogoSmall } from '../components/ui/Branding'
import { clearCandidateSession } from '../utils/sessionStorage'

const webcamConstraints = {
  facingMode: 'user',
}

function CandidateVerification() {
  const navigate = useNavigate()
  const webcamRef = useRef(null)
  const [userName, setUserName] = useState('')
  const [capturedImage, setCapturedImage] = useState('')
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    const name = localStorage.getItem('user_name')
    const sessionId = localStorage.getItem('session_id')

    if (!name || !sessionId) {
      navigate('/')
      return
    }

    setUserName(name)
  }, [navigate])

  const handleCapture = () => {
    const image = webcamRef.current?.getScreenshot()
    if (!image) {
      setCameraError('Unable to capture the image. Please confirm that camera access is enabled and try again.')
      return
    }

    setCameraError('')
    setCapturedImage(image)
  }

  const handleRetake = () => {
    setCapturedImage('')
    setCameraError('')
  }

  const handleCameraAccessError = () => {
    setCameraError('Camera access is required to complete the identity check. Allow camera permission and reload this page.')
  }

  const handleLogout = () => {
    clearCandidateSession()
    navigate('/')
  }

  return (
    <div className="candidate-verification-page">
      <header className="header">
        <div className="header-logo">
          <PlatformLogoSmall onClick={() => navigate('/dashboard')} />
        </div>
        <div className="header-right">
          <ThemeToggle />
          <div className="user-info">
            <div className="user-avatar" aria-hidden="true">{userName.charAt(0).toUpperCase()}</div>
            <span className="user-name-text">{userName}</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </header>

      <main className="candidate-verification-content">
        <div className="verification-hero">
          <h2>Candidate Identity Check</h2>
          <p className="verification-subtitle">
            Capture a live photograph before proceeding to the assessment environment.
          </p>
        </div>

        <div className="verification-layout">
          <section className="verification-card camera-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-eyebrow">Live Camera</span>
                <h3>Capture and Review</h3>
              </div>
            </div>

            <div className="camera-stage">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Candidate preview"
                  className="camera-preview-image"
                />
              ) : (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  mirrored
                  screenshotFormat="image/jpeg"
                  videoConstraints={webcamConstraints}
                  className="camera-feed"
                  onUserMediaError={handleCameraAccessError}
                />
              )}
            </div>

            {cameraError && (
              <div className="verification-error" role="alert">
                {cameraError}
              </div>
            )}

            <div className="camera-actions">
              {capturedImage ? (
                <button type="button" className="btn-secondary" onClick={handleRetake}>
                  Retake Photo
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={handleCapture}>
                  Take Picture
                </button>
              )}
            </div>
          </section>

          <section className="verification-card instructions-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-eyebrow">Instructions</span>
                <h3>Identity Verification Notice</h3>
              </div>
            </div>

            <div className="instruction-list">
              <div className="instruction-item-block">
                <strong>Purpose of capture</strong>
                <p>
                  A live photograph is requested solely to support candidate identity verification for the active assessment session.
                </p>
              </div>
              <div className="instruction-item-block">
                <strong>Privacy handling</strong>
                <p>
                  The captured image is obtained exclusively for assessment identity verification and will be erased following the submission of the test.
                </p>
              </div>
              <div className="instruction-item-block">
                <strong>Candidate guidance</strong>
                <p>
                  Ensure your face is clearly visible, the camera frame is well lit, and no other person appears in the image at the time of capture.
                </p>
              </div>
            </div>

            <div className="verification-note">
              Please review the image before continuing. You may retake the photo if clarity or framing is not satisfactory.
            </div>

            <div className="navigation-actions">
              <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/test-structure')}
                disabled={!capturedImage}
              >
                Next
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default CandidateVerification
