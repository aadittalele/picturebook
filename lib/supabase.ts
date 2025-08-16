import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      books: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          is_public: boolean
          cover_image: string | null
          page_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          is_public?: boolean
          cover_image?: string | null
          page_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          is_public?: boolean
          cover_image?: string | null
          page_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      pages: {
        Row: {
          id: string
          book_id: string
          page_number: number
          title: string | null
          content: string | null
          image_url: string | null
          image_compressed: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          book_id: string
          page_number: number
          title?: string | null
          content?: string | null
          image_url?: string | null
          image_compressed?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          page_number?: number
          title?: string | null
          content?: string | null
          image_url?: string | null
          image_compressed?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
