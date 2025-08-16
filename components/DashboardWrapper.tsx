'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Loader2 } from 'lucide-react'

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Dashboard auth error:', error)
          router.push('/')
          return
        }

        if (!session?.user) {
          console.log('No session found, redirecting to home')
          router.push('/')
          return
        }

        setUser(session.user)
        setIsLoading(false)
      } catch (err) {
        console.error('Unexpected auth error:', err)
        router.push('/')
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, !!session?.user)
        if (event === 'SIGNED_OUT' || !session?.user) {
          router.push('/')
        } else if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          setIsLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Loading your dashboard...</h2>
          <p className="text-gray-600">Please wait while we verify your session.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
