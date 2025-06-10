import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeftIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'

export const UploadForm: React.FC = () => {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (uploadType === 'file' && file) {
        // Upload file to Supabase storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `videos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // Create video record
        const { data, error: insertError } = await supabase
          .from('videos')
          .insert({
            title: title || file.name,
            storage_path: filePath,
            status: 'uploaded'
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Trigger transcription function
        const { error: functionError } = await supabase.functions.invoke('transcribe-video', {
          body: { videoId: data.id, storagePath: filePath }
        })

        if (functionError) {
          console.warn('Failed to trigger transcription:', functionError)
        }

      } else if (uploadType === 'url' && url) {
        // Create video record with URL
        const { data, error: insertError } = await supabase
          .from('videos')
          .insert({
            title: title || 'Video from URL',
            original_url: url,
            status: 'uploaded'
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Trigger transcription function
        const { error: functionError } = await supabase.functions.invoke('transcribe-video', {
          body: { videoId: data.id, videoUrl: url }
        })

        if (functionError) {
          console.warn('Failed to trigger transcription:', functionError)
        }
      }

      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Videos
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Video</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Enter video title (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Upload Method
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="file"
                    checked={uploadType === 'file'}
                    onChange={(e) => setUploadType(e.target.value as 'file')}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Upload File</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="url"
                    checked={uploadType === 'url'}
                    onChange={(e) => setUploadType(e.target.value as 'url')}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Video URL</span>
                </label>
              </div>
            </div>

            {uploadType === 'file' ? (
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                  Video File
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept="video/*"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">MP4, MOV, AVI up to 500MB</p>
                    {file && (
                      <p className="text-sm text-gray-900">Selected: {file.name}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                  Video URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (uploadType === 'file' && !file) || (uploadType === 'url' && !url)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}