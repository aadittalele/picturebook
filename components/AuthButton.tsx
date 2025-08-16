'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import { LogOut, User as UserIcon } from 'lucide-react'

interface AuthButtonProps {
  user?: User | null
}

export default function AuthButton({ user }: AuthButtonProps = {}) {
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) {
        console.error('Error signing in:', error)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      } else {
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Unexpected error:', error)
    }
    setLoading(false)
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          <span className="font-medium">{user.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="neo-btn neo-danger"
        >
          <span className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            {loading ? 'Signing out...' : 'Sign Out'}
          </span>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={loading}
      className="neo-btn neo-primary"
    >
      {loading ? 'Signing in...' : 'Sign In with Google'}
    </button>
  )
}
