import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LoginForm } from './LoginForm'

interface AuthGateProps {
  children: React.ReactNode
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <>{children}</>
}