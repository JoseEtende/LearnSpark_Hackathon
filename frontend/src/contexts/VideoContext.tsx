import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase, Database } from '../lib/supabase'

type Video = Database['public']['Tables']['videos']['Row']
type TranscriptChunk = Database['public']['Tables']['transcript_chunks']['Row']

interface VideoContextType {
  videoId: string | null
  video: Video | null
  transcript: TranscriptChunk[] | null
  currentTime: number
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  seekVideo: (time: number) => void
  loadVideo: (videoId: string) => Promise<void>
}

const VideoContext = createContext<VideoContextType | undefined>(undefined)

export const useVideo = () => {
  const context = useContext(VideoContext)
  if (context === undefined) {
    throw new Error('useVideo must be used within a VideoProvider')
  }
  return context
}

export const VideoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [videoId, setVideoId] = useState<string | null>(null)
  const [video, setVideo] = useState<Video | null>(null)
  const [transcript, setTranscript] = useState<TranscriptChunk[] | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seekCallbackRef = useRef<((time: number) => void) | null>(null)

  const loadVideo = async (newVideoId: string) => {
    setIsLoading(true)
    setError(null)
    setVideoId(newVideoId)

    try {
      // Fetch video details
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', newVideoId)
        .single()

      if (videoError) throw videoError

      setVideo(videoData)

      // Fetch transcript chunks
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcript_chunks')
        .select('*')
        .eq('video_id', newVideoId)
        .order('chunk_index')

      if (transcriptError) throw transcriptError

      setTranscript(transcriptData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video')
    } finally {
      setIsLoading(false)
    }
  }

  const seekVideo = (time: number) => {
    setCurrentTime(time)
    if (seekCallbackRef.current) {
      seekCallbackRef.current(time)
    }
  }

  // Register seek callback from video player
  const registerSeekCallback = (callback: (time: number) => void) => {
    seekCallbackRef.current = callback
  }

  const value = {
    videoId,
    video,
    transcript,
    currentTime,
    isPlaying,
    isLoading,
    error,
    setCurrentTime,
    setIsPlaying,
    seekVideo,
    loadVideo,
    registerSeekCallback,
  }

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
}