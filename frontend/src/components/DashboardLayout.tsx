import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVideo } from '../contexts/VideoContext'
import { VideoPlayer } from './VideoPlayer'
import { TranscriptView } from './TranscriptView'
import { ChatInterface } from './ChatInterface'
import { QuizInterface } from './QuizInterface'
import { ArrowLeftIcon, ChatBubbleLeftRightIcon, AcademicCapIcon } from '@heroicons/react/24/outline'

export const DashboardLayout: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  const { loadVideo, video, isLoading, error } = useVideo()
  const [activeTab, setActiveTab] = useState<'chat' | 'quiz'>('chat')

  useEffect(() => {
    if (videoId) {
      loadVideo(videoId)
    }
  }, [videoId, loadVideo])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Video</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Videos
          </button>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Video Not Found</h2>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Videos
          </button>
        </div>
      </div>
    )
  }

  if (video.status !== 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Video Processing</h2>
          <p className="text-gray-600 mb-4">
            Your video is being processed. Status: {video.status}
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Videos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mr-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Videos
              </button>
              <h1 className="text-xl font-semibold text-gray-900">{video.title}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Video and Transcript */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <VideoPlayer />
            </div>

            {/* Transcript */}
            <div className="bg-white rounded-lg shadow-sm h-64 lg:h-80">
              <TranscriptView />
            </div>
          </div>

          {/* AI Interaction Panel */}
          <div className="bg-white rounded-lg shadow-sm flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 ${
                  activeTab === 'chat'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4 inline mr-2" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 ${
                  activeTab === 'quiz'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <AcademicCapIcon className="h-4 w-4 inline mr-2" />
                Quiz
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0">
              {activeTab === 'chat' ? <ChatInterface /> : <QuizInterface />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}