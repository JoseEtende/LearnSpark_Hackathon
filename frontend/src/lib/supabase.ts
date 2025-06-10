import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      videos: {
        Row: {
          id: string
          user_id: string | null
          title: string
          original_url: string | null
          storage_path: string | null
          status: string
          upload_date: string | null
          duration_seconds: number | null
          error_message: string | null
          full_transcript: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          original_url?: string | null
          storage_path?: string | null
          status?: string
          upload_date?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          full_transcript?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          original_url?: string | null
          storage_path?: string | null
          status?: string
          upload_date?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          full_transcript?: string | null
        }
      }
      transcript_chunks: {
        Row: {
          id: string
          video_id: string | null
          chunk_text: string
          start_time_seconds: number
          end_time_seconds: number
          chunk_index: number
          embedding_id: string | null
          embedding: number[] | null
        }
        Insert: {
          id?: string
          video_id?: string | null
          chunk_text: string
          start_time_seconds: number
          end_time_seconds: number
          chunk_index: number
          embedding_id?: string | null
          embedding?: number[] | null
        }
        Update: {
          id?: string
          video_id?: string | null
          chunk_text?: string
          start_time_seconds?: number
          end_time_seconds?: number
          chunk_index?: number
          embedding_id?: string | null
          embedding?: number[] | null
        }
      }
      quizzes: {
        Row: {
          id: string
          video_id: string | null
          created_at: string | null
          status: string
        }
        Insert: {
          id?: string
          video_id?: string | null
          created_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          video_id?: string | null
          created_at?: string | null
          status?: string
        }
      }
      quiz_questions: {
        Row: {
          id: string
          quiz_id: string | null
          question_text: string
          options: any
          correct_answer_index: number
          source_timestamp_seconds: number | null
        }
        Insert: {
          id?: string
          quiz_id?: string | null
          question_text: string
          options: any
          correct_answer_index: number
          source_timestamp_seconds?: number | null
        }
        Update: {
          id?: string
          quiz_id?: string | null
          question_text?: string
          options?: any
          correct_answer_index?: number
          source_timestamp_seconds?: number | null
        }
      }
    }
  }
}