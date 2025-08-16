'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { Database } from '@/lib/supabase'
import { ArrowLeft, BookOpen } from 'lucide-react'
import BookViewer from '@/components/BookViewer'
import Logo from '@/components/Logo'
import toast from 'react-hot-toast'

type Page = Database['public']['Tables']['pages']['Row']
type Book = Database['public']['Tables']['books']['Row'] & { pages?: Page[] }

export default function BookViewerClient() {
  const params = useParams()
  const router = useRouter()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadBookData()
  }, [params.id])

  const loadBookData = async () => {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)

      // Fetch book with pages
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select(`
          *,
          pages (*)
        `)
        .eq('id', params.id)
        .single()

      if (bookError || !bookData) {
        setError('Book not found')
        return
      }

      // Check access permissions
      const isOwner = session?.user && bookData.user_id === session.user.id
      const hasAccess = bookData.is_public || isOwner

      if (!hasAccess) {
        setError('Access denied. This book is private.')
        return
      }

      // Sort pages by page number
      if (bookData.pages) {
        bookData.pages.sort((a: Page, b: Page) => a.page_number - b.page_number)
      }

      setBook(bookData)
      setLoading(false)
    } catch (err) {
      console.error('Error loading book:', err)
      setError('Failed to load book')
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    if (!book) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/books/${book.id}/export-pdf`, {
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
      })

      if (!response.ok) {
        throw new Error('Failed to export PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('Failed to export PDF. Please try again.')
    }
  }

  const handleShare = async () => {
    if (!book) return

    if (navigator.share && book.is_public) {
      try {
        await navigator.share({
          title: book.title,
          text: book.description || 'Check out this picture book!',
          url: window.location.href
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else if (book.is_public) {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Book URL copied to clipboard!')
      } catch (error) {
        console.error('Error copying to clipboard:', error)
        toast.error('Failed to copy URL')
      }
    } else {
      toast.error('This book is private and cannot be shared.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <h2 className="text-xl font-bold">Loading book...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link
            href="/"
            className="bg-black text-white font-bold py-3 px-6 border-4 border-black hover:bg-gray-800 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Book Not Found</h1>
          <Link
            href="/"
            className="bg-black text-white font-bold py-3 px-6 border-4 border-black hover:bg-gray-800 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = user && book.user_id === user.id

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="p-6 flex items-center gap-4 border-b-4 border-black bg-white">
        <Link href={isOwner ? "/dashboard" : "/"} className="bg-gray-200 p-2 border-2 border-black hover:bg-gray-300 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Logo />
        {isOwner && (
          <Link 
            href={`/books/${book.id}/edit`} 
            className="bg-blue-400 text-black font-bold py-2 px-4 border-2 border-black hover:bg-blue-300 transition-colors ml-auto"
          >
            Edit Book
          </Link>
        )}
      </header>

      <main className="py-6">
        <BookViewer
          book={book as Book & { pages: Page[] }}
          isOwner={!!isOwner}
          onExportPDF={handleExportPDF}
          onShare={book.is_public ? handleShare : undefined}
        />
      </main>
    </div>
  )
}
