Okay, here is a frontend implementation guide for the LearnSpark project, structured as requested.

```markdown
# LearnSpark - Frontend Implementation Guide

**Project:** LearnSpark - The Active Learning AI Companion
**Goal:** Transform passive video consumption into an active, interactive learning environment.
**Version:** 1.0
**Date:** June 6, 2025

---

## 1. Document Header

*(This section is included above)*

---

## 2. Component Architecture

The LearnSpark frontend architecture centers around a main `DashboardLayout` component which serves as the container for the core learning experience. Other components handle pre-dashboard flows like video ingestion and post-dashboard elements like user video lists.

**Core Components:**

*   **`App`**: The root component. Handles routing (e.g., `/`, `/dashboard/:videoId`, `/upload`). Manages high-level state like authentication status.
*   **`AuthGate`**: A higher-order component or route wrapper that protects authenticated routes, ensuring the user is logged in via Bolt.dev Auth before rendering child components.
*   **`VideoList`**: Displays a list of videos uploaded/linked by the user. Allows selecting a video to navigate to the Dashboard. Fetches video metadata from the backend.
*   **`UploadForm`**: Handles the video upload or linking process. Interacts with Bolt.dev storage services and triggers the Smart Ingestion Pipeline via a backend endpoint. Displays ingestion status feedback.
*   **`DashboardLayout`**: The main workspace. Orchestrates the interaction between the video player, transcript, and AI features. Typically a multi-panel layout.
*   **`VideoPlayer`**: Embeds or renders the video. Communicates playback state (current time, playing/paused) up to the `DashboardLayout` or state management. Receives commands (like `seek`) from other components.
*   **`TranscriptView`**: Displays the video transcript, segmented into chunks. Highlights the current segment based on video playback time. Allows clicking a segment to seek the video. Fetches transcript data.
*   **`AIInteractionArea`**: A container component within `DashboardLayout` that likely uses tabs or conditional rendering to switch between `ChatInterface` and `QuizInterface`.
*   **`ChatInterface`**: Displays the chat history. Allows user input for questions. Sends questions to the backend AI endpoint and displays responses, including source links. Handles loading states.
*   **`QuizInterface`**: Fetches quiz questions for the current video. Displays questions and multiple-choice options. Handles user selections and submission. Displays results and potentially links correct answers back to video timestamps.
*   **`SourceLink`**: A small presentational component used within chat responses or quiz results. Displays a link (e.g., `[0:35]`) that, when clicked, triggers a video seek event.

**Component Relationships:**

```
App
├── AuthGate
│   ├── VideoList (Select video -> navigate to Dashboard)
│   └── UploadForm (Submit video -> trigger ingestion, potentially navigate to VideoList/Dashboard)
└── DashboardLayout (Route: /dashboard/:videoId)
    ├── VideoPlayer
    ├── TranscriptView (Click segment -> command VideoPlayer to seek)
    └── AIInteractionArea (Tabs/conditional rendering)
        ├── ChatInterface (Submit question -> API, SourceLink click -> command VideoPlayer to seek)
        └── QuizInterface (Submit answers -> API, SourceLink click -> command VideoPlayer to seek)
```

---

## 3. State Management

Effective state management is crucial given the interconnected nature of the video player, transcript, and AI features.

**Key State Areas:**

*   **Authentication:** User login status, user ID, auth token (managed by Bolt.dev Auth and potentially stored in context/global state).
*   **Video Data:** List of user videos, metadata for the currently active video, ingestion status.
*   **Playback State:** Current video time, playing/paused status, duration.
*   **Transcript Data:** Loaded transcript text, segment timestamps.
*   **Chat State:** Array of chat messages (user queries, AI responses), loading state for new responses.
*   **Quiz State:** Current quiz questions, user's selected answers, quiz results, loading state for quiz generation/submission.
*   **UI State:** Active panel in `AIInteractionArea` (Chat/Quiz), loading indicators for various operations (API calls, video loading).

**Recommended Approach:**

*   **Framework-Specific Context/Provide:** For medium-to-large applications, using React's Context API or Vue's Provide/Inject is a good starting point for sharing global or near-global state (like auth status, currently active video ID).
*   **Component-Level State (`useState`/`useReducer`):** Manage state specific to a single component (e.g., input field value in `ChatInterface`, local loading state for a button). Use `useReducer` for more complex state transitions within a component or small component subtree.
*   **Centralized Data Fetching/Mutation Logic:** Abstract API calls and data manipulation into dedicated service modules or custom hooks (e.g., `useVideoData`, `useChat`). These hooks/services interact with the API and update relevant state.
*   **Synchronizing State:** The `DashboardLayout` (or a parent context/hook) needs to synchronize state between components. For example:
    *   `VideoPlayer` updates playback time -> `DashboardLayout` updates playback state -> `TranscriptView` highlights segment.
    *   `TranscriptView` or `SourceLink` triggers `seek` event -> `DashboardLayout` commands `VideoPlayer` to seek.
    *   `ChatInterface` submits question -> `Chat` service calls API -> `ChatInterface` state is updated with new messages.

**Example (React with Context/Hooks):**

A `VideoContext` could hold the current video ID, metadata, playback state, and methods to control playback (`seek`, `play`, `pause`).

```jsx
// VideoContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getVideoDetails, getTranscript } from './api'; // Your API service

const VideoContext = createContext(null);

export const VideoProvider = ({ videoId, children }) => {
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [metadata, transcriptData] = await Promise.all([
          getVideoDetails(videoId),
          getTranscript(videoId)
        ]);
        setVideoMetadata(metadata);
        setTranscript(transcriptData);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (videoId) {
      fetchData();
    } else {
      // Handle case where videoId is not set
      setIsLoading(false);
      setVideoMetadata(null);
      setTranscript(null);
    }

  }, [videoId]); // Refetch if videoId changes

  const seekVideo = (timeInSeconds) => {
    // Logic to command the actual VideoPlayer component to seek
    // This would typically involve a ref or callback passed down
    console.log(`Seeking video to ${timeInSeconds}s`);
    setCurrentTime(timeInSeconds); // Optimistic update, actual player update happens elsewhere
  };

  const value = {
    videoId,
    videoMetadata,
    transcript,
    currentTime,
    isPlaying,
    isLoading,
    error,
    setCurrentTime,
    setIsPlaying,
    seekVideo,
  };

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
};

export const useVideo = () => useContext(VideoContext);

// Usage in a component:
// function TranscriptView() {
//   const { transcript, currentTime, seekVideo } = useVideo();
//   // Render transcript, highlight based on currentTime, call seekVideo on click
// }
```

---

## 4. UI Design

The Dashboard is the primary UI focus. A multi-panel layout is recommended for simultaneous visibility of video, transcript, and AI interaction.

**Layout Considerations:**

*   **Dashboard:**
    *   **Primary Layout:** A common pattern is a main video area (left or top) with sidebars or panels for the transcript and AI interaction.
    *   **Split Panels:** Use resizable split panels or CSS Grid/Flexbox for flexible layout.
    *   **Responsiveness:** Design should adapt to smaller screens (e.g., stacking panels vertically, providing toggles to show/hide transcript/AI).
    *   **Video Player:** Prominent placement. Standard controls (play/pause, seek bar, volume, fullscreen).
    *   **Transcript:** Scrollable area. Each segment should be clearly delineated. Current segment should be visually highlighted. Clickable segments for seeking.
    *   **AI Interaction:** Tabbed interface (Chat/Quiz). Input area for chat, display area for messages/questions. Clear calls to action (Send, Submit).
*   **Video List/Upload:**
    *   Simple list view for videos, showing title, status (Processing, Ready), and potentially duration.
    *   Upload form should clearly indicate accepted file types/linking options and show upload progress and ingestion status.

**Key User Interactions:**

*   **Video Control:** Standard play/pause/seek.
*   **Transcript Interaction:** Clicking a transcript segment scrolls the transcript *and* seeks the video to that segment's start time.
*   **AI Source Linking:** Clicking a timestamp link within an AI response seeks the video to that exact time and optionally highlights the corresponding transcript segment.
*   **Chat:** Typing a question, submitting, receiving and displaying the AI response. Handling multi-turn conversation context (though the AI backend handles the LLM part, the frontend manages the message history display).
*   **Quiz:** Viewing questions, selecting answers, submitting, viewing results. Potentially clicking links in results for review.
*   **Navigation:** Switching between video list, upload, and individual video dashboards.

**Visual Cues:**

*   Loading spinners/skeletons for data fetching and AI processing.
*   Highlighting the active transcript segment.
*   Indicating ingestion progress/status.
*   Visual feedback on quiz answer selection and correctness.

---

## 5. API Integration

The frontend will communicate extensively with backend serverless endpoints hosted on Bolt.dev. These endpoints will, in turn, interact with other Bolt.dev services (Database, Vector Store, Background Jobs, etc.).

**API Endpoints (Conceptual):**

*   `POST /api/videos/ingest`: Trigger the ingestion pipeline. Accepts video source (upload or URL). Returns an ID and initial status.
*   `GET /api/videos`: Get a list of user's videos. Returns ID, title, status, etc.
*   `GET /api/videos/:videoId`: Get details for a specific video. Returns metadata, status, link to transcript data, etc.
*   `GET /api/videos/:videoId/transcript`: Get the structured transcript data.
*   `POST /api/videos/:videoId/chat`: Send a user query about the video. Accepts query text and potentially chat history context. Returns AI response with source timestamps.
*   `GET /api/videos/:videoId/quiz`: Request generation/retrieval of a multiple-choice quiz. Returns array of questions and options.
*   `POST /api/videos/:videoId/quiz/submit`: Submit user's quiz answers. Returns results, potentially with explanations or source links.

**Integration Strategy:**

1.  **Authentication:** Ensure every API request (except perhaps initial auth) includes the user's authentication token, typically in the `Authorization` header (`Bearer your_token`). Bolt.dev Auth handles token issuance.
2.  **HTTP Client:** Use `fetch` or a library like `axios` to make requests.
3.  **API Service Layer:** Create dedicated modules (e.g., `apiService.js`, `videoApi.js`, `chatApi.js`) to abstract API calls. This keeps components clean and centralizes API logic, error handling, and token management.
4.  **Asynchronous Handling:** Use `async/await` for all API calls. Manage pending, success, and error states in the component or state management layer that initiated the call.
5.  **Error Handling:** Implement robust error handling. Display user-friendly messages for API errors (e.g., video not found, processing failed, network error).
6.  **Loading States:** Show loading indicators while waiting for API responses (e.g., sending chat message, fetching quiz, loading video data).
7.  **Polling (for Ingestion Status):** The ingestion process is asynchronous. The frontend will need to poll a status endpoint (`GET /api/videos/:videoId/status`) periodically until the video status is 'Ready'. Use techniques like `setInterval` with appropriate backoff logic.

**Example (using `fetch`):**

```javascript
// apiService.js
const API_BASE_URL = '/api'; // Or your Bolt.dev endpoint base URL

async function request(endpoint, { method = 'GET', data, token } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  const config = {
    method,
    headers,
    ...(data && { body: JSON.stringify(data) }),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json(); // Assuming API returns JSON errors
    throw new Error(error.message || `API error: ${response.statusText}`);
  }

  // Handle potential empty responses (e.g., POST requests returning 204)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// videoApi.js
import { request } from './apiService';

export const getVideos = (token) => {
  return request('/videos', { token });
};

export const getVideoDetails = (videoId, token) => {
  return request(`/videos/${videoId}`, { token });
};

export const getTranscript = (videoId, token) => {
  return request(`/videos/${videoId}/transcript`, { token });
};

export const ingestVideo = (videoSource, token) => {
  return request('/videos/ingest', { method: 'POST', data: videoSource, token });
};

// chatApi.js
import { request } from './apiService';

export const sendChatMessage = (videoId, message, history = [], token) => {
  return request(`/videos/${videoId}/chat`, {
    method: 'POST',
    data: { message, history }, // Include history for context if needed
    token
  });
};

// quizApi.js
// ... similarly implement getQuiz, submitQuiz using the request helper
```

---

## 6. Testing Approach

A layered testing approach is recommended to ensure reliability and prevent regressions.

*   **Unit Tests:**
    *   **Focus:** Individual functions, utility helpers, small pure components. Test component rendering with different props, basic event handling (mocking functions).
    *   **What to Test:** API service functions (mocking the `fetch`/`axios` call), state management logic (reducers, context providers without rendering), helper functions (e.g., time formatting, transcript parsing), presentational components.
    *   **Tools:** Jest or Vitest combined with testing libraries like `@testing-library/react` or `@vue/test-utils`.

*   **Integration Tests:**
    *   **Focus:** How multiple components interact, or how a component interacts with a service layer (mocking the *API calls*, not the service logic itself). Test user flows within a limited scope.
    *   **What to Test:** A parent component orchestrating children (e.g., `DashboardLayout` connecting `VideoPlayer` and `TranscriptView`). Components interacting with mocked API services. Testing custom hooks that fetch data.
    *   **Tools:** `@testing-library/react` (rendering component trees), Jest/Vitest. Mock service workers (MSW) can be useful for mocking API layers realistically during integration tests.

*   **End-to-End (E2E) Tests:**
    *   **Focus:** Simulate real user journeys through the entire application, interacting with the deployed frontend and a test backend environment. Ensures all pieces work together, including routing, API integration, and UI interactions.
    *   **What to Test:** User signup/login -> Upload/link video -> Wait for ingestion -> Navigate to dashboard -> Ask a question -> Click source link -> Take a quiz -> View results.
    *   **Tools:** Cypress, Playwright, Selenium.

**Strategy Implementation:**

1.  **Start with Unit Tests:** Cover critical logic and components first. They are fast and isolate failures effectively.
2.  **Add Integration Tests:** Build confidence in the interaction between key parts of the Dashboard (Video, Transcript, AI).
3.  **Implement E2E Tests for Core Flows:** Ensure the most critical user paths (ingestion to interactive learning) are working end-to-end. These are slower but provide the highest confidence in the overall system.
4.  **Mock Dependencies:** Heavily use mocking (for API calls, browser APIs like video player methods) in Unit and Integration tests to isolate the code under test.
5.  **Test Accessibility and Responsiveness:** While not purely functional tests, consider using tools and manual checks during the testing phase.

---

## 7. Code Examples

These examples use React with functional components and hooks, assuming a structure as described in the architecture and state management sections.

**Example 1: Simple Transcript Segment Component & Interaction**

```jsx
// components/TranscriptSegment.jsx
import React from 'react';

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const paddedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds;
  return `${minutes}:${paddedSeconds}`;
}

function TranscriptSegment({ segment, isHighlighted, onSegmentClick }) {
  const handleClick = () => {
    // Trigger the seek action in the parent or context
    onSegmentClick(segment.startTime);
  };

  return (
    <p
      className={`transcript-segment ${isHighlighted ? 'highlight' : ''}`}
      onClick={handleClick}
      style={{ cursor: 'pointer', backgroundColor: isHighlighted ? '#ffffcc' : 'transparent' }} // Simple inline style for demo
    >
      <span className="timestamp">{formatTime(segment.startTime)}</span>{' '}
      {segment.text}
    </p>
  );
}

export default TranscriptSegment;
```

**Example 2: Integrating Transcript Segments with Video Playback (within `TranscriptView` using `useVideo` context)**

```jsx
// components/TranscriptView.jsx
import React, { useEffect, useRef } from 'react';
import TranscriptSegment from './TranscriptSegment';
import { useVideo } from '../context/VideoContext'; // Assuming VideoContext from State Management example

function TranscriptView() {
  const { transcript, currentTime, seekVideo, isLoading, error } = useVideo();
  const segmentRefs = useRef([]); // To scroll the highlighted segment into view

  useEffect(() => {
    // Find the segment that should be highlighted based on currentTime
    if (transcript && transcript.segments && currentTime !== undefined) {
      const activeSegmentIndex = transcript.segments.findIndex(
        (segment, index) => {
          const nextSegment = transcript.segments[index + 1];
          // Check if current time is within the segment's start and end times
          // or if it's the last segment and time is after its start
          return (
            currentTime >= segment.startTime &&
            (!nextSegment || currentTime < nextSegment.startTime)
          );
        }
      );

      // Scroll the highlighted segment into view if found
      if (activeSegmentIndex !== -1 && segmentRefs.current[activeSegmentIndex]) {
        segmentRefs.current[activeSegmentIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentTime, transcript]); // Re-run when video time or transcript changes

  if (isLoading) return <p>Loading transcript...</p>;
  if (error) return <p>Error loading transcript: {error.message}</p>;
  if (!transcript || !transcript.segments || transcript.segments.length === 0) return <p>No transcript available.</p>;

  return (
    <div className="transcript-container" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
      <h3>Transcript</h3>
      {transcript.segments.map((segment, index) => (
        <div ref={el => segmentRefs.current[index] = el} key={segment.id || index}> {/* Assign ref to the wrapper or segment */}
          <TranscriptSegment
            segment={segment}
            isHighlighted={
              currentTime >= segment.startTime &&
              (!transcript.segments[index + 1] || currentTime < transcript.segments[index + 1].startTime)
            }
            onSegmentClick={seekVideo} // Pass the seek function from context
          />
        </div>
      ))}
    </div>
  );
}

export default TranscriptView;
```

**Example 3: Basic Chat Interface Snippet**

```jsx
// components/ChatInterface.jsx
import React, { useState } from 'react';
import { useVideo } from '../context/VideoContext'; // Assuming VideoContext
import { sendChatMessage } from '../api/chatApi'; // Your chat API service

function ChatInterface() {
  const { videoId, isLoading: isVideoLoading } = useVideo();
  const [messages, setMessages] = useState([]); // [{ type: 'user' | 'ai', text: '...', sourceLinks: [...] }]
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending || isVideoLoading || !videoId) return;

    const userMessage = { type: 'user', text: inputMessage };
    setMessages([...messages, userMessage]);
    setInputMessage('');
    setIsSending(true);
    setError(null);

    try {
      // Prepare history for context (simple text history here)
      const history = messages.map(msg => `${msg.type}: ${msg.text}`);
      const aiResponse = await sendChatMessage(videoId, inputMessage, history);

      // Assuming aiResponse has { text: '...', sourceLinks: [{ text: '[time]', time: N }] }
      setMessages(prevMessages => [...prevMessages, { type: 'ai', text: aiResponse.text, sourceLinks: aiResponse.sourceLinks }]);

    } catch (err) {
      console.error("Error sending chat message:", err);
      setError("Failed to get response. Please try again.");
      setMessages(prevMessages => [...prevMessages, { type: 'ai', text: 'Error: Could not fetch response.' }]); // Add error message to chat history
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="messages-list" style={{ flexGrow: 1, overflowY: 'auto', padding: '10px', borderBottom: '1px solid #ccc' }}>
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.type}`}>
            <p><strong>{msg.type === 'user' ? 'You:' : 'AI:'}</strong> {msg.text}</p>
            {msg.type === 'ai' && msg.sourceLinks && msg.sourceLinks.length > 0 && (
              <div className="source-links">
                Sources:
                {msg.sourceLinks.map((link, linkIndex) => (
                  <SourceLink key={linkIndex} time={link.time} text={link.text} /> // SourceLink component needed
                ))}
              </div>
            )}
          </div>
        ))}
        {isSending && <p>AI is typing...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
      <form onSubmit={handleSendMessage} style={{ padding: '10px', display: 'flex' }}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask a question about the video..."
          disabled={isSending || isVideoLoading || !videoId}
          style={{ flexGrow: 1, marginRight: '10px' }}
        />
        <button type="submit" disabled={isSending || isVideoLoading || !videoId}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatInterface;

// Example SourceLink component (needs to trigger video seek using useVideo context)
// components/SourceLink.jsx
import React from 'react';
import { useVideo } from '../context/VideoContext';

function SourceLink({ time, text }) {
    const { seekVideo } = useVideo();
    const handleClick = () => {
        seekVideo(time);
        // Optional: Add logic to briefly highlight transcript segment
    };
    return (
        <button onClick={handleClick} style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer', marginRight: '5px' }}>
            {text}
        </button>
    );
}
// Note: This is a simplified button, proper link styling is needed.
```

These examples illustrate how components can interact via a shared context (`useVideo`) to synchronize actions (seeking video) and data (current time, transcript). The API integration is handled in separate service files, keeping components focused on UI and user interaction.

```
```
