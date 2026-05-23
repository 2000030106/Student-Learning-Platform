import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const login = async (username, password) => {
  const response = await api.post(
    '/auth/token',
    new URLSearchParams({ username, password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  )
  return response.data
}

export const register = async (mode, payload) => {
  const url = mode === 'trainer' ? '/auth/register/trainer' : '/auth/register/student'
  const response = await api.post(url, payload)
  return response.data
}

export const fetchCourses = async () => {
  const response = await api.get('/courses/')
  return response.data
}

export const fetchCourse = async (slug) => {
  const response = await api.get(`/courses/${slug}`)
  return response.data
}

export const createCourse = async (payload, token) => {
  const response = await api.post('/courses/', payload, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const updateCourse = async (slug, payload, token) => {
  const response = await api.put(`/courses/${slug}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const deleteCourse = async (slug, token) => {
  const response = await api.delete(`/courses/${slug}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const requestAccess = async (slug, token) => {
  const response = await api.post(`/courses/${slug}/request`, null, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const requestToTeachCourse = async (slug, token) => {
  const response = await api.post(`/courses/${slug}/trainer-request`, null, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const fetchCourseAccess = async (slug, token) => {
  const response = await api.get(`/courses/${slug}/access`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const fetchCourseLearning = async (slug, token) => {
  const response = await api.get(`/courses/${slug}/learning`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const createLearningItem = async (slug, payload, token) => {
  const response = await api.post(`/courses/${slug}/learning-items`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const updateLearningItem = async (slug, itemId, payload, token) => {
  const response = await api.put(`/courses/${slug}/learning-items/${itemId}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const deleteLearningItem = async (slug, itemId, token) => {
  const response = await api.delete(`/courses/${slug}/learning-items/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const fetchQuizzes = async (slug, token) => {
  const response = await api.get(`/courses/${slug}/quizzes`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const createQuiz = async (slug, payload, token) => {
  const response = await api.post(`/courses/${slug}/quizzes`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const fetchQuiz = async (slug, quizId, token) => {
  const response = await api.get(`/courses/${slug}/quizzes/${quizId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const submitQuizAttempt = async (slug, quizId, answers, token) => {
  const response = await api.post(
    `/courses/${slug}/quizzes/${quizId}/attempt`,
    { answers },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return response.data
}

export const fetchQuizReview = async (slug, quizId, token) => {
  const response = await api.get(`/courses/${slug}/quizzes/${quizId}/review`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const fetchQuizAnalytics = async (slug, quizId, token) => {
  const response = await api.get(`/courses/${slug}/quizzes/${quizId}/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const fetchPendingRequests = async (token) => {
  const response = await api.get('/courses/requests/pending', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const fetchAllRequests = async (token) => {
  const response = await api.get('/courses/requests/all', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const fetchAdminUsers = async (token) => {
  const response = await api.get('/courses/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const approveRequest = async (requestId, approve, token) => {
  const response = await api.post(
    '/courses/requests/approve',
    { request_id: requestId, approve },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  return response.data
}

export const fetchMyTrainerRequests = async (token) => {
  const response = await api.get('/courses/trainer-requests/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const fetchPendingTrainerRequests = async (token) => {
  const response = await api.get('/courses/trainer-requests/pending', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const approveTrainerRequest = async (requestId, approve, token) => {
  const response = await api.post(
    '/courses/trainer-requests/approve',
    { request_id: requestId, approve },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  return response.data
}

export const fetchProfile = async (token) => {
  const response = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
  return response.data
}

export const fetchMyRequests = async (token) => {
  const response = await api.get('/courses/requests/me', { headers: { Authorization: `Bearer ${token}` } })
  return response.data
}

export const runPracticeCode = async (language, code, stdin, token) => {
  const response = await api.post(
    '/code/run',
    { language, code, stdin },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return response.data
}

export const fetchCodingContests = async (slug, token) => {
  const response = await api.get(`/courses/${slug}/coding-contests`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const createCodingContest = async (slug, payload, token) => {
  const response = await api.post(`/courses/${slug}/coding-contests`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const deleteCodingContest = async (slug, contestId, token) => {
  const response = await api.delete(`/courses/${slug}/coding-contests/${contestId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const submitCodingContest = async (slug, contestId, questionId, code, token) => {
  const response = await api.post(
    `/courses/${slug}/coding-contests/${contestId}/submit`,
    { question_id: questionId, code },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return response.data
}

export const fetchCodingContestAnalytics = async (slug, contestId, token) => {
  const response = await api.get(`/courses/${slug}/coding-contests/${contestId}/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}
