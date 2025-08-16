import { NextRequest, NextResponse } from 'next/server'
import { generateImage } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const { prompt, storyContext } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    console.log('[API] Generate image request:', { prompt, hasContext: !!storyContext })

    const imageUrl = await generateImage(prompt, storyContext)
    
    console.log('[API] Image generated successfully')
    return NextResponse.json({ 
      imageUrl,
      success: true 
    })

  } catch (error) {
    console.error('[API] Error generating image:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
