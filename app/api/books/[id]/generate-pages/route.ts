import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateStoryPages } from '@/lib/ai'
import { validateStoryText, validatePageCount } from '@/lib/validation'

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
    const { storyText } = body

    // Validate story text
    const storyValidation = validateStoryText(storyText)
    if (!storyValidation.isValid) {
      return NextResponse.json({ error: storyValidation.error }, { status: 400 })
    }

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

    // Check if book already has pages
    if (book.page_count > 0) {
      return NextResponse.json({ error: 'Book already has pages. Delete existing pages first.' }, { status: 400 })
    }

    try {
      // Generate pages using AI
      const generatedPages = await generateStoryPages(storyText)

      if (!validatePageCount(generatedPages.length)) {
        return NextResponse.json({ error: 'Generated page count exceeds limit' }, { status: 400 })
      }

      // Insert pages into database
      const pagesToInsert = generatedPages.map((page, index) => ({
        book_id: bookId,
        page_number: index + 1,
        title: page.title,
        content: page.content,
        // Store image prompt for later AI generation
        image_url: null
      }))

      const { data: insertedPages, error: insertError } = await supabase
        .from('pages')
        .insert(pagesToInsert)
        .select()

      if (insertError) {
        console.error('Error inserting pages:', insertError)
        return NextResponse.json({ error: 'Failed to create pages' }, { status: 500 })
      }

      return NextResponse.json({ 
        pages: insertedPages,
        message: 'Pages generated successfully.'
      })
    } catch (aiError) {
      console.error('Error generating pages:', aiError)
      return NextResponse.json({ error: 'Failed to generate story pages' }, { status: 500 })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
