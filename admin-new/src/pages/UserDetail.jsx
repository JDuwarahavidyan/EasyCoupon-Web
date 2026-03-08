import { useState, useEffect, useRef, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext.jsx'
import { getUser, updateUser } from '../api/users.js'
import { storage } from '../lib/firebase.js'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import QRCode from 'react-qr-code'
import CryptoJS from 'crypto-js'
import { saveAs } from 'file-saver'
import AccessDeniedModal from '../components/AccessDeniedModal.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import {
  ArrowLeft, Loader2, Camera, Download, Printer, QrCode,
  User, Mail, Shield, Hash, Calendar, Users as UsersIcon
} from 'lucide-react'

const UserDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useContext(AuthContext)
  const isSuperAdmin = currentUser?.role === 'superadmin'
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAccessDenied, setShowAccessDenied] = useState(false)
  const qrRef = useRef(null)

  const [form, setForm] = useState({ userName: '', fullName: '', email: '', profilePic: '' })
  const [qrValue, setQrValue] = useState(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getUser(id)
        // Admin (non-superadmin) can only view/edit student accounts or their own
        if (!isSuperAdmin && data.role !== 'student' && data.id !== currentUser?.uid) {
          setShowAccessDenied(true)
          return
        }
        setUser(data)
        setForm({
          userName: data.userName || '',
          fullName: data.fullName || '',
          email: data.email || '',
          profilePic: data.profilePic || '',
        })
      } catch {
        setError('Failed to load user')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [id])

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const storageRef = ref(storage, `profilePics/${Date.now()}${file.name}`)
    const uploadTask = uploadBytesResumable(storageRef, file)

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100))
      },
      () => {
        setError('Failed to upload image')
        setUploadProgress(0)
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref)
        // Delete old image if it exists
        if (form.profilePic && form.profilePic.includes('firebase')) {
          try {
            const oldRef = ref(storage, form.profilePic)
            await deleteObject(oldRef)
          } catch { /* old image may not exist */ }
        }
        setForm((prev) => ({ ...prev, profilePic: url }))
        setUploadProgress(0)
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const updated = await updateUser(id, form)
      setUser((prev) => ({ ...prev, ...updated }))
      setSuccess('User updated successfully')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  // Generate encrypted QR value when user is loaded (matches old frontend exactly)
  useEffect(() => {
    if (!user) return

    const keyStr = import.meta.env.VITE_ENCRYPTION_KEY
    const ivStr = import.meta.env.VITE_ENCRYPTION_IV

    const encryptionKey = CryptoJS.enc.Utf8.parse(keyStr)
    const iv = CryptoJS.enc.Utf8.parse(ivStr)

    const encrypted = CryptoJS.AES.encrypt(user.id, encryptionKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString()

    setQrValue(encrypted)
  }, [user])

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        saveAs(blob, `${user.userName}_QRCode.png`)
      })
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const printQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>QR Code - ${user.userName}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
        <h2 style="font-family:sans-serif;margin-bottom:20px;">${user.userName} - QR Code</h2>
        ${svgData}
        <script>setTimeout(()=>{ window.print(); window.close(); }, 500)<\/script>
      </body></html>
    `)
    win.document.close()
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp._seconds
      ? new Date(timestamp._seconds * 1000)
      : new Date(timestamp)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Colombo',
    })
  }

  const getRoleLabel = (role) => {
    const map = { student: 'Student', canteena: 'Canteen A', canteenb: 'Canteen B', admin: 'Admin', superadmin: 'Super Admin' }
    return map[role] || role
  }

  const isCanteen = user?.role === 'canteena' || user?.role === 'canteenb'

  if (loading) return <LoadingSpinner size="lg" text="Loading user..." />

  if (showAccessDenied) {
    return (
      <AccessDeniedModal
        open={true}
        onClose={() => navigate('/users')}
      />
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">User not found</p>
        <button onClick={() => navigate('/users')} className="text-primary-400 mt-2 text-sm font-medium">
          Back to Users
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/users')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and edit user information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: User Info Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col items-center text-center">
            <img
              src={form.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.userName)}&background=3CB34A&color=fff&size=96`}
              alt=""
              className="w-24 h-24 rounded-full object-cover border-4 border-primary-100"
            />
            <h3 className="mt-3 text-lg font-semibold text-gray-900">{user.userName}</h3>
            <StatusBadge status={user.role}>{getRoleLabel(user.role)}</StatusBadge>
          </div>

          <div className="mt-6 space-y-3">
            <InfoRow icon={Hash} label="ID" value={user.id} />
            <InfoRow icon={User} label="Full Name" value={user.fullName} />
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Shield} label="Role" value={getRoleLabel(user.role)} />
            {user.role === 'student' && (
              <InfoRow icon={UsersIcon} label="Remaining Coupons" value={user.studentCount ?? 0} />
            )}
            {isCanteen && (
              <InfoRow icon={UsersIcon} label="Usage Count" value={user.canteenCount ?? 0} />
            )}
            <InfoRow icon={Calendar} label="Created" value={formatDate(user.createdAt)} />
            <InfoRow
              icon={user.disabled ? Shield : Shield}
              label="Status"
              value={user.disabled ? 'Disabled' : 'Active'}
            />
          </div>
        </div>

        {/* Right: Edit Form + QR */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Edit User</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Profile Picture Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <img
                    src={form.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.fullName || form.userName)}&background=3CB34A&color=fff&size=48`}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    <Camera size={16} />
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                  {uploadProgress > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-400 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{uploadProgress}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                  <input
                    type="text"
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-primary-400 hover:bg-primary-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {saving ? 'Saving...' : 'Update User'}
              </button>
            </form>
          </div>

          {/* QR Code Section (canteen only) */}
          {isCanteen && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode size={20} className="text-primary-500" />
                <h3 className="text-base font-semibold text-gray-900">QR Code</h3>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div ref={qrRef} className="bg-white p-4 rounded-xl border border-gray-200">
                  {qrValue && <QRCode value={qrValue} size={180} />}
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    This QR code is encrypted and linked to this canteen user.
                    Students scan it to redeem coupons.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadQR}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Download size={16} />
                      Download PNG
                    </button>
                    <button
                      onClick={printQR}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Printer size={16} />
                      Print
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <Icon size={16} className="text-gray-400 mt-0.5 shrink-0" />
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-700 break-all">{value || '-'}</p>
    </div>
  </div>
)

export default UserDetail
