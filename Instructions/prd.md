```markdown
# LearnSpark - The Active Learning AI Companion Product Requirements Document

## 1. Document Header
Version: 1.0
Date: June 6, 2025

## 2. Executive Summary

LearnSpark is an AI-powered platform designed to revolutionize video-based learning. By transforming passive video consumption into an active, interactive experience, LearnSpark aims to unlock knowledge more effectively and enhance subject matter mastery.

The core functionality involves users uploading or linking video content, which LearnSpark then processes through a **Smart Ingestion Pipeline** (transcription, chunking, vector embedding). Once processed, users gain access to powerful AI interaction features via a dedicated **Dashboard**. These features include an **Interactive Chat** that answers questions *only* from the video content, citing specific timestamps as sources, and **Automated Quizzes** generated directly from the video to test understanding, also with source links.

Built upon the robust and scalable services of Bolt.dev (including storage, background jobs, Whisper transcription, vector store, database, authentication, and serverless endpoints), LearnSpark provides a solid technical foundation for rapid development and future scaling.

LearnSpark will significantly improve learning efficiency, engagement, and knowledge retention for students, professionals, researchers, and lifelong learners by allowing them to directly interrogate, explore, and test their understanding of video material in a novel and highly effective way.

## 3. Product Vision

**Purpose:** To transform the ubiquitous and often passive medium of online video into a dynamic, personalized, and highly effective active learning tool. We envision a future where anyone can engage deeply with video content, moving beyond simple viewing to true comprehension and mastery.

**Users:** Our primary users include:
*   **Students:** Seeking to understand lectures, tutorials, and educational videos more deeply and efficiently.
*   **Corporate Trainees/Employees:** Needing to quickly grasp training materials, internal presentations, or industry knowledge.
*   **Researchers/Analysts:** Requiring the ability to quickly find specific information or key arguments within lengthy video presentations or interviews.
*   **Lifelong Learners:** Exploring new subjects or skills via online video platforms and wanting a more structured way to learn and test themselves.

**Business Goals:**
*   Achieve significant user adoption and engagement within target markets.
*   Establish LearnSpark as a leader in AI-enhanced learning technologies.
*   Demonstrate the efficiency and scalability gained by leveraging the Bolt.dev platform.
*   Explore potential monetization strategies (e.g., freemium tiers, institutional licenses) in future versions based on user value demonstrated in V1.
*   Gather user feedback to inform future feature development and refine the learning experience.

## 4. User Personas

**Persona 1: Student Sarah**

*   **Role:** University Student
*   **Goals:**
    *   Efficiently study lecture videos for exams.
    *   Quickly find answers to specific questions from video content without re-watching.
    *   Test her understanding of key concepts covered in videos.
    *   Save time by focusing on the most important parts of a video.
*   **Pain Points:**
    *   Lectures are long, and finding specific information is difficult.
    *   Passive viewing doesn't guarantee understanding or retention.
    *   It's hard to know if she's truly understood a topic until the exam.
    *   Rewatching videos is time-consuming.
*   **Quote:** "I wish I could just ask my lecture videos questions and get straight to the parts I don't understand."

**Persona 2: Corporate Trainer Chris**

*   **Role:** Corporate Trainer/L&D Specialist
*   **Goals:**
    *   Make internal training videos more engaging and effective.
    *   Provide employees with tools to quickly reference policy or process videos.
    *   Assess employee understanding after watching training modules.
    *   Reduce the need for repetitive Q&A sessions after video training.
*   **Pain Points:**
    *   Employees often skim or passively watch training videos.
    *   Difficult to verify if key information has been absorbed.
    *   Answering the same questions repeatedly takes up valuable time.
    *   Creating supplementary quizzes manually is time-consuming.
*   **Quote:** "Our training videos have great info, but employees need to interact with it, not just watch it. I need a way for them to quickly find answers and check their knowledge."

**Persona 3: Lifelong Learner Lisa**

*   **Role:** Retired Professional exploring new hobbies/subjects
*   **Goals:**
    *   Understand complex concepts from online tutorial videos (e.g., coding, history, science).
    *   Deeply engage with educational content out of personal interest.
    *   Test her comprehension to ensure she's truly learning.
    *   Easily navigate back to explanations of topics she found confusing.
*   **Pain Points:**
    *   Videos can be overwhelming or move too fast.
    *   Difficult to pause and formulate questions effectively.
    *   No easy way to test retention or go back to specific tricky parts.
    *   Feels like she's just scratching the surface without active engagement.
*   **Quote:** "There are so many amazing courses and tutorials online, but I want to really *learn* from them, not just watch. I need to actively check if I'm getting it."

## 5. Feature Specifications

### 5.1. Smart Ingestion Pipeline

**Description:** The backend process responsible for taking a user-provided video (upload or link) and transforming it into structured data suitable for AI interaction. This involves downloading, transcription, chunking, and vector embedding. Leverages Bolt.dev File Storage, Background Jobs, Whisper Integration, and Vector Store.

**User Stories:**
*   As a user, I want to upload a video file (MP4, MOV) from my computer so LearnSpark can process it.
*   As a user, I want to provide a link to an online video (e.g., YouTube) so LearnSpark can process it.
*   As a user, I want to see the current processing status (e.g., "Uploading", "Transcribing", "Processing", "Ready") of my video.
*   As a user, I want to be notified when my video has finished processing and is ready for interaction.

**Acceptance Criteria:**
*   The system can accept video uploads via a web interface.
*   The system can accept public video URLs (initially support YouTube, expand later).
*   Uploaded/linked videos are stored securely using Bolt.dev File Storage.
*   A background job is triggered upon successful upload/link using Bolt.dev Background Jobs.
*   The background job performs the following steps:
    *   Downloads the video if linked externally.
    *   Extracts audio if necessary.
    *   Uses the Bolt.dev Whisper integration for high-accuracy transcription. The transcript should include timestamps for each spoken segment.
    *   Divides the transcript text into meaningful chunks (e.g., based on sentence boundaries, topic shifts, or fixed token size) suitable for retrieval augmented generation (RAG).
    *   Generates vector embeddings for each text chunk using a suitable embedding model.
    *   Stores the original transcript, chunked text, and corresponding vector embeddings in the Bolt.dev Database and Vector Store, linked to the user and the specific video ID.
    *   Updates the video's status in the database throughout the process.
*   The UI displays the current status of the video processing to the user.
*   The system handles videos up to a reasonable length for V1 (e.g., 60 minutes).

**Edge Cases:**
*   User uploads an unsupported file format.
*   User provides an invalid or private URL.
*   Transcription fails due to poor audio quality, silence, or non-speech audio.
*   Video has no discernible speech.
*   Video is excessively long, causing processing timeouts or high costs (V1 limit needed).
*   Network issues during upload or external video download.
*   Errors during transcription, chunking, or embedding stages.
*   Processing job fails and needs retries or error reporting.

### 5.2. Interactive Chat

**Description:** Allows users to ask natural language questions about the video content. The AI, powered by a Large Language Model (LLM) and Retrieval Augmented Generation (RAG) using the ingested video data (Bolt.dev Vector Store), will provide answers *derived solely from the video's text*. Crucially, each answer must include clickable source links pointing to the exact timestamp(s) in the video where the information was found. Leverages Bolt.dev Vector Store, Database, and Serverless Endpoints for the AI interaction.

**User Stories:**
*   As a user, I want to type a question about the video content into a chat interface.
*   As a user, I want the AI to provide an answer based *only* on the information present in the video transcript.
*   As a user, I want the AI's answer to include links or references to the specific timestamp(s) in the video where the answer was found.
*   As a user, I want to click on a source link to jump directly to that point in the video playback.
*   As a user, if my question cannot be answered from the video, I want the AI to inform me it doesn't have that information in the video.
*   As a user, I want the chat history for a specific video to persist within my session/account.

**Acceptance Criteria:**
*   A chat input area is available on the video dashboard.
*   Submitting a query triggers an API call to a Bolt.dev Serverless Endpoint.
*   The endpoint performs a vector similarity search against the video's embeddings (Bolt.dev Vector Store) based on the user's query.
*   Relevant text chunks from the video are retrieved.
*   These retrieved chunks, along with the user's query, are sent to an LLM (e.g., via an API integrated with Bolt.dev) with instructions to answer *only* based on the provided context.
*   The LLM's response is parsed to identify the source chunks used.
*   For each piece of information in the response derived from a source chunk, a reference/link is generated indicating the timestamp(s) associated with that chunk.
*   The AI response, including the source links, is displayed in the chat interface.
*   Clicking a source link updates the video player to seek to the specified timestamp.
*   If the vector search retrieves no relevant chunks or the LLM determines it cannot answer based on the context, a polite message is returned stating the answer isn't in the video.
*   Chat messages and responses are stored in the Bolt.dev Database linked to the user and video.

**Edge Cases:**
*   User asks a question completely unrelated to the video content.
*   User asks a question requiring external knowledge or common sense not present in the video.
*   Video content is ambiguous or contradictory, leading to a potentially unclear AI response.
*   Transcription errors lead the AI to misinterpret or hallucinate based on incorrect text.
*   The vector search or RAG process fails to find relevant information even if it exists in the video.
*   Source link timestamps are slightly off due to transcription segmentation inaccuracies.
*   User asks a follow-up question that depends heavily on the previous turn, requiring conversation history to be passed to the LLM (consider statefulness).
*   Video is very short or has minimal content, limiting the scope of answers.

### 5.3. Automated Quizzes

**Description:** Generates multiple-choice questions directly from the video content to help users test their comprehension. Similar to the chat, questions and answers are derived from the ingested text, and source links are provided to allow users to review the relevant video section. Leverages Bolt.dev Database and Serverless Endpoints.

**User Stories:**
*   As a user, I want to request a quiz based on the video I'm watching.
*   As a user, I want to answer multiple-choice questions generated from the video.
*   As a user, I want immediate feedback after answering a question (correct/incorrect).
*   As a user, if my answer is incorrect, I want to see the correct answer.
*   As a user, I want to see a link back to the video source for each question to review the topic.
*   As a user, I want to see a link back to the video source for the correct answer explanation.

**Acceptance Criteria:**
*   A button or option is available on the dashboard to "Generate Quiz".
*   Clicking "Generate Quiz" triggers an API call to a Bolt.dev Serverless Endpoint.
*   The endpoint uses the video's ingested text data (Bolt.dev Database) and an LLM to generate a set of multiple-choice questions (e.g., 5-10 questions for V1).
*   Each generated question has a clear question stem and 3-4 answer options, with only one correct answer.
*   All questions and answer options are derived *solely* from the video content.
*   For each question, the system identifies and stores the source timestamp(s) from which the question (or its answer) was derived.
*   The quiz questions are presented in the UI.
*   Users can select an answer option.
*   Upon submitting an answer, the UI immediately indicates if the answer was correct or incorrect.
*   If incorrect, the UI reveals the correct answer.
*   A clickable source link is displayed with each question, jumping the video player to the relevant timestamp when clicked.
*   Optionally, a source link is provided for the correct answer explanation.
*   Quizzes can be regenerated.

**Edge Cases:**
*   Video content is too simplistic or subjective to generate meaningful multiple-choice questions.
*   AI generates poor quality, ambiguous, or 'trick' questions.
*   Multiple answer options could technically be correct based on the video text.
*   The correct answer relies on subtle nuance that the AI or RAG missed.
*   Quiz generation fails due to insufficient content or processing errors.
*   Source links point to slightly incorrect timestamps.
*   Quiz content is repetitive if based on a video with few distinct topics.

### 5.4. Dashboard

**Description:** The central user interface where users interact with a specific processed video. It integrates the video player, a dynamic transcript view, and the AI features (Chat, Quiz). Leverages Bolt.dev Database and Serverless Endpoints for fetching transcript and interacting with AI features.

**User Stories:**
*   As a user, I want to see the video player, transcript, and AI features all on one screen.
*   As a user, I want the transcript to scroll automatically and highlight the text being spoken as the video plays.
*   As a user, I want to click on any line in the transcript to jump the video playback to that point.
*   As a user, I want to easily switch between (or view side-by-side) the Interactive Chat and Automated Quiz interfaces for the current video.
*   As a user, I want source links from the Chat or Quiz to successfully control the video player.
*   As a user, I want to view a list of all my processed videos.

**Acceptance Criteria:**
*   The UI presents a layout including a video player, a transcript panel, and an AI interaction panel.
*   The video player functions (play, pause, seek, volume control).
*   The full video transcript (retrieved from Bolt.dev Database) is displayed in the transcript panel.
*   As the video plays, the corresponding section of the transcript is highlighted (requires synchronizing video playback time with transcript timestamps).
*   The transcript panel automatically scrolls to keep the highlighted section in view.
*   Clicking on any timestamped line in the transcript seeks the video player to that timestamp.
*   The AI interaction panel has tabs or distinct areas to access the Interactive Chat and Automated Quiz features for the currently viewed video.
*   Actions from the Chat or Quiz (e.g., clicking a source link) successfully trigger video player controls (seeking).
*   A separate view/page lists all videos uploaded/linked by the authenticated user (retrieved from Bolt.dev Database), showing their status and linking to the dashboard view for each.
*   The dashboard layout is usable on standard desktop screen sizes (consider mobile responsiveness for V2).

**Edge Cases:**
*   Transcript sync drift over very long videos.
*   Video player fails to load or play specific video formats.
*   Large transcripts impacting browser performance and rendering.
*   Transcript timestamps have gaps or overlaps, causing highlighting issues.
*   UI responsiveness challenges on different screen sizes or orientations.
*   Failure to fetch transcript data from the database.
*   Interaction panel doesn't correctly link actions to the *current* video player instance.

## 6. Technical Requirements

*   **Bolt.dev Services:**
    *   **File Storage:** For storing original uploaded video files.
    *   **Background Job Queue:** For asynchronous processing of videos (transcription, embedding).
    *   **Transcription Service (Whisper Integration):** High-accuracy voice-to-text conversion with timestamps.
    *   **Vector Store:** For storing and querying vector embeddings of video text chunks.
    *   **Database (e.g., PostgreSQL):** For storing user data, video metadata, transcripts, chunked text, chat history, quiz data, and linking all components.
    *   **Authentication:** User registration, login, and session management.
    *   **Serverless Endpoints:** For handling API requests from the frontend (triggering ingestion jobs, processing chat queries, generating quizzes, etc.).

*   **API Needs (Serverless Endpoints):**
    *   `POST /api/videos/upload`: Accepts video file upload. Returns video ID and initial status.
    *   `POST /api/videos/link`: Accepts video URL. Returns video ID and initial status.
    *   `GET /api/videos/{videoId}/status`: Returns processing status of a video.
    *   `GET /api/videos`: Returns a list of user's videos with status.
    *   `GET /api/videos/{videoId}/transcript`: Returns the full timestamped transcript.
    *   `POST /api/videos/{videoId}/chat`: Accepts a chat query, processes via RAG, returns AI response with source timestamps.
    *   `POST /api/videos/{videoId}/quiz/generate`: Triggers quiz generation, returns quiz questions.
    *   `POST /api/videos/{videoId}/quiz/answer`: Accepts quiz answer, returns feedback and correct answer/source.
    *   `GET /api/auth/me`: Get authenticated user info (if needed beyond basic auth).
    *   Auth middleware required for all user-specific endpoints.

*   **Data Storage Requirements (Bolt.dev Database & Vector Store):**
    *   `users` table: Stores user authentication data (managed by Bolt.dev Auth), maybe user settings.
    *   `videos` table: Stores video metadata (title, source URL/storage path, upload date, processing status, duration, user_id).
    *   `transcripts` table: Stores raw timestamped transcript text, linked to video_id.
    *   `text_chunks` table: Stores segmented text chunks from the transcript, linked to video_id, with associated start/end timestamps from the original transcript.
    *   `embeddings`: Vector store collection storing embeddings of `text_chunks`, linked back to `text_chunks.id` and `video_id`.
    *   `chat_sessions` table: Stores chat session history (session_id, user_id, video_id, start_time).
    *   `chat_messages` table: Stores individual chat messages (session_id, sender, text, timestamp, referenced_chunk_ids).
    *   `quizzes` table: Stores generated quizzes (quiz_id, video_id, user_id, generation_time).
    *   `quiz_questions` table: Stores questions (question_id, quiz_id, text, correct_answer_index, source_chunk_id).
    *   `quiz_answers` table: Stores answer options (answer_id, question_id, text).
    *   `user_quiz_attempts`: (V2+) Tracks user's attempts, scores, and responses.

*   **External Services:**
    *   LLM Provider API (e.g., OpenAI, Anthropic, or open-source model hosted elsewhere) for chat responses and quiz generation, orchestrated via Bolt.dev Serverless Endpoints. Needs API key management.
    *   Video player library (e.g., React Player, Video.js) for the dashboard.
    *   Client-side libraries for UI, state management, API interaction.

## 7. Implementation Roadmap

This roadmap outlines a phased approach, prioritizing the core value proposition for the initial release (V1 MVP).

**Phase 1: Core LearnSpark (V1 MVP)** - Focus: Enable core active learning loop (Ingest -> Chat -> Watch). (~6-8 weeks)

*   **Foundational Setup:**
    *   Bolt.dev project setup (Auth, Database, Storage, Background Jobs, Endpoints).
    *   Basic user authentication flows (Sign up, Log in).
    *   Frontend project setup and basic routing (Dashboard, Video List).
*   **Smart Ingestion Pipeline (Core):**
    *   Implement Video Upload endpoint (`/api/videos/upload`).
    *   Implement background job trigger and status updates.
    *   Implement core ingestion job: Download (if needed), Whisper transcription (Bolt.dev integration), Basic chunking (e.g., fixed size), Embedding generation (Bolt.dev Vector Store), Data storage (DB, Vector Store).
    *   Display processing status on video list/dashboard.
*   **Dashboard (Basic):**
    *   Video list view (`/videos`).
    *   Basic video dashboard view (`/videos/{videoId}`).
    *   Video player integration.
    *   Display static transcript (fetch from DB).
*   **Interactive Chat (Core RAG):**
    *   Implement Chat endpoint (`/api/videos/{videoId}/chat`) using Bolt.dev Vector Store (search) and LLM API (RAG response).
    *   Display chat interface on the dashboard.
    *   Implement displaying AI responses with basic text source references (e.g., "[Source 1: 0:35]").
    *   Implement clicking source reference to seek video.
    *   Basic chat history persistence within the session.

**Phase 2: LearnSpark Engage** - Focus: Enhance interaction & introduce quiz feature. (~4-6 weeks)

*   **Smart Ingestion Pipeline (Enhancements):**
    *   Implement Video Link functionality (`/api/videos/link`) (starting with YouTube).
    *   Improve chunking logic (e.g., sentence boundary awareness).
    *   Implement better ingestion error handling and reporting.
*   **Dashboard (Enhancements):**
    *   Implement dynamic transcript highlighting synchronized with video playback.
    *   Implement clicking transcript lines to seek video.
    *   Refine UI layout and responsiveness for key features.
*   **Interactive Chat (Enhancements):**
    *   Refine source link presentation (e.g., inline links, clearer formatting).
    *   Implement basic conversation history context for LLM (for simple follow-ups).
*   **Automated Quizzes (Core):**
    *   Implement Quiz Generation endpoint (`/api/videos/{videoId}/quiz/generate`) using LLM and video text.
    *   Implement Quiz Answer endpoint (`/api/videos/{videoId}/quiz/answer`).
    *   Display quiz interface on the dashboard.
    *   Implement presenting MCQs, submitting answers, displaying feedback (correct/incorrect), showing correct answer.
    *   Add source links to questions and correct answers that seek the video.

**Phase 3: LearnSpark Refine & Scale** - Focus: Polish, performance, and future groundwork. (Post V1)

*   User management improvements (password reset, profile).
*   Performance optimization for large videos and transcripts.
*   Explore extracting "Key Concepts" from videos using AI.
*   Implement persistence for chat history and quiz attempts across sessions/logins.
*   Add support for more video sources/formats.
*   Implement video deletion functionality.
*   Gather user feedback and iterate on AI responses and quiz quality.
*   Investigate usage analytics (Bolt.dev monitoring) to understand feature usage.
*   Begin exploring V2 features (e.g., note-taking, flashcards, reporting, institutional features, monetization).

This roadmap provides a clear path to launching a functional and valuable V1 MVP, built upon the outlined Bolt.dev technical foundation, and lays the groundwork for future enhancements.
```
