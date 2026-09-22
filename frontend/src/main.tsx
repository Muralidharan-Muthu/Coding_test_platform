import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/ui/ToastProvider'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import './index.css'

// Candidate & Proctoring Pages
import Login from './pages/Login'
import CandidateDashboard from './pages/CandidateDashboard'
import TestStructure from './pages/TestStructure'
import ProblemList from './pages/ProblemList'
import PythonProblems from './pages/PythonProblems'
import SQLProblems from './pages/SQLProblems'
import MCQProblems from './pages/MCQProblems'
import CodingPage from './pages/CodingPage'
import SubmissionComplete from './pages/SubmissionComplete'
import ErrorBoundary from './components/ErrorBoundary'
import ExamProctoringShell from './components/Proctoring/ExamProctoringShell'

// Practice Pages
import PracticeLogin from './pages/PracticeLogin'
import PracticeProblems from './pages/PracticeProblems'
import PracticeCodingPage from './pages/PracticeCodingPage'

// Admin Pages
import AdminLogin from './pages/AdminLogin'
import AssessmentDashboard from './pages/AssessmentDashboard'
import CandidateOTP from './pages/CandidateOTP'
import ChooseTestTypePage from './pages/ChooseTestTypePage'
import SendMailPage from './pages/SendMailPage'
import QuestionsPage from './pages/QuestionsPage'
import MCQQuestionsPage from './pages/MCQQuestionsPage'
import AdminCodingPage from './pages/AdminCodingPage'

function ExamRoutesLayout() {
  return (
    <ExamProctoringShell>
      <Outlet />
    </ExamProctoringShell>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ========================================================= */}
        {/* 1. Candidate Exam Flow (Entry Point & Active Exam Shell)   */}
        {/* ========================================================= */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<CandidateDashboard />} />
        <Route path="/submission-complete" element={<SubmissionComplete />} />

        {/* Proctored Exam Shell (Camera + AI Proctoring + Fullscreen Lock) */}
        <Route element={<ExamRoutesLayout />}>
          <Route path="/test-structure" element={<TestStructure />} />
          <Route path="/problems" element={<ProblemList />} />
          <Route path="/problems/python" element={<PythonProblems />} />
          <Route path="/problems/sql" element={<SQLProblems />} />
          <Route path="/problems/mcq" element={<MCQProblems />} />
          <Route path="/coding/:problemId" element={<CodingPage />} />
        </Route>

        {/* ========================================================= */}
        {/* 2. Practice Flow (Unproctored, Untimed Learning Arena)   */}
        {/* ========================================================= */}
        <Route path="/practice" element={<PracticeLogin />} />
        <Route path="/practice/problems" element={<PracticeProblems />} />
        <Route path="/practice/coding/:problemId" element={<PracticeCodingPage />} />

        {/* ========================================================= */}
        {/* 3. Admin Dashboard & Problem Preview Flow                */}
        {/* ========================================================= */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AssessmentDashboard />} />
        <Route path="/admin/dashboard/assessment" element={<AssessmentDashboard />} />
        <Route path="/dashboard/assessment" element={<Navigate to="/admin/dashboard/assessment" replace />} />
        <Route path="/admin/otp" element={<CandidateOTP />} />
        <Route path="/admin/test-type" element={<ChooseTestTypePage />} />
        <Route path="/admin/send-mail" element={<SendMailPage />} />
        <Route path="/admin/questions" element={<Navigate to="/admin/questions/python_questions" replace />} />
        <Route path="/admin/questions/python" element={<Navigate to="/admin/questions/python_questions" replace />} />
        <Route path="/admin/questions/python_questions" element={<QuestionsPage />} />
        <Route path="/admin/questions/sql" element={<Navigate to="/admin/questions/sql_questions" replace />} />
        <Route path="/admin/questions/sql_questions" element={<QuestionsPage />} />
        <Route path="/admin/questions/mcq" element={<Navigate to="/admin/questions/mcq_questions" replace />} />
        <Route path="/admin/questions/mcq_questions" element={<MCQQuestionsPage />} />
        <Route path="/admin/problem/:problemId" element={<AdminCodingPage />} />
        <Route path="/admin/coding/:problemId" element={<AdminCodingPage />} />

        {/* Legacy redirect */}
        <Route path="/hr" element={<Navigate to="/admin" replace />} />
        <Route path="/hr/*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
)