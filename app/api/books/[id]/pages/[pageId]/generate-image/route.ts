import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateImage, cacheStoryContext, getCachedStoryContext } from '@/lib/ai'

export async function POST(
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
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Check for cached story context first (for efficiency)
    let contextString = getCachedStoryContext(bookId)
    let targetPage: any = null
    
    if (!contextString) {
      // Fetch complete story context if not cached
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select(`
          id,
          title,
          description,
          user_id,
          pages!inner(id, page_number, title, content)
        `)
        .eq('id', bookId)
        .eq('user_id', user.id)
        .single()

      if (bookError || !bookData) {
        return NextResponse.json({ error: 'Book not found or unauthorized' }, { status: 404 })
      }

      // Find the specific page
      targetPage = bookData.pages.find(p => p.id === pageId)
      if (!targetPage) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }

      // Create comprehensive story context
      const sortedPages = bookData.pages.sort((a, b) => a.page_number - b.page_number)
      const storyContext = {
        title: bookData.title,
        description: bookData.description || '',
        currentPageNumber: targetPage.page_number,
        totalPages: sortedPages.length,
        allPageContents: sortedPages.map(p => ({
          pageNumber: p.page_number,
          title: p.title || '',
          content: p.content || ''
        })),
        // Include surrounding pages for better context
        previousPages: sortedPages
          .filter(p => p.page_number < targetPage.page_number)
          .slice(-2) // Last 2 previous pages
          .map(p => `Page ${p.page_number}: ${p.title || ''} - ${p.content || ''}`),
        nextPages: sortedPages
          .filter(p => p.page_number > targetPage.page_number)
          .slice(0, 2) // Next 2 pages
          .map(p => `Page ${p.page_number}: ${p.title || ''} - ${p.content || ''}`)
      }

      // Convert story context to a formatted string for AI
      contextString = `
Story: "${storyContext.title}"
Description: ${storyContext.description}
Total pages: ${storyContext.totalPages}

All story content: ${storyContext.allPageContents.map(p => 
  `Page ${p.pageNumber}: ${p.title} - ${p.content}`
).join(' | ')}
      `.trim()
      
      // Cache the context for future use
      cacheStoryContext(bookId, contextString)
    } else {
      // If using cached context, still need to verify page exists and get current page info
      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .select('id, page_number, title, content, books!inner(user_id)')
        .eq('id', pageId)
        .eq('book_id', bookId)
        .single()

      if (pageError || !pageData) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }

      if ((pageData.books as any).user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      targetPage = pageData
    }

    // Generate image immediately with full story context
    let imageUrl: string
    try {
      console.log('[API] Starting AI image generation with story context...')
      
      // Add current page context to the cached story context
      const fullContextString = `
${contextString}

Current page: ${targetPage.page_number}
Current page title: ${targetPage.title || ''}
Current page content: ${targetPage.content || ''}
      `.trim()
      
      imageUrl = await generateImage(prompt, fullContextString)
      console.log('[API] Image generation completed, size:', imageUrl.length, 'characters')
    } catch (genErr) {
      console.error('Image generation failure:', genErr)
      return NextResponse.json({ error: 'Failed to generate image', details: genErr instanceof Error ? genErr.message : 'Unknown error' }, { status: 500 })
    }

    // Update page with generated image
    const { error: pageUpdateError } = await supabase
      .from('pages')
      .update({ image_url: imageUrl })
      .eq('id', pageId)

    if (pageUpdateError) {
      console.error('Failed to update page with image:', pageUpdateError)
      return NextResponse.json({ error: 'Failed to save generated image' }, { status: 500 })
    }

    return NextResponse.json({
      imageUrl,
      message: 'Image generated successfully'
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Background processing removed (generation is synchronous with placeholder implementation)
