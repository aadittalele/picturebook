import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { validatePageTitle, validatePageContent } from '@/lib/validation'
import { invalidateStoryContext } from '@/lib/ai'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: bookId, pageId } = await params
    const body = await request.json()
    const { title, content, imageUrl } = body

    // Check if user owns the book and page exists
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*, books!inner(user_id)')
      .eq('id', pageId)
      .eq('book_id', bookId)
      .single()

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    if ((page.books as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input
    if (title !== undefined) {
      const titleValidation = validatePageTitle(title)
      if (!titleValidation.isValid) {
        return NextResponse.json({ error: titleValidation.error }, { status: 400 })
      }
    }

    if (content !== undefined) {
      const contentValidation = validatePageContent(content)
      if (!contentValidation.isValid) {
        return NextResponse.json({ error: contentValidation.error }, { status: 400 })
      }
    }

    // Update page
    const updateData: any = {}
    if (title !== undefined) updateData.title = title?.trim() || null
    if (content !== undefined) updateData.content = content?.trim() || null
    if (imageUrl !== undefined) updateData.image_url = imageUrl

    const { data: updatedPage, error } = await supabase
      .from('pages')
      .update(updateData)
      .eq('id', pageId)
      .select()
      .single()

    if (error) {
      console.error('Error updating page:', error)
      return NextResponse.json({ error: 'Failed to update page' }, { status: 500 })
    }

    // Invalidate story context cache since page content changed
    invalidateStoryContext(bookId)

    return NextResponse.json({ page: updatedPage })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: bookId, pageId } = await params

    // Check if user owns the book and get page details
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('page_number, books!inner(user_id)')
      .eq('id', pageId)
      .eq('book_id', bookId)
      .single()

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    if ((page.books as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete page
    const { error } = await supabase
      .from('pages')
      .delete()
      .eq('id', pageId)

    if (error) {
      console.error('Error deleting page:', error)
      return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 })
    }

    // Invalidate story context cache since page was deleted
    invalidateStoryContext(bookId)

    // Shift subsequent pages down
    const { error: shiftError } = await supabase.rpc('shift_pages_down', {
      book_id_param: bookId,
      deleted_page_number: page.page_number
    })

    if (shiftError) {
      console.error('Error shifting pages down:', shiftError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
