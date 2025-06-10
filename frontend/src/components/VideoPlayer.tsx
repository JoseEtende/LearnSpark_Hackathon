import React, { useRef, useEffect } from 'react'
import ReactPlayer from 'react-player'
import { useVideo } from '../contexts/VideoContext'
import { supabase } from '../lib/supabase'

export const VideoPlayer: React.FC = () => {
  const { video, currentTime, isPlaying, setCurrentTime, setIsPlaying } = useVideo()
  const playerRef = useRef<ReactPlayer>(null)

  useEffect(() => {
    // Register seek callback with video context
    const seekCallback = (time: number) => {
      if (playerRef.current) {
        playerRef.current.seekTo(time, 'seconds')
      }
    }
    
    // This would need to be implemented in VideoContext
    // registerSeekCallback(seekCallback)
  }, [])

  const handleProgress = (state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds)
  }

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const getVideoUrl = () => {
    if (!video) return ''
    
    if (video.original_url) {
      return video.original_url
    }
    
    if (video.storage_path) {
      const { data } = supabase.storage
        .from('videos')
        .getPublicUrl(video.storage_path)
      return data.publicUrl
    }
    
    return ''
  }

  if (!video) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-white">No video loaded</div>
      </div>
    )
  }

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
      <ReactPlayer
        ref={playerRef}
        url={getVideoUrl()}
        width="100%"
        height="100%"
        playing={isPlaying}
        onProgress={handleProgress}
        onPlay={handlePlay}
        onPause={handlePause}
        controls
        progressInterval={100}
      />
    </div>
  )
}