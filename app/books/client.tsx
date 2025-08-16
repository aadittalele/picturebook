'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Book, Calendar, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import Logo from '@/components/Logo'
import toast from 'react-hot-toast'
import AuthButton from '@/components/AuthButton'

type Book = {
  id: string
  title: string
  description: string | null
  is_public: boolean
  page_count: number
  created_at: string
  updated_at: string
  user_id: string
}

export default function BookSearchClient() {
  const router = useRouter()
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUserAndBooks()
  }, [])

  useEffect(() => {
    filterBooks()
  }, [searchQuery, books])

  const loadUserAndBooks = async () => {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)

      // Fetch public books
      const response = await fetch('/api/books?public=true')
      if (!response.ok) {
        throw new Error('Failed to fetch books')
      }

      const data = await response.json()
      setBooks(data.books || [])
      setFilteredBooks(data.books || [])
    } catch (error) {
      console.error('Error loading books:', error)
      toast.error('Failed to load books')
    } finally {
      setLoading(false)
    }
  }

  const filterBooks = () => {
    if (!searchQuery.trim()) {
      setFilteredBooks(books)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = books.filter(book => 
      book.title.toLowerCase().includes(query) ||
      (book.description && book.description.toLowerCase().includes(query))
    )
    setFilteredBooks(filtered)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleBookClick = (bookId: string) => {
    router.push(`/books/${bookId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <Logo />
        
        {user && (
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="neo-btn text-sm"
            >
              My Books
            </Link>
          </div>
        )}

        {!user && (
          <div className="flex items-center space-x-4">
            <AuthButton />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-6 text-black transform -rotate-1">
            Discover
            <br />
            <span className="bg-yellow-300 px-4 py-2 inline-block transform rotate-1">
              Books
            </span>
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto font-medium">
            Explore magical picture books created by our community. Find stories that inspire, educate, and entertain!
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books by title or description..."
              className="neo-input text-lg"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-black" />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="neo-card">
              <div className="flex items-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-black border-t-transparent"></div>
                <span className="text-xl font-bold">Loading amazing books...</span>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        {!loading && (
          <div className="mb-8">
            <div className="neo-card inline-block">
              <p className="text-lg font-bold">
                {searchQuery ? (
                  <>Found {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} matching "{searchQuery}"</>
                ) : (
                  <>Showing {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Books Grid */}
        {!loading && filteredBooks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="neo-card hover:transform hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all duration-200"
              >
                {/* Content */}
                <div>
                  {/* Header with title and page count */}
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-2xl font-bold text-black line-clamp-2 flex-1 mr-4">
                      {book.title}
                    </h3>
                    <div className="bg-yellow-300 border-2 border-black px-2 py-1 text-sm font-bold flex items-center space-x-1 transform rotate-3 flex-shrink-0">
                      <Eye className="h-3 w-3" />
                      <span>{book.page_count} pages</span>
                    </div>
                  </div>
                  
                  {book.description && (
                    <p className="text-gray-800 text-sm mb-6 line-clamp-4 font-medium">
                      {book.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm font-bold space-x-1 bg-pink-200 px-2 py-1 border-2 border-black transform -rotate-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(book.created_at)}</span>
                    </div>

                    <button
                      onClick={() => handleBookClick(book.id)}
                      className="neo-btn neo-primary text-sm"
                    >
                      Read Book
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredBooks.length === 0 && (
          <div className="text-center py-12">
            <div className="neo-card max-w-md mx-auto">
              <Book className="mx-auto h-20 w-20 text-black mb-6 transform rotate-12" />
              <h3 className="text-3xl font-bold text-black mb-4 transform -rotate-1">
                {searchQuery ? 'No books found!' : 'No public books yet!'}
              </h3>
              <p className="text-gray-800 mb-6 font-medium">
                {searchQuery 
                  ? `No books match your search for "${searchQuery}". Try a different search term.`
                  : 'Be the first to create and share a public book with the community!'
                }
              </p>
              {user && (
                <Link
                  href="/books/create"
                  className="neo-btn neo-primary"
                >
                  Create Your First Book
                </Link>
              )}
              {!user && (
                <Link
                  href="/auth"
                  className="neo-btn neo-primary"
                >
                  Sign Up to Create Books
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
