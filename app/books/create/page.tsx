'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, FileText, Sparkles, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import Logo from '@/components/Logo'
import toast from 'react-hot-toast'

export default function CreateBook() {
  const router = useRouter()
  const [mode, setMode] = useState<'text' | 'blank' | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    storyText: '',
    isPublic: false
  })

  const handleCreateBlankBook = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a book title')
      return
    }

    setLoading(true)
    try {
      // Get the current session to pass to the API
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('You must be signed in to create a book')
      }

      console.log('Creating book with data:', {
        title: formData.title,
        description: formData.description,
        isPublic: formData.isPublic
      })

      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          isPublic: formData.isPublic
        })
      })

      const responseData = await response.json()
      console.log('API response:', { status: response.status, data: responseData })

      if (!response.ok) {
        throw new Error(responseData.details || responseData.error || 'Failed to create book')
      }

      const { book } = responseData
      console.log('Book created successfully:', book)
      router.push(`/books/${book.id}/edit`)
    } catch (error) {
      console.error('Error creating book:', error)
      toast.error(`Failed to create book: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFromText = async () => {
    if (!formData.title.trim() || !formData.storyText.trim()) {
      toast.error('Please enter both a title and story text')
      return
    }

    setLoading(true)
    try {
      // First create the book
      const bookResponse = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          isPublic: formData.isPublic
        })
      })

      if (!bookResponse.ok) {
        throw new Error('Failed to create book')
      }

      const { book } = await bookResponse.json()

      // Then generate pages from story text
      const pagesResponse = await fetch(`/api/books/${book.id}/generate-pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyText: formData.storyText })
      })

      if (!pagesResponse.ok) {
        throw new Error('Failed to generate pages')
      }

      router.push(`/books/${book.id}/edit`)
    } catch (error) {
      console.error('Error creating book:', error)
      toast.error('Failed to create book. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="p-6 flex items-center gap-4 border-b-4 border-black bg-white">
        <Link href="/dashboard" className="neo-btn p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Logo showText={false} />
        <h1 className="text-2xl font-bold">Create New Book</h1>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        {!mode ? (
          // Mode Selection
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-6 transform -rotate-1">
              How would you like to create your book?
            </h2>
            <p className="text-xl text-gray-700 mb-12">
              Choose your preferred creation method below
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* From Text Option */}
              <button
                onClick={() => setMode('text')}
                className="neo-card p-8 hover:bg-yellow-100 transition-colors text-left group"
              >
                <Sparkles className="w-16 h-16 mb-6 text-yellow-600 mx-auto group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-bold mb-4 text-center">From Story Text</h3>
                <p className="text-gray-700 mb-6">
                  Paste your story and let AI automatically create pages with illustrations.
                  Perfect for turning existing stories into picture books.
                </p>
                <div className="bg-yellow-200 p-4 border-2 border-black">
                  <h4 className="font-bold mb-2">Features:</h4>
                  <ul className="text-sm space-y-1">
                    <li>✓ AI breaks story into pages</li>
                    <li>✓ Automatic image generation</li>
                    <li>✓ Smart content splitting</li>
                    <li>✓ Quick setup</li>
                  </ul>
                </div>
              </button>

              {/* Blank Template Option */}
              <button
                onClick={() => setMode('blank')}
                className="neo-card p-8 hover:bg-blue-100 transition-colors text-left group"
              >
                <FileText className="w-16 h-16 mb-6 text-blue-600 mx-auto group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-bold mb-4 text-center">Blank Template</h3>
                <p className="text-gray-700 mb-6">
                  Start with empty pages and manually add your content.
                  Perfect for custom layouts and original creations.
                </p>
                <div className="bg-blue-200 p-4 border-2 border-black">
                  <h4 className="font-bold mb-2">Features:</h4>
                  <ul className="text-sm space-y-1">
                    <li>✓ Full creative control</li>
                    <li>✓ Custom page layouts</li>
                    <li>✓ Upload your own images</li>
                    <li>✓ Flexible design</li>
                  </ul>
                </div>
              </button>
            </div>
          </div>
        ) : (
          // Form
          <div className="neo-card max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setMode(null)}
                className="neo-btn p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold">
                {mode === 'text' ? 'Create from Story Text' : 'Create Blank Book'}
              </h2>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <label className="block font-bold mb-2">Book Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter your book title..."
                  className="neo-input"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-2">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of your book..."
                  className="neo-textarea h-24"
                  maxLength={500}
                />
              </div>

              {mode === 'text' && (
                <div>
                  <label className="block font-bold mb-2">Story Text *</label>
                  <textarea
                    value={formData.storyText}
                    onChange={(e) => setFormData({ ...formData, storyText: e.target.value })}
                    placeholder="Paste your story here... The AI will automatically break it into picture book pages with illustrations."
                    className="neo-textarea h-48"
                    maxLength={5000}
                    required
                  />
                  <div className="text-sm text-gray-600 mt-1">
                    {formData.storyText.length}/5,000 characters
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="isPublic" className="font-bold">
                  Make this book public (others can view and share it)
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={mode === 'text' ? handleCreateFromText : handleCreateBlankBook}
                  disabled={loading}
                  className="neo-btn neo-primary flex-1 text-lg"
                >
                  {loading ? 'Creating...' : 
                   mode === 'text' ? 'Create & Generate Pages' : 'Create Blank Book'}
                </button>
                <button
                  onClick={() => setMode(null)}
                  className="neo-btn flex-1"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
