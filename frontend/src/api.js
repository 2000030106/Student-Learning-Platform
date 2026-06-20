import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : ''),
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

export const updateQuizSchedule = async (slug, quizId, payload, token) => {
  const response = await api.put(`/courses/${slug}/quizzes/${quizId}/schedule`, payload, {
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

export const updateProfile = async (payload, token) => {
  const response = await api.put('/auth/me', payload, { headers: { Authorization: `Bearer ${token}` } })
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

export const updateCodingContestSchedule = async (slug, contestId, payload, token) => {
  const response = await api.put(`/courses/${slug}/coding-contests/${contestId}/schedule`, payload, {
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

export const fetchAssignments = async (slug, token) => {
  const response = await api.get(`/courses/${slug}/assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const createAssignment = async (slug, payload, token) => {
  const response = await api.post(`/courses/${slug}/assignments`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const submitAssignment = async (slug, assignmentId, file, note, token) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('note', note || '')
  const response = await api.post(`/courses/${slug}/assignments/${assignmentId}/submit`, formData, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const updateAssignmentSchedule = async (slug, assignmentId, payload, token) => {
  const response = await api.put(`/courses/${slug}/assignments/${assignmentId}/schedule`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const fetchAssignmentAnalytics = async (slug, assignmentId, token) => {
  const response = await api.get(`/courses/${slug}/assignments/${assignmentId}/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const downloadAssignmentSubmission = async (slug, assignmentId, submissionId, filename, token) => {
  const response = await api.get(
    `/courses/${slug}/assignments/${assignmentId}/submissions/${submissionId}/download`,
    { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' },
  )
  const url = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || 'assignment-submission'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// Profile and Authentication Functions
export const getProfile = async (token) => {
  const response = await api.get('/auth/profile', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const uploadProfilePicture = async (profilePicUrl, token) => {
  const response = await api.post(
    '/auth/profile/picture',
    { profile_pic_url: profilePicUrl },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return response.data
}

export const updateEmailPhone = async (email, phone, token) => {
  const response = await api.put(
    '/auth/profile/email-phone',
    { email, phone },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return response.data
}

export const changePassword = async (currentPassword, newPassword, confirmPassword, token) => {
  const response = await api.post(
    '/auth/profile/change-password',
    { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return response.data
}

// OTP Authentication Functions
export const requestOTP = async (username, deliveryMethod) => {
  const response = await api.post('/auth/otp-request', {
    username,
    delivery_method: deliveryMethod,
  })
  return response.data
}

export const verifyOTP = async (username, otpCode) => {
  const response = await api.post('/auth/otp-verify', {
    username,
    otp_code: otpCode,
  })
  return response.data
}

// Support Chat Functions
export const createSupportMessage = async (courseId, question, token) => {
  const response = await api.post(
    '/support/messages',
    { course_id: courseId, question },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return response.data
}

export const getCourseSupportMessages = async (courseId, token) => {
  const response = await api.get(`/support/messages/course/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const getMySupportMessages = async (token) => {
  const response = await api.get('/support/messages/my', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const answerSupportMessage = async (messageId, answer, token) => {
  const response = await api.post(
    `/support/messages/${messageId}/answer`,
    { answer },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return response.data
}

// LLM Chat Functions
export const createLLMChat = async (courseId, title, token) => {
  const response = await api.post(
    '/llm/chats',
    { course_id: courseId, title },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return response.data
}

export const getLLMChats = async (token) => {
  const response = await api.get('/llm/chats', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const getLLMChat = async (chatId, token) => {
  const response = await api.get(`/llm/chats/${chatId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const sendLLMMessage = async (chatId, content, token) => {
  const response = await api.post(
    `/llm/chats/${chatId}/message`,
    { content },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return response.data
}

export const deleteLLMChat = async (chatId, token) => {
  const response = await api.delete(`/llm/chats/${chatId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}
