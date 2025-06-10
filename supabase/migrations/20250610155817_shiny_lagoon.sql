/*
  # Add vector search capabilities to transcript chunks

  1. Extensions
    - Enable pgvector extension for vector operations

  2. Schema Changes
    - Add embedding column to transcript_chunks table
    - Create vector similarity search index

  3. Functions
    - Create function to search similar transcript chunks using vector similarity
*/

-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to transcript_chunks if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcript_chunks' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE transcript_chunks ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- Drop existing function if it exists (to avoid parameter conflicts)
DROP FUNCTION IF EXISTS match_transcript_chunks(uuid, vector, double precision, integer);
DROP FUNCTION IF EXISTS match_transcript_chunks(uuid, vector, float, integer);

-- Create index on embedding column for faster similarity search
CREATE INDEX IF NOT EXISTS transcript_chunks_embedding_idx 
ON transcript_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to search for similar transcript chunks
CREATE OR REPLACE FUNCTION match_transcript_chunks(
  target_video_id uuid,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  video_id uuid,
  chunk_text text,
  start_time_seconds real,
  end_time_seconds real,
  chunk_index integer,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.video_id,
    tc.chunk_text,
    tc.start_time_seconds,
    tc.end_time_seconds,
    tc.chunk_index,
    1 - (tc.embedding <=> query_embedding) AS similarity
  FROM transcript_chunks tc
  WHERE tc.video_id = target_video_id
    AND tc.embedding IS NOT NULL
    AND 1 - (tc.embedding <=> query_embedding) > match_threshold
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;