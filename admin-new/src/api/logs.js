import api from '../lib/axios.js'

export const getLogs = async (cursor = null, pageSize = 15) => {
  const params = { pageSize }
  if (cursor) params.startAfter = cursor
  const res = await api.get('/logs', { params })
  return res.data
}

export const createLog = async (action, details) => {
  const res = await api.post('/logs', { action, details })
  return res.data
}
