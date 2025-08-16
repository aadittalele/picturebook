'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Loader2 } from 'lucide-react'

export default function CallbackClient() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have hash fragment data (access_token, etc.)
        const hashFragment = window.location.hash
        
        if (hashFragment && hashFragment.includes('access_token=')) {
          // Parse the hash fragment to get the session data
          const hashParams = new URLSearchParams(hashFragment.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const tokenType = hashParams.get('token_type')
          const expiresIn = hashParams.get('expires_in')
          
          if (accessToken) {
            // Set the session using the tokens from the hash
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })
            
            if (error) {
              console.error('Session setup error:', error)
              setErrorMessage(error.message)
              setStatus('error')
              return
            }
            
            if (data.user) {
              // Create or update user profile
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  id: data.user.id,
                  email: data.user.email,
                  display_name: data.user.user_metadata?.full_name || data.user.email,
                  avatar_url: data.user.user_metadata?.avatar_url,
                })
              
              if (profileError) {
                console.error('Profile creation error:', profileError)
                // Don't fail on profile error, just log it
              }

              setStatus('success')
              
              // Clean up the URL hash
              window.history.replaceState({}, document.title, window.location.pathname)
              
              // Add a longer delay to ensure session is fully established
              setTimeout(() => {
                // Double-check the session before redirecting
                supabase.auth.getSession().then(({ data: sessionData }) => {
                  if (sessionData.session?.user) {
                    router.push('/dashboard')
                  } else {
                    console.error('Session not found after setup, redirecting to home')
                    router.push('/')
                  }
                })
              }, 1000)
              return
            } else {
              setErrorMessage('Failed to create user session')
              setStatus('error')
              return
            }
          } else {
            setErrorMessage('No access token found in authentication response')
            setStatus('error')
            return
          }
        }
        
        // Fallback: try to get existing session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setErrorMessage(error.message)
          setStatus('error')
          return
        }

        if (data.session?.user) {
          setStatus('success')
          router.push('/dashboard')
        } else {
          setErrorMessage('No authentication data found')
          setStatus('error')
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setErrorMessage('An unexpected error occurred')
        setStatus('error')
      }
    }

    handleAuthCallback()
  }, [router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Signing you in...</h1>
          <p className="text-gray-600">Please wait while we complete your authentication.</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 text-center">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-green-800">Success!</h1>
          <p className="text-gray-600">You've been signed in successfully. Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 text-center max-w-md">
        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2 text-red-800">Authentication Failed</h1>
        <p className="text-gray-600 mb-4">
          {errorMessage || 'There was a problem signing you in.'}
        </p>
        <button
          onClick={() => router.push('/')}
          className="bg-black text-white font-bold py-3 px-6 border-4 border-black hover:bg-gray-800 transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
