import api from '../lib/axios.js'

export const getUsers = async () => {
  const res = await api.get('/users')
  return res.data
}

export const getNewUsers = async () => {
  const res = await api.get('/users?new=true')
  return res.data
}

export const getUser = async (id) => {
  const res = await api.get(`/users/find/${id}`)
  return res.data
}

export const updateUser = async (id, data) => {
  const res = await api.put(`/users/${id}`, data)
  return res.data
}

export const deleteUser = async (id) => {
  const res = await api.delete(`/users/${id}`)
  return res.data
}

export const disableUser = async (id) => {
  const res = await api.put(`/users/disable/${id}`)
  return res.data
}

export const enableUser = async (id) => {
  const res = await api.put(`/users/enable/${id}`)
  return res.data
}

export const getUserStats = async () => {
  const res = await api.get('/users/stats')
  return res.data
}

export const getUserSummary = async () => {
  const res = await api.get('/users/summary')
  return res.data
}
