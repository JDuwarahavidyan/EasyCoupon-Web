import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../api/auth.js'
import { Upload, UserPlus, Loader2, ArrowLeft, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'canteena', label: 'Canteen A' },
  { value: 'canteenb', label: 'Canteen B' },
  { value: 'admin', label: 'Admin' },
]

const UserCreate = () => {
  const navigate = useNavigate()
  const [mode, setMode] = useState('single') // 'single' | 'bulk'

  // Single user state
  const [form, setForm] = useState({ userName: '', fullName: '', email: '', role: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { type: 'success'|'error', message }

  // Bulk state
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResults, setBulkResults] = useState([])

  const handleSingleSubmit = async (e) => {
    e.preventDefault()
    setResult(null)

    if (!form.userName.trim() || !form.fullName.trim() || !form.email.trim() || !form.role) {
      setResult({ type: 'error', message: 'All fields are required' })
      return
    }

    setLoading(true)
    try {
      await registerUser(form)
      setResult({ type: 'success', message: 'User created successfully!' })
      setForm({ userName: '', fullName: '', email: '', role: '' })
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || 'Failed to create user' })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async () => {
    if (!bulkFile) return

    setBulkLoading(true)
    setBulkResults([])

    try {
      const data = await bulkFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      const results = []

      for (const row of rows) {
        const faculty = (row.Faculty || '').toString().toLowerCase()
        const batch = (row.Batch || '').toString()
        const regNo = (row.RegNo || '').toString()
        const fullName = (row['Full Name'] || row.FullName || '').toString()
        const email = (row.Email || '').toString()
        const role = (row.Role || 'student').toString().toLowerCase()
        const userName = `${faculty}${batch}${regNo}`.toLowerCase()

        if (!userName || !fullName || !email) {
          results.push({ userName: userName || '(empty)', status: 'error', message: 'Missing required fields' })
          continue
        }

        try {
          await registerUser({ userName, fullName, email, role })
          results.push({ userName, status: 'success', message: 'Created successfully' })
        } catch (err) {
          results.push({ userName, status: 'error', message: err.response?.data?.error || 'Failed' })
        }
      }

      setBulkResults(results)
    } catch (err) {
      setBulkResults([{ userName: '-', status: 'error', message: 'Failed to parse Excel file' }])
    } finally {
      setBulkLoading(false)
    }
  }

  const downloadSample = async () => {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Users')

    // Define columns with headers
    ws.columns = [
      { header: 'Faculty', key: 'faculty', width: 12 },
      { header: 'Batch', key: 'batch', width: 10 },
      { header: 'RegNo', key: 'regNo', width: 10 },
      { header: 'Full Name', key: 'fullName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
    ]

    // Style header row
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1F0DC' } }

    // Add sample data
    ws.addRow({ faculty: 'ENG', batch: '22', regNo: '3919', fullName: 'Abeywikarama A.B.C', email: 'Abeywikarama@gmail.com', role: 'student' })
  

    // Add dropdown data validation for Role column (F2:F100)
    for (let i = 2; i <= 100; i++) {
      ws.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"student,canteena,canteenb,admin"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Role',
        error: 'Please select a valid role: student, canteena, canteenb, or admin',
      }
    }

    // Download
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, 'Bulk_User_Creation_Format.xlsx')
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/users')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create User</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add a new user or bulk upload from Excel</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setMode('single')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'single' ? 'bg-white text-primary-500 shadow-sm' : 'text-gray-500'
          }`}
        >
          <UserPlus size={16} />
          Single User
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'bulk' ? 'bg-white text-primary-500 shadow-sm' : 'text-gray-500'
          }`}
        >
          <FileSpreadsheet size={16} />
          Bulk Upload
        </button>
      </div>

      {/* Single User Form */}
      {mode === 'single' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {result && (
            <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
              result.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {result.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {result.message}
            </div>
          )}

          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <input
                  type="text"
                  value={form.userName}
                  onChange={(e) => setForm({ ...form, userName: e.target.value })}
                  placeholder="eng223919"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Abeywikarama A.B.C"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Abeywikarama@gmail.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400 bg-white"
                >
                  <option value="" disabled>Select a role</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-primary-400 hover:bg-primary-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      {/* Bulk Upload */}
      {mode === 'bulk' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Upload an Excel file (.xlsx) with user data</p>
            <button
              onClick={downloadSample}
              className="text-sm text-primary-400 hover:text-primary-500 font-medium"
            >
              Download Sample
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-primary-300 transition-colors">
            {bulkFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet size={20} className="text-primary-400" />
                <span className="text-sm font-medium text-gray-700">{bulkFile.name}</span>
                <button onClick={() => setBulkFile(null)} className="text-gray-400 hover:text-red-500">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx or .xls files only</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>

          {bulkFile && (
            <button
              onClick={handleBulkUpload}
              disabled={bulkLoading}
              className="flex items-center gap-2 bg-primary-400 hover:bg-primary-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
            >
              {bulkLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {bulkLoading ? 'Processing...' : 'Upload & Create Users'}
            </button>
          )}

          {bulkResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <p className="text-sm font-medium text-gray-700">Results:</p>
              {bulkResults.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                    r.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {r.status === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span className="font-medium">{r.userName}</span>
                  <span className="text-xs">- {r.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UserCreate
