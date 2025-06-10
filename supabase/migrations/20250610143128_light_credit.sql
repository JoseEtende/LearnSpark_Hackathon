/*
  # Enable Row Level Security and Create Policies

  1. Security Updates
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Ensure data isolation between users

  2. Tables Updated
    - videos: Users can only access their own videos
    - transcript_chunks: Users can only access chunks from their videos
    - quizzes: Users can only access their own quizzes
    - quiz_questions: Users can only access questions from their quizzes
*/

-- Enable RLS on all tables
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Videos policies
CREATE POLICY "Users can read own videos"
  ON videos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos"
  ON videos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
  ON videos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Transcript chunks policies
CREATE POLICY "Users can read own transcript chunks"
  ON transcript_chunks
  FOR SELECT
  TO authenticated
  USING (
    video_id IN (
      SELECT id FROM videos WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transcript chunks for own videos"
  ON transcript_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    video_id IN (
      SELECT id FROM videos WHERE user_id = auth.uid()
    )
  );

-- Quizzes policies
CREATE POLICY "Users can read own quizzes"
  ON quizzes
  FOR SELECT
  TO authenticated
  USING (
    video_id IN (
      SELECT id FROM videos WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert quizzes for own videos"
  ON quizzes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    video_id IN (
      SELECT id FROM videos WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own quizzes"
  ON quizzes
  FOR UPDATE
  TO authenticated
  USING (
    video_id IN (
      SELECT id FROM videos WHERE user_id = auth.uid()
    )
  );

-- Quiz questions policies
CREATE POLICY "Users can read quiz questions from own quizzes"
  ON quiz_questions
  FOR SELECT
  TO authenticated
  USING (
    quiz_id IN (
      SELECT id FROM quizzes 
      WHERE video_id IN (
        SELECT id FROM videos WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert quiz questions for own quizzes"
  ON quiz_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    quiz_id IN (
      SELECT id FROM quizzes 
      WHERE video_id IN (
        SELECT id FROM videos WHERE user_id = auth.uid()
      )
    )
  );