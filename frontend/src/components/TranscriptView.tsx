import React, { useEffect, useRef } from 'react'
import { useVideo } from '../contexts/VideoContext'

export const TranscriptView: React.FC = () => {
  const { transcript, currentTime, seekVideo, isLoading, error } = useVideo()
  const containerRef = useRef<HTMLDivElement>(null)
  const segmentRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  useEffect(() => {
    if (!transcript || !containerRef.current) return

    // Find the active segment based on current time
    const activeSegmentIndex = transcript.findIndex((chunk, index) => {
      const nextChunk = transcript[index + 1]
      return (
        currentTime >= chunk.start_time_seconds &&
        (!nextChunk || currentTime < nextChunk.start_time_seconds)
      )
    })

    // Scroll active segment into view
    if (activeSegmentIndex !== -1 && segmentRefs.current[activeSegmentIndex]) {
      segmentRefs.current[activeSegmentIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentTime, transcript])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleSegmentClick = (startTime: number) => {
    seekVideo(startTime)
  }

  const isActiveSegment = (chunk: any, index: number) => {
    if (!transcript) return false
    const nextChunk = transcript[index + 1]
    return (
      currentTime >= chunk.start_time_seconds &&
      (!nextChunk || currentTime < nextChunk.start_time_seconds)
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-600">
        Error loading transcript: {error}
      </div>
    )
  }

  if (!transcript || transcript.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        No transcript available
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto p-4 space-y-2">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Transcript</h3>
      {transcript.map((chunk, index) => (
        <div
          key={chunk.id}
          ref={(el) => (segmentRefs.current[index] = el)}
          className={`p-3 rounded-lg cursor-pointer transition-colors ${
            isActiveSegment(chunk, index)
              ? 'bg-primary-100 border-l-4 border-primary-500'
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => handleSegmentClick(chunk.start_time_seconds)}
        >
          <div className="flex items-start space-x-3">
            <span className="text-sm font-medium text-primary-600 min-w-0">
              {formatTime(chunk.start_time_seconds)}
            </span>
            <p className="text-sm text-gray-900 flex-1">{chunk.chunk_text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}