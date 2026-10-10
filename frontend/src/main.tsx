import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import GlobalLayout from './GlobalLayout'
import App from './App'
import AllJobs from './AllJobs'
import JobDetail from './JobDetail'
import Workers from './Workers'
import Queues from './Queues'
import CreateJob from './CreateJob'
import System from './System'
import AuthPage from './AuthPage'
import ProtectedRoute from './auth/ProtectedRoute'
import { AuthProvider } from './auth/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<GlobalLayout />}>
              <Route path="/" element={<App />} />
              <Route path="/jobs" element={<AllJobs />} />
              <Route path="/jobs/create" element={<CreateJob />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/workers" element={<Workers />} />
              <Route path="/queues" element={<Queues />} />
              <Route path="/system" element={<System />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)
