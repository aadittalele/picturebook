import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { validatePageTitle, validatePageContent, validatePageNumber } from '@/lib/validation'
import { invalidateStoryContext } from '@/lib/ai'

export async function POST(
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
    const { pageNumber, title, content, imageUrl } = body

    // Check if user owns the book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('user_id, page_count')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input
    const pageNumberValidation = validatePageNumber(pageNumber, book.page_count)
    if (!pageNumberValidation.isValid) {
      return NextResponse.json({ error: pageNumberValidation.error }, { status: 400 })
    }

    const titleValidation = validatePageTitle(title)
    if (!titleValidation.isValid) {
      return NextResponse.json({ error: titleValidation.error }, { status: 400 })
    }

    const contentValidation = validatePageContent(content)
    if (!contentValidation.isValid) {
      return NextResponse.json({ error: contentValidation.error }, { status: 400 })
    }

    // Check if page number already exists
    const { data: existingPage } = await supabase
      .from('pages')
      .select('id')
      .eq('book_id', bookId)
      .eq('page_number', pageNumber)
      .single()

    if (existingPage) {
      return NextResponse.json({ error: 'Page number already exists' }, { status: 400 })
    }

    // If inserting a page in the middle, shift subsequent pages
    if (pageNumber <= book.page_count) {
      const { error: shiftError } = await supabase.rpc('shift_pages', {
        book_id_param: bookId,
        start_page: pageNumber
      })

      if (shiftError) {
        console.error('Error shifting pages:', shiftError)
        return NextResponse.json({ error: 'Failed to insert page' }, { status: 500 })
      }
    }

    // Create page
    const { data: page, error } = await supabase
      .from('pages')
      .insert({
        book_id: bookId,
        page_number: pageNumber,
        title: title?.trim() || null,
        content: content?.trim() || null,
        image_url: imageUrl || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating page:', error)
      return NextResponse.json({ error: 'Failed to create page' }, { status: 500 })
    }

    // Invalidate story context cache since new page was added
    invalidateStoryContext(bookId)

    return NextResponse.json({ page }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
