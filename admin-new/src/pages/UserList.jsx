import { useState, useEffect, useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../context/UserContext.jsx'
import { AuthContext } from '../context/AuthContext.jsx'
import { getUsers, deleteUser, disableUser, enableUser } from '../api/users.js'
import StatusBadge from '../components/StatusBadge.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import AccessDeniedModal from '../components/AccessDeniedModal.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'student', label: 'Students' },
  { key: 'canteen', label: 'Canteen' },
  { key: 'admin', label: 'Admins' },
]

const PAGE_SIZE = 10

const UserList = () => {
  const { users, isFetching, dispatch } = useContext(UserContext)
  const { user: currentUser } = useContext(AuthContext)
  const isSuperAdmin = currentUser?.role === 'superadmin'
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [confirmDialog, setConfirmDialog] = useState({ open: false })
  const [dialogLoading, setDialogLoading] = useState(false)
  const [showAccessDenied, setShowAccessDenied] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUsers = async () => {
      dispatch({ type: 'GET_USERS_START' })
      try {
        const data = await getUsers()
        dispatch({ type: 'GET_USERS_SUCCESS', payload: data })
      } catch {
        dispatch({ type: 'GET_USERS_FAILURE' })
      }
    }
    fetchUsers()
  }, [dispatch])

  const filtered = useMemo(() => {
    let result = users
    if (activeTab === 'student') result = result.filter((u) => u.role === 'student')
    else if (activeTab === 'canteen') result = result.filter((u) => u.role === 'canteena' || u.role === 'canteenb')
    else if (activeTab === 'admin') result = result.filter((u) => u.role === 'admin' || u.role === 'superadmin')

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.userName?.toLowerCase().includes(q) ||
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      )
    }
    return result
  }, [users, activeTab, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  useEffect(() => { setPage(0) }, [activeTab, search])

  const handleDelete = (user) => {
    if (!isSuperAdmin && user.role !== 'student') {
      setShowAccessDenied(true)
      return
    }
    setConfirmDialog({
      open: true,
      title: 'Delete User',
      message: `Are you sure you want to delete "${user.userName}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        setDialogLoading(true)
        try {
          await deleteUser(user.id)
          dispatch({ type: 'DELETE_USER_SUCCESS', payload: user.id })
        } catch { /* ignore */ }
        setDialogLoading(false)
        setConfirmDialog({ open: false })
      },
    })
  }

  const handleToggleStatus = (user) => {
    if (!isSuperAdmin && user.role !== 'student') {
      setShowAccessDenied(true)
      return
    }
    const isDisabling = !user.disabled
    setConfirmDialog({
      open: true,
      title: isDisabling ? 'Disable User' : 'Enable User',
      message: isDisabling
        ? `Are you sure you want to disable "${user.userName}"? They will lose access to the system.`
        : `Are you sure you want to re-enable "${user.userName}"?`,
      variant: isDisabling ? 'warning' : 'success',
      confirmText: isDisabling ? 'Disable' : 'Enable',
      onConfirm: async () => {
        setDialogLoading(true)
        try {
          if (isDisabling) {
            await disableUser(user.id)
            dispatch({ type: 'DISABLE_USER_SUCCESS', payload: user.id })
          } else {
            await enableUser(user.id)
            dispatch({ type: 'ENABLE_USER_SUCCESS', payload: user.id })
          }
        } catch { /* ignore */ }
        setDialogLoading(false)
        setConfirmDialog({ open: false })
      },
    })
  }

  const getRoleLabel = (role) => {
    const map = { student: 'Student', canteena: 'Canteen A', canteenb: 'Canteen B', admin: 'Admin', superadmin: 'Super Admin' }
    return map[role] || role
  }

  if (isFetching) return <LoadingSpinner size="lg" text="Loading users..." />

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} users found</p>
        </div>
        <button
          onClick={() => navigate('/users/new')}
          className="flex items-center gap-2 bg-primary-400 hover:bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={18} />
          Create User
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-gray-100">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-primary-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Email</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.userName)}&background=3CB34A&color=fff&size=36`}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.userName}</p>
                        <p className="text-xs text-gray-500">{user.fullName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-gray-600">{user.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.role}>{getRoleLabel(user.role)}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                        user.disabled
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                    >
                      {user.disabled ? 'Disabled' : 'Active'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          if (!isSuperAdmin && user.role !== 'student' && user.id !== currentUser?.uid) {
                            setShowAccessDenied(true)
                            return
                          }
                          navigate(`/users/${user.id}`)
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        loading={dialogLoading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false })}
      />

      <AccessDeniedModal open={showAccessDenied} onClose={() => setShowAccessDenied(false)} />
    </div>
  )
}

export default UserList
