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

export const requestAccess = async (slug, token) => {
  const response = await api.post(`/courses/${slug}/request`, null, {
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

export const fetchProfile = async (token) => {
  const response = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
  return response.data
}

export const fetchMyRequests = async (token) => {
  const response = await api.get('/courses/requests/me', { headers: { Authorization: `Bearer ${token}` } })
  return response.data
}
