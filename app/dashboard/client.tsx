'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'
import { BookOpen, Plus, Eye, Edit, Trash2, Loader2 } from 'lucide-react'
import AuthButton from '@/components/AuthButton'
import Logo from '@/components/Logo'

interface Book {
  id: string
  title: string
  description: string | null
  page_count: number
  is_public: boolean
  created_at: string
}

export default function DashboardClient() {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [booksLoading, setBooksLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          router.push('/')
          return
        }

        if (!session?.user) {
          console.log('No session found, redirecting to home')
          router.push('/')
          return
        }

        console.log('Dashboard: User authenticated:', session.user.email)
        setUser(session.user)
        setIsLoading(false)

        // Load user's books
        setBooksLoading(true)
        const { data: booksData, error: booksError } = await supabase
          .from('books')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        if (booksError) {
          console.error('Error fetching books:', booksError)
        } else {
          setBooks(booksData || [])
        }
        setBooksLoading(false)

      } catch (err) {
        console.error('Unexpected error in dashboard:', err)
        router.push('/')
      }
    }

    checkAuthAndLoadData()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Dashboard: Auth state change:', event, !!session?.user)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b-4 border-black bg-white">
        <Logo showText={false} />
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Picture Books</h1>
            <p className="text-sm text-gray-600">Welcome back, {user?.identities?.at(0)?.identity_data?.name}</p>
          </div>
        </div>
        <AuthButton user={user} />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Create New Book Button */}
        <div className="mb-8">
          <Link
            href="/books/create"
            className="inline-flex items-center gap-2 bg-green-400 text-black font-bold py-4 px-6 border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Plus className="w-5 h-5" />
            Create New Picture Book
          </Link>
        </div>

        {/* Books Grid */}
        {booksLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your books...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 max-w-md mx-auto">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold mb-2">No books yet!</h3>
              <p className="text-gray-600 mb-4">
                Create your first picture book to get started.
              </p>
              <Link
                href="/books/create"
                className="inline-flex items-center gap-2 bg-blue-400 text-black font-bold py-3 px-6 border-4 border-black hover:bg-blue-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Your First Book
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-6 hover:shadow-[4px_4px_0px_0px_#000] hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
              >
                <h3 className="text-xl font-bold mb-2 line-clamp-2">{book.title}</h3>
                {book.description && (
                  <p className="text-gray-600 mb-4 line-clamp-3">{book.description}</p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{book.page_count} pages</span>
                  <span className={`px-2 py-1 rounded ${
                    book.is_public 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {book.is_public ? 'Public' : 'Private'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/books/${book.id}`}
                    className="flex-1 bg-blue-400 text-black font-bold py-2 px-4 border-2 border-black hover:bg-blue-300 transition-colors text-center flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  <Link
                    href={`/books/${book.id}/edit`}
                    className="flex-1 bg-yellow-400 text-black font-bold py-2 px-4 border-2 border-black hover:bg-yellow-300 transition-colors text-center flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
