import api from '../lib/axios.js'

export const getQrCodes = async () => {
  const res = await api.get('/qr')
  return res.data
}

export const getNewQrCodes = async () => {
  const res = await api.get('/qr?new=true')
  return res.data
}

export const getQrCode = async (id) => {
  const res = await api.get(`/qr/find/${id}`)
  return res.data
}

export const getQrStats = async () => {
  const res = await api.get('/qr/stats')
  return res.data
}

export const getQrCount = async (role) => {
  const res = await api.get(`/qr/count?role=${role}`)
  return res.data
}

export const getQrSummary = async () => {
  const res = await api.get('/qr/summary')
  return res.data
}
