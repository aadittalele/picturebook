import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { processImage, validateImageSize, isValidImageFormat } from '@/lib/image-processing'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    console.log('[UPLOAD] Start request')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('[UPLOAD] Auth check result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email,
      authError: authError?.message 
    })

    if (!user) {
      console.log('[UPLOAD] Unauthorized: no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: bookId, pageId } = await params
    console.log('[UPLOAD] User:', user.id, 'Book:', bookId, 'Page:', pageId)

    // Check if user owns the book and page exists
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('books!inner(user_id)')
      .eq('id', pageId)
      .eq('book_id', bookId)
      .single()

    if (pageError || !page) {
  console.log('[UPLOAD] Page not found or error', pageError)
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    if ((page.books as any).user_id !== user.id) {
  console.log('[UPLOAD] Unauthorized: user does not own page')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      console.log('[UPLOAD] No file provided')
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }
    console.log('[UPLOAD] File received:', { name: (file as any).name, type: file.type, size: file.size })

    // Validate file
    if (!isValidImageFormat(file.type)) {
      console.log('[UPLOAD] Invalid file format', file.type)
      return NextResponse.json({ error: 'Invalid file format. Please upload JPEG, PNG, or WebP images.' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      console.log('[UPLOAD] File too large', file.size)
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    try {
      // Convert file to buffer
      console.log('[UPLOAD] Reading file into buffer')
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Process image
      console.log('[UPLOAD] Processing image via sharp')
      const result = await processImage(buffer)
      console.log('[UPLOAD] Processing complete', { width: result.width, height: result.height, size: result.size })

      // Validate processed image
      if (!validateImageSize(result.originalBase64)) {
        console.log('[UPLOAD] Processed image too large after validation')
        return NextResponse.json({ error: 'Processed image is too large' }, { status: 400 })
      }

      // Update page with new image
      console.log('[UPLOAD] Updating page record with image data')
      const { data: updatedPage, error: updateError } = await supabase
        .from('pages')
        .update({
          image_url: result.originalBase64,
          image_compressed: result.compressedBase64
        })
        .eq('id', pageId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating page:', updateError)
        return NextResponse.json({ error: 'Failed to save image' }, { status: 500 })
      }
      console.log('[UPLOAD] Success - page updated', updatedPage?.id)

      return NextResponse.json({ 
        step: 'completed',
        page: updatedPage,
        imageInfo: {
          width: result.width,
          height: result.height,
          size: result.size
        }
      })
    } catch (processingError) {
      console.error('Error processing image:', processingError)
      return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
