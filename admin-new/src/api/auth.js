import api from '../lib/axios.js'

export const login = async (credentials) => {
  const res = await api.post('/auth/login', credentials)
  return res.data
}

export const resetPassword = async (data) => {
  const res = await api.post('/auth/reset-password', data)
  return res.data
}

export const registerUser = async (userData) => {
  const res = await api.post('/auth/register', userData)
  return res.data
}
