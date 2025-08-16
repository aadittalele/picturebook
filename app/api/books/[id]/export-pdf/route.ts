import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateBookPDF } from '@/lib/pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: bookId } = await params

    // Get book with pages
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

    if (!pages || pages.length === 0) {
      return NextResponse.json({ error: 'Book has no pages to export' }, { status: 400 })
    }

    try {
      // Generate PDF
      const pdfBlob = await generateBookPDF({ ...book, pages })
      
      // Convert blob to buffer
      const arrayBuffer = await pdfBlob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Set headers for PDF download
      const headers = new Headers()
      headers.set('Content-Type', 'application/pdf')
      headers.set('Content-Disposition', `attachment; filename="${book.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`)
      headers.set('Content-Length', buffer.length.toString())

      return new NextResponse(buffer, { headers })
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError)
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
