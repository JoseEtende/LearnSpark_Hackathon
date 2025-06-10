import React, { useState, useEffect } from 'react'
import { useVideo } from '../contexts/VideoContext'
import { supabase, Database } from '../lib/supabase'
import { CheckCircleIcon, XCircleIcon, PlayIcon } from '@heroicons/react/24/outline'

type QuizQuestion = Database['public']['Tables']['quiz_questions']['Row']

interface Quiz {
  id: string
  questions: QuizQuestion[]
}

interface QuizAnswer {
  questionId: string
  selectedIndex: number
}

export const QuizInterface: React.FC = () => {
  const { videoId, seekVideo } = useVideo()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (videoId) {
      fetchExistingQuiz()
    }
  }, [videoId])

  const fetchExistingQuiz = async () => {
    if (!videoId) return

    try {
      const { data: quizzes, error: quizError } = await supabase
        .from('quizzes')
        .select('id, status')
        .eq('video_id', videoId)
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(1)

      if (quizError) throw quizError

      if (quizzes && quizzes.length > 0) {
        const { data: questions, error: questionsError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizzes[0].id)

        if (questionsError) throw questionsError

        setQuiz({
          id: quizzes[0].id,
          questions: questions || []
        })
      }
    } catch (err) {
      console.error('Error fetching quiz:', err)
    }
  }

  const generateQuiz = async () => {
    if (!videoId) return

    setGenerating(true)
    setError(null)

    try {
      const { data, error: generateError } = await supabase.functions.invoke('generate-quiz', {
        body: { videoId }
      })

      if (generateError) throw generateError

      setQuiz({
        id: data.quizId,
        questions: data.questions.map((q: any, index: number) => ({
          id: `${data.quizId}-${index}`,
          quiz_id: data.quizId,
          question_text: q.question_text,
          options: q.options,
          correct_answer_index: q.correct_answer_index,
          source_timestamp_seconds: q.source_timestamp_seconds
        }))
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz')
    } finally {
      setGenerating(false)
    }
  }

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }))
  }

  const handleSubmit = () => {
    setSubmitted(true)
  }

  const handleReset = () => {
    setAnswers({})
    setSubmitted(false)
  }

  const handleSourceClick = (timestamp: number | null) => {
    if (timestamp !== null) {
      seekVideo(timestamp)
    }
  }

  const getScore = () => {
    if (!quiz) return 0
    let correct = 0
    quiz.questions.forEach(question => {
      if (answers[question.id] === question.correct_answer_index) {
        correct++
      }
    })
    return Math.round((correct / quiz.questions.length) * 100)
  }

  if (!quiz) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Your Knowledge</h3>
          <p className="text-gray-600 mb-6">Generate a quiz based on this video content to test your understanding.</p>
          <button
            onClick={generateQuiz}
            disabled={generating || !videoId}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Quiz...
              </>
            ) : (
              'Generate Quiz'
            )}
          </button>
          {error && (
            <p className="mt-4 text-red-600 text-sm">{error}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Quiz</h3>
          {submitted && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-600">{getScore()}%</div>
              <div className="text-sm text-gray-600">
                {quiz.questions.filter(q => answers[q.id] === q.correct_answer_index).length} / {quiz.questions.length} correct
              </div>
            </div>
          )}
        </div>
        {!submitted && (
          <p className="text-gray-600 text-sm mt-1">Answer all questions and submit to see your results.</p>
        )}
      </div>

      <div className="space-y-6">
        {quiz.questions.map((question, questionIndex) => (
          <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">
                {questionIndex + 1}. {question.question_text}
              </h4>
              {question.source_timestamp_seconds !== null && (
                <button
                  onClick={() => handleSourceClick(question.source_timestamp_seconds)}
                  className="ml-2 inline-flex items-center text-xs text-primary-600 hover:text-primary-700"
                >
                  <PlayIcon className="h-3 w-3 mr-1" />
                  {Math.floor((question.source_timestamp_seconds || 0) / 60)}:
                  {((question.source_timestamp_seconds || 0) % 60).toFixed(0).padStart(2, '0')}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {(question.options as string[]).map((option, optionIndex) => {
                const isSelected = answers[question.id] === optionIndex
                const isCorrect = optionIndex === question.correct_answer_index
                const showResult = submitted

                return (
                  <button
                    key={optionIndex}
                    onClick={() => handleAnswerSelect(question.id, optionIndex)}
                    disabled={submitted}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      showResult
                        ? isCorrect
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : isSelected
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-gray-50 border-gray-200 text-gray-600'
                        : isSelected
                        ? 'bg-primary-50 border-primary-200 text-primary-800'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{option}</span>
                      {showResult && (
                        <div className="ml-2">
                          {isCorrect && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
                          {!isCorrect && isSelected && <XCircleIcon className="h-4 w-4 text-red-600" />}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center space-x-4">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length !== quiz.questions.length}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Quiz
          </button>
        ) : (
          <div className="space-x-4">
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Retake Quiz
            </button>
            <button
              onClick={generateQuiz}
              disabled={generating}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              Generate New Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  )
}