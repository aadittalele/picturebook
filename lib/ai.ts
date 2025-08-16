import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

// Simple in-memory cache for story contexts to speed up multiple image generations
const storyContextCache = new Map<string, { context: string; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

// Cache management
export function cacheStoryContext(bookId: string, context: string) {
  storyContextCache.set(bookId, { 
    context, 
    timestamp: Date.now() 
  })
  
  // Clean old entries periodically
  if (storyContextCache.size > 100) {
    const now = Date.now()
    for (const [key, value] of storyContextCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        storyContextCache.delete(key)
      }
    }
  }
}

export function getCachedStoryContext(bookId: string): string | null {
  const cached = storyContextCache.get(bookId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.context
  }
  if (cached) {
    storyContextCache.delete(bookId) // Remove expired entry
  }
  return null
}

export function invalidateStoryContext(bookId: string) {
  storyContextCache.delete(bookId)
  console.log(`[AI] Invalidated story context cache for book ${bookId}`)
}

export async function generateImage(prompt: string, storyContext?: string): Promise<string> {
  try {
    // Check if API keys are configured
    if (!process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY.includes('your-')) {
      throw new Error('Google AI API key not configured')
    }
    
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      console.warn('[AI] Cloudflare credentials not configured, falling back to placeholder')
      return generateEnhancedPlaceholder(prompt)
    }

    // Use Gemini to enhance and refine the prompt for diffusion model
    console.log('[AI] Enhancing prompt with Gemini for:', prompt)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    
    const enhancedPrompt = `
Transform this children's book illustration prompt into a detailed description optimized for Stable Diffusion XL.

Original prompt: "${prompt}"

${storyContext ? `
STORY CONTEXT:
${storyContext}

Use this context to ensure the illustration fits the story's theme, characters, and narrative progression. Maintain consistency with the overall story style and mood.
` : ''}

Create a refined prompt following this structure:
"[art style], [main subject/character], [action/pose], [setting/background], [lighting], [color palette], [mood/atmosphere]"

Requirements:
- Start with: "children's book illustration, cartoon style, digital art"
- Ensure character consistency with the story context (if provided)
- Include specific details about characters (age, clothing, expression, consistent appearance)
- Describe the setting that fits the story's world and current scene
- Specify appropriate lighting: "soft lighting", "bright daylight", "magical glow", etc.
- Include color guidance that matches the story's mood: "vibrant colors", "pastel tones", "warm colors", etc.
- Add mood that fits the story moment: "cheerful", "magical", "cozy", "adventurous", "mysterious"
- Ensure visual consistency with the story's established style and characters
- End with: "high quality, detailed, professional illustration, consistent art style"
- Keep under 120 words
- Use only positive, safe content suitable for children
- Avoid any negative words or scary elements

Return ONLY the refined prompt, no explanations.
`

    let refinedPrompt: string
    try {
      const result = await model.generateContent(enhancedPrompt)
      refinedPrompt = result.response.text().trim()
      console.log('[AI] Refined prompt:', refinedPrompt)
    } catch (geminiError) {
      console.warn('[AI] Gemini enhancement failed, using original prompt:', geminiError)
      refinedPrompt = `children's book illustration, cartoon style, ${prompt}, vibrant colors, cheerful, high quality, detailed, professional illustration`
    }
    
    // Generate image using Cloudflare Workers AI
    const imageBase64 = await generateImageWithCloudflare(refinedPrompt)
    return imageBase64
    
  } catch (error) {
    console.error('Error generating image:', error)
    // Fallback to enhanced placeholder if anything fails
    return generateEnhancedPlaceholder(prompt)
  }
}

async function generateImageWithCloudflare(prompt: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!
  
  console.log('[AI] Generating image with Cloudflare Workers AI')
  console.log('[AI] Account ID:', accountId.substring(0, 8) + '...')
  console.log('[AI] Prompt:', prompt.substring(0, 100) + '...')
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
    
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          negative_prompt: "text, caption, signature, watermark, error, missing limbs, extra limbs, blurry, low quality",
          num_steps: 18,
          guidance_scale: 7.5,
          width: 720,
          height: 720,
          seed: 1
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)
    console.log('[AI] Cloudflare response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AI] Cloudflare API error:', response.status, errorText)
      
      // Try to parse error for better debugging
      try {
        const errorJson = JSON.parse(errorText)
        console.error('[AI] Cloudflare error details:', errorJson)
      } catch (e) {
        // Error text is not JSON
      }
      
      throw new Error(`Cloudflare Workers AI failed: ${response.status} - ${errorText}`)
    }

    const result = await response.arrayBuffer()
    console.log('[AI] Image generated successfully, size:', result.byteLength, 'bytes')
    
    if (result.byteLength === 0) {
      throw new Error('Received empty response from Cloudflare')
    }
    
    const base64 = Buffer.from(result).toString('base64')
    return `data:image/png;base64,${base64}`
    
  } catch (error) {
    console.error('[AI] Cloudflare generation failed:', error)
    throw error
  }
}

function generateEnhancedPlaceholder(prompt: string): string {
  // Create a more visually appealing SVG placeholder
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]
  
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  const lightColor = colors[Math.floor(Math.random() * colors.length)]
  
  const svg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${lightColor};stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:${randomColor};stop-opacity:0.6" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1024" height="1024" fill="url(#bg)"/>
      
      <!-- Border -->
      <rect x="20" y="20" width="984" height="984" fill="none" stroke="#000" stroke-width="8" rx="20"/>
      
      <!-- Icon/Symbol -->
      <circle cx="512" cy="300" r="80" fill="${randomColor}" opacity="0.7"/>
      <rect x="432" y="400" width="160" height="160" fill="${randomColor}" opacity="0.5" rx="20"/>
      
      <!-- Title area -->
      <rect x="100" y="600" width="824" height="100" fill="white" opacity="0.9" rx="10"/>
      
      <!-- Text -->
      <text x="512" y="550" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#333">
        Generated Image
      </text>
      
      <text x="512" y="650" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#666">
        ${prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt}
      </text>
      
      <text x="512" y="750" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#888">
        🎨 AI-Generated Placeholder
      </text>
      
      <!-- Decorative elements -->
      <circle cx="150" cy="150" r="20" fill="${randomColor}" opacity="0.6"/>
      <circle cx="874" cy="150" r="15" fill="${lightColor}" opacity="0.8"/>
      <circle cx="150" cy="874" r="25" fill="${lightColor}" opacity="0.7"/>
      <circle cx="874" cy="874" r="18" fill="${randomColor}" opacity="0.5"/>
    </svg>
  `
  
  // Convert SVG to base64 data URL
  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

export async function generateStoryPages(storyText: string): Promise<Array<{ title: string; content: string; imagePrompt: string }>> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    
    const prompt = `
Convert the following story into a picture book with 5-15 pages (maximum 20). For each page, provide:
1. A title (short and engaging)
2. Content (2-3 sentences suitable for children)
3. An image prompt (descriptive prompt for generating an illustration)

Story: ${storyText}

Format your response as a JSON array with objects containing "title", "content", and "imagePrompt" fields.
Ensure the content is age-appropriate and engaging for children.
Make sure each page flows naturally to the next.
Keep page count between 5-20 pages.
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)?.[0]
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response')
      }
      
      const pages = JSON.parse(jsonMatch)
      
      // Validate and limit to 20 pages
      if (Array.isArray(pages) && pages.length <= 20) {
        return pages.slice(0, 20).map((page: any) => ({
          title: page.title || '',
          content: page.content || '',
          imagePrompt: page.imagePrompt || page.content || ''
        }))
      }
      
      throw new Error('Invalid response format')
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      // Fallback: create simple pages
      return createFallbackPages(storyText)
    }
    
  } catch (error) {
    console.error('Error generating story pages:', error)
    throw new Error('Failed to generate story pages')
  }
}

function createFallbackPages(storyText: string): Array<{ title: string; content: string; imagePrompt: string }> {
  const sentences = storyText.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const pages = []
  const sentencesPerPage = Math.max(1, Math.floor(sentences.length / 10))
  
  for (let i = 0; i < sentences.length; i += sentencesPerPage) {
    const pageContent = sentences.slice(i, i + sentencesPerPage).join('. ').trim() + '.'
    pages.push({
      title: `Page ${pages.length + 1}`,
      content: pageContent,
      imagePrompt: pageContent.slice(0, 100)
    })
    
    if (pages.length >= 20) break
  }
  
  return pages.slice(0, 20)
}
