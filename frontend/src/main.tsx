import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import AllJobs from './AllJobs'
import JobDetail from './JobDetail'
import Workers from './Workers'
import Queues from './Queues'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/jobs" element={<AllJobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/workers" element={<Workers />} />
        <Route path="/queues" element={<Queues />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
