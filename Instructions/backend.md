```markdown
# LearnSpark - Backend Implementation Guide

**Version:** 1.0
**Date:** June 6, 2025

This document outlines the backend implementation plan for the LearnSpark project, an active learning AI companion that transforms video content into an interactive learning experience. The implementation heavily leverages Bolt.dev services.

## 1. API Design

The backend will expose a RESTful API to handle video ingestion, processing status, chat interactions, and quiz management. All endpoints accessing user-specific data will require authentication.

| Endpoint                      | Method | Description                                       | Request Payload                                  | Response Payload                                                | Authentication Required |
| :---------------------------- | :----- | :------------------------------------------------ | :----------------------------------------------- | :-------------------------------------------------------------- | :---------------------- |
| `/videos`                     | `POST` | Upload or link a new video. Triggers ingestion pipeline. | `{ file: <binary>, filename: string, url: string }` | `{ id: string, status: 'processing' }`                          | Yes                     |
| `/videos`                     | `GET`  | List videos belonging to the authenticated user.  | None                                             | `[{ id: string, title: string, status: string, uploadDate: string }]` | Yes                     |
| `/videos/{videoId}`           | `GET`  | Get details of a specific video.                  | None                                             | `{ id: string, title: string, status: string, uploadDate: string, duration: number }` | Yes                     |
| `/videos/{videoId}/transcript`| `GET`  | Get the processed transcript for a video.         | None                                             | `[{ text: string, start: number, end: number }]` (Array of segments with timestamps) | Yes                     |
| `/videos/{videoId}/chat`      | `POST` | Send a message to the AI about the video content. | `{ message: string }`                            | `{ answer: string, sources: [{ timestamp: number, text: string }] }` | Yes                     |
| `/videos/{videoId}/quizzes`   | `GET`  | Get quizzes generated for the video.              | None                                             | `[{ id: string, createdAt: string, status: string }]`           | Yes                     |
| `/videos/{videoId}/quizzes`   | `POST` | Trigger generation of a new quiz for the video.   | None                                             | `{ id: string, status: 'generating' }`                          | Yes                     |
| `/quizzes/{quizId}`           | `GET`  | Get details of a specific quiz.                   | None                                             | `{ id: string, videoId: string, questions: [{ id: string, text: string, options: string[], correctAnswerIndex: number, sourceTimestamp: number }] }` | Yes                     |
| `/quizzes/{quizId}/submit`    | `POST` | Submit answers for a quiz (Optional for v1).      | `{ answers: { [questionId]: number } }`          | `{ score: number, breakdown: [{ questionId: string, correct: boolean }] }` | Yes                     |

## 2. Data Models

The database schema will store information about users, videos, transcripts, transcript chunks (for embedding), and quizzes. We'll use Bolt.dev's integrated database (SQL or NoSQL depending on project choice; SQL is assumed here for clarity).

```sql
-- Users (Managed by Bolt.dev Auth)
-- id: UUID (Provided by Bolt.dev Auth)
-- email: string
-- ... other auth fields

-- Videos
CREATE TABLE videos (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id), -- Link to Bolt.dev Auth user ID
    title VARCHAR(255) NOT NULL,
    original_url TEXT, -- URL if linked video
    storage_path TEXT, -- Path in Bolt.dev Storage if uploaded video
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded', -- e.g., 'uploaded', 'processing', 'transcribing', 'chunking', 'embedding', 'ready', 'failed'
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER, -- Video duration in seconds
    error_message TEXT -- Store error details if processing fails
);

-- Transcripts (Raw transcription output, linked to video)
CREATE TABLE transcripts (
    id UUID PRIMARY KEY,
    video_id UUID REFERENCES videos(id),
    text TEXT NOT NULL, -- Full concatenated transcript text
    -- Could store segments here directly as JSONB or in a separate table
    segments JSONB -- Example: [{"text": "...", "start": 0.1, "end": 2.5}, ...]
);

-- Transcript Chunks (Smaller units for embedding and source linking)
CREATE TABLE transcript_chunks (
    id UUID PRIMARY KEY,
    video_id UUID REFERENCES videos(id), -- Direct link for easier queries
    transcript_id UUID REFERENCES transcripts(id), -- Link to the parent transcript
    chunk_text TEXT NOT NULL, -- The text of the chunk
    start_timestamp INTEGER NOT NULL, -- Start time in milliseconds/seconds
    end_timestamp INTEGER NOT NULL,   -- End time in milliseconds/seconds
    chunk_index INTEGER NOT NULL, -- Order of chunks
    embedding_id UUID -- ID mapping to the vector in Bolt.dev Vector store
);

-- Quizzes
CREATE TABLE quizzes (
    id UUID PRIMARY KEY,
    video_id UUID REFERENCES videos(id),
    user_id UUID REFERENCES users(id), -- Link to the user who owns the video
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'generating', -- e.g., 'generating', 'ready', 'failed'
    error_message TEXT -- Store error details if generation fails
);

-- Quiz Questions
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY,
    quiz_id UUID REFERENCES quizzes(id),
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL DEFAULT 'multiple-choice',
    options JSONB NOT NULL, -- Example: ["Option A", "Option B", "Option C", "Option D"]
    correct_answer_index INTEGER NOT NULL, -- Index in the options array
    source_timestamp INTEGER -- Timestamp in video the question relates to
);
```

## 3. Business Logic

The core business logic revolves around the asynchronous video ingestion pipeline and the real-time interaction features (chat, quiz retrieval).

1.  **Video Upload/Linking (`POST /videos`):**
    *   Receive video file or URL from the request.
    *   Authenticate the user.
    *   If file upload: Store the file in Bolt.dev Storage.
    *   Create a new `Video` record in the database with status 'uploaded', associating it with the authenticated user.
    *   Trigger a Bolt.dev Background Job for the ingestion pipeline, passing the `videoId` and storage path/URL.
    *   Return the new `videoId` and status 'processing' immediately.

2.  **Smart Ingestion Pipeline (Bolt.dev Background Job):**
    *   This job is the heart of the processing. It runs asynchronously.
    *   Retrieve `videoId` from job payload. Update `Video` status to 'processing'.
    *   Download video from Bolt.dev Storage or access from URL.
    *   Send video to Bolt.dev Whisper service for transcription. Update status to 'transcribing'.
    *   Receive structured transcript (text segments with timestamps).
    *   Store the full transcript and segmented data in the `transcripts` table.
    *   Update status to 'chunking'. Iterate through transcript segments, merge them into appropriately sized chunks (e.g., 200-500 tokens with overlap), and create `transcript_chunks` records, storing the text and original timestamps.
    *   Update status to 'embedding'. For each `transcript_chunk`, generate a vector embedding using an embedding model (integrated via Bolt.dev or external).
    *   Index the `transcript_chunk` text and its vector embedding in Bolt.dev Vector Store, associating it with the `videoId`. Store the `embedding_id` in the `transcript_chunks` table.
    *   Update `Video` status to 'ready'.
    *   *Optional:* If desired, automatically trigger the Quiz Generation job after successful ingestion.

3.  **Interactive Chat (`POST /videos/{videoId}/chat`):**
    *   Authenticate the user.
    *   Validate that the `videoId` belongs to the authenticated user.
    *   Receive user `message`.
    *   Query Bolt.dev Vector Store using the user `message` as the query vector. Filter the search to *only* the vectors associated with the given `videoId`.
    *   Retrieve the top-k most relevant `transcript_chunk` records based on the vector search results (using the `embedding_id` to look up the chunk data).
    *   Construct a prompt for the AI model (e.g., Bolt.dev AI integration or external LLM API). The prompt should include the user's question and the retrieved text chunks as context. Crucially, instruct the AI to base its answer *only* on the provided text and to cite sources by referring to timestamps from the text chunks.
    *   Send the prompt to the AI model.
    *   Parse the AI model's response to extract the answer text and any cited source information (e.g., timestamps).
    *   Return the structured response containing the answer and an array of source objects (`timestamp`, `text`).

4.  **Automated Quizzes (`POST /videos/{videoId}/quizzes`):**
    *   Authenticate the user.
    *   Validate that the `videoId` belongs to the authenticated user and its status is 'ready'.
    *   Create a new `Quiz` record with status 'generating'.
    *   Trigger a Bolt.dev Background Job for quiz generation, passing the `quizId`.
    *   Return the new `quizId` and status 'generating'.

5.  **Quiz Generation (Bolt.dev Background Job):**
    *   Retrieve `quizId` from job payload.
    *   Retrieve the associated `videoId`.
    *   Retrieve the `transcript_chunks` for the `videoId`.
    *   Construct a prompt for the AI model to generate quiz questions. Provide the `transcript_chunks` text as context. Instruct the AI to generate multiple-choice questions, provide options, indicate the correct answer, and specify the timestamp(s) from which the question is derived.
    *   Send the prompt to the AI model.
    *   Parse the AI model's response.
    *   Create `quiz_question` records based on the parsed response, linking them to the `quizId`.
    *   Update the `Quiz` status to 'ready'.

6.  **Retrieving Data (`GET` endpoints):**
    *   All `GET` endpoints (`/videos`, `/videos/{videoId}`, `/videos/{videoId}/transcript`, `/videos/{videoId}/quizzes`, `/quizzes/{quizId}`) must authenticate the user.
    *   For requests involving a specific `videoId` or `quizId`, verify that the requested resource belongs to the authenticated user (`user_id` check).
    *   Query the database (`videos`, `transcripts`, `quiz`, `quiz_questions`) to retrieve the requested data.
    *   Format the data according to the API response payload structure and return it.

## 4. Security

Security is paramount, especially concerning user data and resource access.

*   **Authentication:** Bolt.dev's built-in authentication service will be used. This handles user registration, login (e.g., email/password, OAuth), and token management. All API endpoints listed as requiring authentication will be protected using Bolt.dev's standard authentication middleware.
*   **Authorization:**
    *   **Ownership Verification:** Every data record (`Video`, `Transcript`, `TranscriptChunk`, `Quiz`, `QuizQuestion`) is associated with a `user_id`. Before fulfilling any request for a specific resource (`GET /videos/{videoId}`, `POST /videos/{videoId}/chat`, etc.), the backend must verify that the `user_id` on the requested resource matches the `id` of the authenticated user making the request. If they don't match, return a 403 Forbidden error.
    *   **Bolt.dev Storage Access:** Ensure storage access is configured to allow writes from the ingestion job and reads *only* as needed (e.g., the job needs to read the original video). Frontend should not have direct, unauthenticated access to arbitrary video files in storage.
    *   **API Key Security:** If integrating external AI models directly (instead of through a Bolt.dev abstraction), API keys must be stored securely (e.g., in environment variables or Bolt.dev secrets management) and never exposed to the client-side.
    *   **Input Validation:** Sanitize and validate all user inputs (file names, URLs, chat messages) to prevent injection attacks or unexpected processing errors.

## 5. Performance

Optimizing performance is crucial for a responsive user experience, especially during ingestion and chat interaction.

*   **Asynchronous Ingestion:** The use of Bolt.dev Background Jobs ensures that video processing doesn't block the API request thread, allowing the frontend to remain responsive and poll for status updates.
*   **Database Indexing:** Implement appropriate database indexes, particularly on foreign keys (`user_id`, `video_id`, `transcript_id`, `quiz_id`) and fields used in filtering/ordering (`status`, `upload_date`), to speed up data retrieval.
*   **Vector Search Optimization:** Bolt.dev Vector Store is expected to be highly optimized for similarity search. Ensure chunks are appropriately sized for effective embedding and retrieval.
*   **Prompt Engineering:** Optimize AI prompts for chat and quiz generation for efficiency and accuracy. Keep context windows manageable.
*   **AI Model Choice:** Select AI models (embedding and LLM) integrated with Bolt.dev or externally that offer a good balance of performance (latency) and quality for the required tasks.
*   **Caching (Future):** While less critical initially for per-video chat, caching might be considered for frequently requested static data like quiz questions once generated.
*   **Transcript Handling:** For very long videos, consider strategies like pagination or streaming if the full transcript GET endpoint becomes a performance bottleneck (though initial implementation can likely return the full transcript).

## 6. Code Examples

Here are simplified examples using hypothetical Bolt.dev service interactions, illustrating key business logic flows.

**Example 1: Handling Video Upload and Triggering Ingestion**

```python
# Assuming a Bolt.dev serverless function or endpoint handler

from bolt import storage, db, jobs, auth # Hypothetical Bolt.dev SDK imports
from bolt.request import Request
from bolt.response import JSONResponse
import uuid

async def handle_video_upload(request: Request):
    user = await auth.get_user(request) # Authenticate user

    if not user:
        return JSONResponse({"error": "Authentication required"}, status=401)

    video_file = request.files.get('file')
    video_url = request.data.get('url') # Assuming request.data holds form/JSON data

    if not video_file and not video_url:
        return JSONResponse({"error": "No video file or URL provided"}, status=400)

    video_id = str(uuid.uuid4())
    title = request.data.get('title', f"Untitled Video {video_id[:8]}") # Get title or generate default

    try:
        if video_file:
            storage_path = f"videos/{user.id}/{video_id}/{video_file.filename}"
            # Use Bolt.dev Storage service to upload
            await storage.upload(storage_path, video_file.read())
            original_url = None # No external URL if uploaded
        elif video_url:
            storage_path = None # No internal storage path if external URL
            original_url = video_url

        # Create initial video record in Bolt.dev DB
        await db.table('videos').insert({
            "id": video_id,
            "user_id": user.id,
            "title": title,
            "original_url": original_url,
            "storage_path": storage_path,
            "status": "uploaded"
        })

        # Trigger background ingestion job
        await jobs.run("ingest-video", payload={
            "videoId": video_id,
            "userId": user.id,
            "storagePath": storage_path, # Pass path/url to job
            "videoUrl": original_url
        })

        return JSONResponse({"id": video_id, "status": "processing"}, status=202) # 202 Accepted

    except Exception as e:
        print(f"Error during video upload: {e}")
        # Update video status to failed if record was created
        if video_id:
             await db.table('videos').update(video_id, {"status": "failed", "error_message": str(e)})
        return JSONResponse({"error": "Failed to initiate video processing", "details": str(e)}, status=500)

# This would be mapped to an endpoint like POST /videos
```

**Example 2: Handling Chat Request (RAG Logic)**

```python
# Assuming a Bolt.dev serverless function or endpoint handler

from bolt import db, vector, ai, auth # Hypothetical Bolt.dev SDK imports
from bolt.request import Request
from bolt.response import JSONResponse
import os # To get AI model identifier

async def handle_chat(request: Request):
    user = await auth.get_user(request)
    if not user:
        return JSONResponse({"error": "Authentication required"}, status=401)

    video_id = request.path_params.get('videoId') # Assuming videoId is in path params
    message = request.data.get('message') # Assuming message is in request body (JSON)

    if not video_id or not message:
        return JSONResponse({"error": "Missing videoId or message"}, status=400)

    # --- Authorization Check ---
    video = await db.table('videos').get(video_id)
    if not video or video['user_id'] != user.id:
        return JSONResponse({"error": "Video not found or access denied"}, status=404)
    # --- End Authorization Check ---

    if video['status'] != 'ready':
         return JSONResponse({"error": "Video is still processing. Please wait."}, status=409)


    try:
        # 1. Query Vector Store for relevant chunks
        # Bolt.dev Vector Search API: query vector, filter, limit
        search_results = await vector.search(
            query_text=message, # Bolt.dev Vector can embed the query text automatically
            filter={"videoId": video_id}, # Ensure results are only for this video
            limit=5 # Get top 5 relevant chunks
        )

        # 2. Retrieve full chunk text and timestamps based on search results
        chunk_ids = [res['embeddingId'] for res in search_results] # Assuming vector store returns embeddingId
        # Fetch corresponding transcript_chunk records from DB
        # Assuming db.table('transcript_chunks').where_in('embedding_id', chunk_ids)
        relevant_chunks_db = await db.table('transcript_chunks').find({
             "embedding_id": {"$in": chunk_ids} # Using a hypothetical find with $in for NoSQL style
             # For SQL: WHERE embedding_id IN (...)
        })

        # Sort chunks by timestamp or original order if possible, or just use the order from DB/Vector search
        # Let's build the context string
        context_parts = []
        source_details = []
        for chunk in relevant_chunks_db:
             # Format context for the AI prompt, including timestamps
             context_parts.append(f"[{chunk['start_timestamp']}-{chunk['end_timestamp']}s] {chunk['chunk_text']}")
             source_details.append({
                 "timestamp": chunk['start_timestamp'], # Or midpoint, or both
                 "text": chunk['chunk_text'] # Include text snippet
             })

        context_string = "\n\n".join(context_parts)

        # 3. Construct prompt for AI model
        prompt = f"""Based ONLY on the following text excerpts from the video transcript, answer the user's question.
        Do not use any outside knowledge. If the information is not in the excerpts, state that you cannot answer based on the provided text.
        Include timestamps from the excerpts in your answer when referencing specific information.

        Video Excerpts:
        ---
        {context_string}
        ---

        User Question: {message}

        Answer:
        """

        # 4. Send prompt to Bolt.dev AI service (LLM)
        ai_response = await ai.chat.create(
            model=os.environ.get("LLM_MODEL_IDENTIFIER", "default-bolt-ai-model"), # Use configured model
            messages=[
                {"role": "system", "content": "You are an AI assistant that answers questions based on provided video transcripts."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500 # Limit response length
        )

        # 5. Parse AI response (simple extraction)
        # This might need more sophisticated parsing based on model output format
        answer_text = ai_response.choices[0].message.content

        # In a real implementation, you'd parse the answer_text to confirm timestamps mentioned
        # match the source_details timestamps. For this example, we'll just return the sources we used.

        return JSONResponse({
            "answer": answer_text,
            "sources": source_details # Return the sources that were provided to the AI
        })

    except Exception as e:
        print(f"Error during chat processing: {e}")
        return JSONResponse({"error": "Failed to process chat request", "details": str(e)}, status=500)

# This would be mapped to an endpoint like POST /videos/{videoId}/chat
```
```
