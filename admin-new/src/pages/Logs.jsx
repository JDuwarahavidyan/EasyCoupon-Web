import { useState, useEffect, useMemo } from 'react'
import { getLogs } from '../api/logs.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { Search, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react'

const ACTION_BADGES = {
  LOGIN:           { label: 'Login',           bg: 'bg-blue-100',   text: 'text-blue-700' },
  CREATE_USER:     { label: 'Create User',     bg: 'bg-green-100',  text: 'text-green-700' },
  UPDATE_USER:     { label: 'Update User',     bg: 'bg-amber-100',  text: 'text-amber-700' },
  DELETE_USER:     { label: 'Delete User',     bg: 'bg-red-100',    text: 'text-red-700' },
  DISABLE_USER:    { label: 'Disable User',    bg: 'bg-orange-100', text: 'text-orange-700' },
  ENABLE_USER:     { label: 'Enable User',     bg: 'bg-teal-100',   text: 'text-teal-700' },
  RESET_PASSWORD:  { label: 'Reset Password',  bg: 'bg-purple-100', text: 'text-purple-700' },
  DOWNLOAD_REPORT: { label: 'Download Report', bg: 'bg-indigo-100', text: 'text-indigo-700' },
}

const PAGE_SIZE = 15

const Logs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cursors, setCursors] = useState([null])
  const [pageIndex, setPageIndex] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const fetchPage = async (cursor) => {
    setLoading(true)
    try {
      const data = await getLogs(cursor, PAGE_SIZE)
      setLogs(data.logs)
      setHasMore(data.hasMore)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage(null)
  }, [])

  const handleNextPage = async () => {
    if (!hasMore || logs.length === 0) return
    const lastId = logs[logs.length - 1].id
    const newCursors = [...cursors]
    if (pageIndex + 1 >= newCursors.length) {
      newCursors.push(lastId)
    }
    setCursors(newCursors)
    setPageIndex(pageIndex + 1)
    await fetchPage(lastId)
  }

  const handlePrevPage = async () => {
    if (pageIndex <= 0) return
    const newIndex = pageIndex - 1
    setPageIndex(newIndex)
    await fetchPage(cursors[newIndex])
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(
      (log) =>
        log.adminName?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q)
    )
  }, [logs, search])

  const formatDateTime = (str) => {
    if (!str) return '-'
    const d = new Date(str)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading && logs.length === 0) return <LoadingSpinner size="lg" text="Loading audit logs..." />

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all admin actions and changes</p>
        </div>
        <div className="flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-xl">
          <ScrollText size={16} className="text-primary-500" />
          <span className="text-sm font-medium text-primary-700">
            Page {pageIndex + 1}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by admin, action, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Date/Time</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Admin</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Action</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const badge = ACTION_BADGES[log.action] || { label: log.action, bg: 'bg-gray-100', text: 'text-gray-700' }
                return (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{log.adminName || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{log.details || '-'}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-sm text-gray-400">
                    No log entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Page {pageIndex + 1} {!hasMore && logs.length > 0 ? '(last page)' : ''}
          </p>
          <div className="flex gap-1">
            <button
              onClick={handlePrevPage}
              disabled={pageIndex === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextPage}
              disabled={!hasMore}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Logs
