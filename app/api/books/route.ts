import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { validateBookTitle, validateBookDescription, validatePageCount } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const isPublic = searchParams.get('public') === 'true'
    const searchQuery = searchParams.get('search')

    // For public books, authentication is optional
    let user = null
    if (!isPublic) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    let query = supabase
      .from('books')
      .select('*')

    if (isPublic) {
      query = query.eq('is_public', true)
      
      // Add search functionality for public books
      if (searchQuery && searchQuery.trim()) {
        const trimmedQuery = searchQuery.trim()
        query = query.or(`title.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%`)
      }
    } else {
      query = query.eq('user_id', user!.id)
      
      // Add search functionality for user's own books
      if (searchQuery && searchQuery.trim()) {
        const trimmedQuery = searchQuery.trim()
        query = query.or(`title.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%`)
      }
    }

    const { data: books, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching books:', error)
      return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 })
    }

    return NextResponse.json({ books })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Try to get the authorization header first
    const authHeader = request.headers.get('authorization')
    let supabase
    let user = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('Using token-based authentication')
      
      // Create a Supabase client with the user's token
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      
      // Get user info using the token
      const { data: { user: tokenUser }, error: userError } = await supabase.auth.getUser(token)
      
      if (userError) {
        console.error('Token validation error:', userError)
        return NextResponse.json({ error: 'Invalid authentication token', details: userError.message }, { status: 401 })
      }
      
      user = tokenUser
    } else {
      console.log('Using cookie-based authentication')
      // Fall back to cookie-based authentication
      supabase = await createClient()
      const { data: { user: cookieUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Cookie authentication error:', userError)
        return NextResponse.json({ error: 'Authentication failed', details: userError.message }, { status: 401 })
      }
      
      user = cookieUser
    }

    console.log('Books API: User check result:', { hasUser: !!user, userId: user?.id })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - No user found' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Books API: Request body:', body)
    
    const { title, description, isPublic = false } = body

    // Validate input
    const titleValidation = validateBookTitle(title)
    if (!titleValidation.isValid) {
      console.log('Title validation failed:', titleValidation.error)
      return NextResponse.json({ error: titleValidation.error }, { status: 400 })
    }

    const descriptionValidation = validateBookDescription(description)
    if (!descriptionValidation.isValid) {
      console.log('Description validation failed:', descriptionValidation.error)
      return NextResponse.json({ error: descriptionValidation.error }, { status: 400 })
    }

    console.log('Books API: Creating book with data:', {
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      is_public: isPublic
    })

    // Create book
    const { data: book, error } = await supabase
      .from('books')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        is_public: isPublic
      })
      .select()
      .single()

    if (error) {
      console.error('Database error creating book:', error)
      return NextResponse.json({ 
        error: 'Failed to create book', 
        details: error.message,
        hint: error.hint || 'Check if database schema is applied'
      }, { status: 500 })
    }

    console.log('Books API: Book created successfully:', book)
    return NextResponse.json({ book }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in books API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
