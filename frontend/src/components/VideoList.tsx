import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Database } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { PlusIcon, PlayIcon, ClockIcon } from '@heroicons/react/24/outline'

type Video = Database['public']['Tables']['videos']['Row']

export const VideoList: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { signOut } = useAuth()

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('upload_date', { ascending: false })

      if (error) throw error
      setVideos(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch videos')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800'
      case 'processing':
      case 'transcribing':
      case 'chunking':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">LearnSpark</h1>
            <p className="text-gray-600">Your AI Learning Companion</p>
          </div>
          <div className="flex space-x-4">
            <Link
              to="/upload"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Upload Video
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {videos.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <PlayIcon className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No videos</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by uploading your first video.</p>
            <div className="mt-6">
              <Link
                to="/upload"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Upload Video
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <div key={video.id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                      {video.status}
                    </span>
                    {video.duration_seconds && (
                      <div className="flex items-center text-sm text-gray-500">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatDuration(video.duration_seconds)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{video.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Uploaded {video.upload_date ? new Date(video.upload_date).toLocaleDateString() : 'Unknown'}
                  </p>
                  {video.status === 'ready' ? (
                    <Link
                      to={`/dashboard/${video.id}`}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    >
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Open Dashboard
                    </Link>
                  ) : video.status === 'failed' ? (
                    <div className="text-red-600 text-sm">
                      {video.error_message || 'Processing failed'}
                    </div>
                  ) : (
                    <div className="text-yellow-600 text-sm">Processing...</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}