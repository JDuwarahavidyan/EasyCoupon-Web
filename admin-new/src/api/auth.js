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

export const forgotPasswordSendOtp = async (data) => {
  const res = await api.post('/auth/forgot-password/send-otp', data)
  return res.data
}

export const forgotPasswordVerifyOtp = async (data) => {
  const res = await api.post('/auth/forgot-password/verify-otp', data)
  return res.data
}
