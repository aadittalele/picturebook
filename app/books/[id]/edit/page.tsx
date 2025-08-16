'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { ArrowLeft, BookOpen, Plus, Edit, Trash2, Image, Save, Eye } from 'lucide-react'
import PageEditor from '@/components/PageEditor'
import Logo from '@/components/Logo'
import toast from 'react-hot-toast'

interface Book {
  id: string
  title: string
  description: string | null
  is_public: boolean
  page_count: number
  user_id: string
}

interface Page {
  id: string
  book_id: string
  page_number: number
  title: string | null
  content: string | null
  image_url: string | null
  created_at?: string
  updated_at?: string
  isTemporary?: boolean // Flag for draft pages not yet saved to database
}

export default function EditBook() {
  const params = useParams()
  const router = useRouter()
  const [book, setBook] = useState<Book | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [bookMetaData, setBookMetaData] = useState({
    title: '',
    description: '',
    isPublic: false
  })

  useEffect(() => {
    loadBookData()
  }, [params.id])

  const loadBookData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('[CLIENT] Session check in loadBookData:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        userEmail: session?.user?.email 
      })
      
      if (!session) {
        router.push('/')
        return
      }

      // Fetch book
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', params.id)
        .single()

      if (bookError || !bookData) {
        setError('Book not found')
        return
      }

      // Check if user owns this book
      if (bookData.user_id !== session.user.id) {
        setError('You can only edit your own books')
        return
      }

      setBook(bookData)
      setBookMetaData({
        title: bookData.title,
        description: bookData.description || '',
        isPublic: bookData.is_public
      })

      // Fetch pages
      const { data: pagesData, error: pagesError } = await supabase
        .from('pages')
        .select('*')
        .eq('book_id', params.id)
        .order('page_number')

      if (pagesError) {
        console.error('Error fetching pages:', pagesError)
      } else {
        setPages(pagesData || [])
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading book data:', err)
      setError('Failed to load book data')
      setLoading(false)
    }
  }

  const updateBookMetadata = async () => {
    if (!book) return

    try {
      const { error } = await supabase
        .from('books')
        .update({
          title: bookMetaData.title,
          description: bookMetaData.description,
          is_public: bookMetaData.isPublic
        })
        .eq('id', book.id)

      if (error) {
        throw error
      }

      setBook({ ...book, ...bookMetaData })
      toast.success('Book details updated successfully!')
    } catch (err) {
      console.error('Error updating book:', err)
      toast.error('Failed to update book details')
    }
  }

  const addNewPage = () => {
    if (!book) return
    
    if (pages.length >= 20) {
      toast.error('Maximum of 20 pages allowed per book')
      return
    }

    // Create a temporary page object for editing (not saved to database yet)
    const newPageNumber = pages.length + 1
    const tempPage = {
      id: `temp-${Date.now()}`, // Temporary ID
      book_id: book.id,
      page_number: newPageNumber,
      title: `Page ${newPageNumber}`,
      content: '',
      image_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isTemporary: true // Flag to indicate this is a draft page
    }

    setEditingPage(tempPage)
  }

  const deletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return

    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId)

      if (error) {
        throw error
      }

      const updatedPages = pages.filter(p => p.id !== pageId)
      setPages(updatedPages)
      setEditingPage(null)
    } catch (err) {
      console.error('Error deleting page:', err)
      toast.error('Failed to delete page')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-black">Loading book...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-800">Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="bg-black text-white font-bold py-3 px-6 border-4 border-black hover:bg-gray-800 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="p-6 border-b-4 border-black bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="bg-gray-200 p-2 border-2 border-black hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </Link>
            <Logo showText={false} />
            <div>
              <h1 className="text-2xl font-bold text-black">Edit Book</h1>
              <p className="text-gray-600">{book?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/books/${book?.id}`}
              className="bg-blue-400 text-black font-bold py-2 px-4 border-2 border-black hover:bg-blue-300 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Book Metadata */}
          <div className="lg:col-span-1">
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-black">Book Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-black">Title</label>
                  <input
                    type="text"
                    value={bookMetaData.title}
                    onChange={(e) => setBookMetaData({ ...bookMetaData, title: e.target.value })}
                    className="w-full p-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
                    placeholder="Enter book title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-black">Description</label>
                  <textarea
                    value={bookMetaData.description}
                    onChange={(e) => setBookMetaData({ ...bookMetaData, description: e.target.value })}
                    className="w-full p-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-400 h-24 text-black"
                    placeholder="Enter book description"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={bookMetaData.isPublic}
                      onChange={(e) => setBookMetaData({ ...bookMetaData, isPublic: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-bold text-black">Make this book public</span>
                  </label>
                </div>

                <button
                  onClick={updateBookMetadata}
                  className="w-full bg-green-400 text-black font-bold py-3 px-4 border-2 border-black hover:bg-green-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Book Details
                </button>
              </div>
            </div>

            {/* Pages List */}
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-black">Pages ({pages.length}/20)</h2>
                <button
                  onClick={addNewPage}
                  disabled={pages.length >= 20}
                  className="bg-green-400 text-black font-bold py-2 px-3 border-2 border-black hover:bg-green-300 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Page
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className={`p-3 border-2 cursor-pointer transition-colors ${
                      editingPage?.id === page.id
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setEditingPage(page)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-black">Page {page.page_number}</p>
                        <p className="text-xs text-gray-600 truncate">{page.title || 'Untitled'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {page.image_url && <Image className="w-4 h-4 text-green-600" />}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePage(page.id)
                          }}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Page Editor */}
          <div className="lg:col-span-2">
            {editingPage ? (
              <PageEditor
                key={editingPage.id}
                pageNumber={editingPage.page_number}
                title={editingPage.title || ''}
                content={editingPage.content || ''}
                imageUrl={editingPage.image_url || undefined}
                onSave={async (data) => {
                  try {
                    if (!book) {
                      toast.error('Book not found')
                      return
                    }

                    if (editingPage.isTemporary) {
                      // This is a new page, create it in the database
                      const { data: newPage, error } = await supabase
                        .from('pages')
                        .insert({
                          book_id: book.id,
                          page_number: editingPage.page_number,
                          title: data.title,
                          content: data.content,
                          image_url: data.imageUrl || null
                        })
                        .select()
                        .single()

                      if (error) {
                        throw error
                      }

                      // Add the new page to the pages array and stop editing
                      setPages([...pages, newPage])
                      setEditingPage(null)
                      toast.success('Page created successfully!')
                    } else {
                      // This is an existing page, update it
                      const { error } = await supabase
                        .from('pages')
                        .update({
                          title: data.title,
                          content: data.content,
                          image_url: data.imageUrl || null
                        })
                        .eq('id', editingPage.id)

                      if (error) {
                        throw error
                      }

                      const updatedPage = {
                        ...editingPage,
                        title: data.title,
                        content: data.content,
                        image_url: data.imageUrl || null
                      }

                      // Update both states in a way that prevents flicker
                      const updatedPages = pages.map(p => p.id === updatedPage.id ? updatedPage : p)
                      setPages(updatedPages)
                      setEditingPage(updatedPage)
                      toast.success('Page saved successfully!')
                    }
                  } catch (err) {
                    console.error('Error saving page:', err)
                    toast.error('Failed to save page')
                  }
                }}
                onCancel={() => setEditingPage(null)}
                onGenerateImage={async (prompt) => {
                  try {
                    if (editingPage.isTemporary) {
                      // For temporary pages, generate image but store in local state only
                      console.log('[CLIENT] Generate image for temporary page', { prompt })
                      
                      // Create story context for temporary pages
                      const storyContext = book && pages.length > 0 ? `
Story: "${book.title}"
Description: ${book.description || ''}
Total existing pages: ${pages.length}

Existing story content: ${pages.sort((a, b) => a.page_number - b.page_number)
  .map(p => `Page ${p.page_number}: ${p.title || ''} - ${p.content || ''}`)
  .join(' | ')}

This is a new page (Page ${editingPage.page_number}) being added to the story.
                      `.trim() : ''
                      
                      const response = await fetch('/api/generate-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          prompt,
                          storyContext: storyContext || undefined
                        })
                      })

                      const data = await response.json()
                      console.log('[CLIENT] Generate image response', data)
                      if (!response.ok) {
                        throw new Error(data?.details || 'Failed to generate image')
                      }

                      // Update local editing state only
                      const updatedPage = {
                        ...editingPage,
                        image_url: data.imageUrl
                      }
                      setEditingPage(updatedPage)
                      toast.success('Image generated successfully!')
                    } else {
                      // For existing pages, use the normal API
                      console.log('[CLIENT] Generate image start', { pageId: editingPage.id, prompt })
                      const response = await fetch(`/api/books/${book?.id}/pages/${editingPage.id}/generate-image`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt })
                      })

                      const data = await response.json()
                      console.log('[CLIENT] Generate image response', data)
                      if (!response.ok) {
                        throw new Error(data?.details || 'Failed to generate image')
                      }

                      const updatedPage = {
                        ...editingPage,
                        image_url: data.imageUrl
                      }
                      setPages(pages.map(p => p.id === updatedPage.id ? updatedPage : p))
                      setEditingPage(updatedPage)
                      toast.success('Image generated successfully!')
                    }
                  } catch (err) {
                    console.error('Error generating image:', err)
                    toast.error('Failed to generate image')
                  }
                }}
                onUploadImage={async (file) => {
                  try {
                    // Check client-side auth state first
                    const { data: { session } } = await supabase.auth.getSession()
                    console.log('[CLIENT] Upload - checking auth state:', { 
                      hasSession: !!session, 
                      userId: session?.user?.id 
                    })
                    
                    if (!session) {
                      console.log('[CLIENT] No session found on client side')
                      toast.error('You need to be logged in to upload images')
                      return
                    }

                    if (editingPage.isTemporary) {
                      // For temporary pages, convert to base64 and store in local state
                      const reader = new FileReader()
                      reader.onload = (e) => {
                        const base64 = e.target?.result as string
                        const updatedPage = {
                          ...editingPage,
                          image_url: base64
                        }
                        setEditingPage(updatedPage)
                        toast.success('Image uploaded successfully!')
                      }
                      reader.readAsDataURL(file)
                    } else {
                      // For existing pages, use the normal upload API
                      console.log('[CLIENT] Upload start', { fileName: file.name, size: file.size, type: file.type })
                      const formData = new FormData()
                      formData.append('image', file)

                      const response = await fetch(`/api/books/${book?.id}/pages/${editingPage.id}/upload-image`, {
                        method: 'POST',
                        body: formData
                      })

                      let json: any = null
                      try {
                        json = await response.json()
                        console.log('[CLIENT] Upload response JSON', json)
                      } catch (e) {
                        console.log('[CLIENT] Failed to parse JSON response')
                      }

                      if (!response.ok) {
                        throw new Error(json?.error || 'Failed to upload image')
                      }

                      const apiPage = json.page
                      const updatedPage = {
                        ...editingPage,
                        image_url: apiPage?.image_url || editingPage.image_url
                      }

                      setPages(pages.map(p => p.id === updatedPage.id ? updatedPage : p))
                      setEditingPage(updatedPage)
                      console.log('[CLIENT] Upload success state updated')
                      toast.success('Image uploaded successfully!')
                    }
                  } catch (err) {
                    console.error('Error uploading image:', err)
                    toast.error('Failed to upload image')
                  }
                }}
              />
            ) : (
              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-bold mb-2 text-black">Select a page to edit</h3>
                <p className="text-gray-600 mb-6">
                  Choose a page from the list on the left, or add a new page to get started.
                </p>
                {pages.length === 0 && (
                  <button
                    onClick={addNewPage}
                    className="bg-blue-400 text-black font-bold py-3 px-6 border-2 border-black hover:bg-blue-300 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Page
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
