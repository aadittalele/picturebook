import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { validateBookTitle, validateBookDescription } from '@/lib/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: bookId } = await params

    // First get the book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Check if user has access (owner or public book)
    if (!book.is_public && (!user || book.user_id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pages
    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .eq('book_id', bookId)
      .order('page_number', { ascending: true })

    if (pagesError) {
      console.error('Error fetching pages:', pagesError)
      return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
    }

    return NextResponse.json({ book: { ...book, pages: pages || [] } })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: bookId } = await params
    const body = await request.json()
    const { title, description, isPublic, coverImage } = body

    // Check if user owns the book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('user_id')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input
    if (title !== undefined) {
      const titleValidation = validateBookTitle(title)
      if (!titleValidation.isValid) {
        return NextResponse.json({ error: titleValidation.error }, { status: 400 })
      }
    }

    if (description !== undefined) {
      const descriptionValidation = validateBookDescription(description)
      if (!descriptionValidation.isValid) {
        return NextResponse.json({ error: descriptionValidation.error }, { status: 400 })
      }
    }

    // Update book
    const updateData: any = {}
    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (isPublic !== undefined) updateData.is_public = isPublic
    if (coverImage !== undefined) updateData.cover_image = coverImage

    const { data: updatedBook, error } = await supabase
      .from('books')
      .update(updateData)
      .eq('id', bookId)
      .select()
      .single()

    if (error) {
      console.error('Error updating book:', error)
      return NextResponse.json({ error: 'Failed to update book' }, { status: 500 })
    }

    return NextResponse.json({ book: updatedBook })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: bookId } = await params

    // Check if user owns the book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('user_id')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete book (pages will be deleted via CASCADE)
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', bookId)

    if (error) {
      console.error('Error deleting book:', error)
      return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
