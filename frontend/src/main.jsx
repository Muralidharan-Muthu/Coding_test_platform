import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import AssessmentDashboard from './pages/AssessmentDashboard'
import CandidateDashboard from './pages/CandidateDashboard'
import CandidateVerification from './pages/CandidateVerification'
import CandidateOTP from './pages/CandidateOTP'
import ChooseTestTypePage from './pages/ChooseTestTypePage'
import CodingPage from './pages/CodingPage'
import HRDashboard from './pages/HRDashboard'
import LandingPage from './pages/LandingPage'
import MCQProblems from './pages/MCQProblems'
import MCQQuestionsPage from './pages/MCQQuestionsPage'
import ProblemList from './pages/ProblemList'
import PythonProblems from './pages/PythonProblems'
import QuestionsPage from './pages/QuestionsPage'
import SendMailPage from './pages/SendMailPage'
import Login from './pages/Login'
import SQLProblems from './pages/SQLProblems'
import SubmissionComplete from './pages/SubmissionComplete'
import TestStructure from './pages/TestStructure'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing — replaces both login pages */}
        <Route path="/" element={<LandingPage />} />

        {/* Legacy login routes → redirect to landing */}
        <Route path="/login" element={<Login />} />
        <Route path="/hr" element={<Navigate to="/dashboard/assessment" replace />} />

        {/* Candidate flow */}
        <Route path="/dashboard" element={<CandidateDashboard />} />
        <Route path="/candidate-verification" element={<CandidateVerification />} />
        <Route path="/test-structure" element={<TestStructure />} />
        <Route path="/problems/python" element={<PythonProblems />} />
        <Route path="/problems/sql" element={<SQLProblems />} />
        <Route path="/problems/mcq" element={<MCQProblems />} />
        <Route path="/problems" element={<ProblemList />} />
        <Route path="/coding/:problemId" element={<CodingPage />} />
        <Route path="/submission-complete" element={<SubmissionComplete />} />

        {/* HR flow */}
        <Route path="/hr/dashboard" element={<HRDashboard />} />
        <Route path="/hr/otp" element={<CandidateOTP />} />
        <Route path="/hr/test-type" element={<ChooseTestTypePage />} />
        <Route path="/hr/send-mail" element={<SendMailPage />} />
        <Route path="/dashboard/assessment" element={<AssessmentDashboard />} />
        <Route path="/hr/questions" element={<QuestionsPage />} />
        <Route path="/hr/questions/mcq" element={<MCQQuestionsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
