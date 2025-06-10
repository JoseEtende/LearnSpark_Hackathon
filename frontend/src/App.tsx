import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { VideoProvider } from './contexts/VideoContext'
import { AuthGate } from './components/AuthGate'
import { VideoList } from './components/VideoList'
import { UploadForm } from './components/UploadForm'
import { DashboardLayout } from './components/DashboardLayout'
import './index.css'

function App() {
  return (
    <AuthProvider>
      <VideoProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={
                <AuthGate>
                  <VideoList />
                </AuthGate>
              } />
              <Route path="/upload" element={
                <AuthGate>
                  <UploadForm />
                </AuthGate>
              } />
              <Route path="/dashboard/:videoId" element={
                <AuthGate>
                  <DashboardLayout />
                </AuthGate>
              } />
            </Routes>
          </div>
        </Router>
      </VideoProvider>
    </AuthProvider>
  )
}

export default App