import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const next = searchParams.get('next') ?? '/dashboard'

  // Check for OAuth errors first
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${error}`)
  }

  // If we have an authorization code, process it normally (PKCE flow)
  if (code) {
    try {
      const supabase = await createClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!exchangeError && data.user) {
        // Create or update user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            display_name: data.user.user_metadata?.full_name || data.user.email,
            avatar_url: data.user.user_metadata?.avatar_url,
          })
        
        if (profileError) {
          console.error('Profile creation error:', profileError)
        }

        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
      } else {
        console.error('Session exchange error:', exchangeError)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?reason=session_exchange`)
      }
    } catch (err) {
      console.error('Auth callback error:', err)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?reason=unexpected`)
    }
  }

  // If we reach here without a code parameter, it's likely implicit flow with hash fragment
  // Since hash fragments are not sent to the server, we need to handle this client-side
  // Return an HTML page that will process the hash fragment and redirect appropriately
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Processing Authentication...</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          text-align: center;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h2>Processing your sign-in...</h2>
        <p>Please wait while we complete your authentication.</p>
      </div>
      
      <script>
        // Check if we have a hash fragment with auth data
        if (window.location.hash && window.location.hash.includes('access_token=')) {
          // Redirect to our client-side handler
          window.location.href = '/auth/callback-client' + window.location.hash;
        } else {
          // No hash fragment, redirect to error page
          window.location.href = '/auth/auth-code-error?reason=no_auth_data';
        }
      </script>
    </body>
    </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  )
}
