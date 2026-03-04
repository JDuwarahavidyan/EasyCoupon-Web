import { useState, useEffect, useContext, useMemo, useRef } from 'react'
import { QrCodeContext } from '../context/QrCodeContext.jsx'
import { getQrCodes } from '../api/qr.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import * as XLSX from 'xlsx'
import { Search, Download, Calendar, ChevronLeft, ChevronRight, Ticket } from 'lucide-react'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'canteena', label: 'Canteen A' },
  { key: 'canteenb', label: 'Canteen B' },
]

const PAGE_SIZE = 15

const Reports = () => {
  const { qrcodes, isFetching, dispatch } = useContext(QrCodeContext)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const wsRef = useRef(null)

  // Initial HTTP fetch
  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'GET_QRCODES_START' })
      try {
        const data = await getQrCodes()
        dispatch({ type: 'GET_QRCODES_SUCCESS', payload: data })
      } catch {
        dispatch({ type: 'GET_QRCODES_FAILURE' })
      }
    }
    fetchData()
  }, [dispatch])

  // WebSocket for real-time updates
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) return

    const user = JSON.parse(stored)
    const token = user.customToken
    if (!token) return

    const wsUrl = `${import.meta.env.VITE_WS_URL}?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        dispatch({ type: 'GET_QRCODES_SUCCESS', payload: data })
      } catch { /* ignore */ }
    }

    ws.onerror = () => { /* silently handle */ }

    return () => {
      ws.close()
    }
  }, [dispatch])

  const filtered = useMemo(() => {
    let result = qrcodes

    if (activeTab !== 'all') {
      result = result.filter((q) => q.canteenType === activeTab)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (item) =>
          item.studentName?.toLowerCase().includes(q) ||
          item.id?.toLowerCase().includes(q) ||
          item.canteenName?.toLowerCase().includes(q)
      )
    }

    if (startDate) {
      result = result.filter((item) => new Date(item.scannedAt) >= startDate)
    }
    if (endDate) {
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)
      result = result.filter((item) => new Date(item.scannedAt) <= endOfDay)
    }

    return result
  }, [qrcodes, activeTab, search, startDate, endDate])

  const totalCoupons = useMemo(
    () => filtered.reduce((sum, item) => sum + (item.count || 0), 0),
    [filtered]
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  useEffect(() => { setPage(0) }, [activeTab, search, startDate, endDate])

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paged.map((q) => q.id)))
    }
  }

  const exportToExcel = () => {
    const selected = filtered.filter((q) => selectedIds.has(q.id))
    if (selected.length === 0) return

    const rows = selected.map((q) => ({
      'Student Name': q.studentName || '-',
      'Canteen Name': q.canteenName || '-',
      'Canteen Type': q.canteenType || '-',
      'Coupons Used': q.count || 0,
      'Date/Time': q.scannedAt ? new Date(q.scannedAt).toLocaleString('en-GB') : '-',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')

    const dateStr = startDate && endDate
      ? `${startDate.toLocaleDateString('en-GB').replace(/\//g, '-')}_to_${endDate.toLocaleDateString('en-GB').replace(/\//g, '-')}`
      : new Date().toISOString().slice(0, 10)

    XLSX.writeFile(wb, `Coupons_History_${dateStr}.xlsx`)
  }

  const formatDateTime = (str) => {
    if (!str) return '-'
    const d = new Date(str)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  if (isFetching && qrcodes.length === 0) return <LoadingSpinner size="lg" text="Loading reports..." />

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">QR code scan history and coupon usage</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-xl">
            <Ticket size={16} className="text-primary-500" />
            <span className="text-sm font-medium text-primary-700">
              Total Coupons: <strong>{totalCoupons}</strong>
            </span>
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-primary-400 hover:bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Download size={16} />
              Export ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student, ID, canteen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <div className="w-40">
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                placeholderText="Start date"
                dateFormat="dd/MM/yyyy"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                isClearable
              />
            </div>
            <span className="text-gray-400 text-sm">to</span>
            <div className="w-40">
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                placeholderText="End date"
                dateFormat="dd/MM/yyyy"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                isClearable
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(null); setEndDate(null) }}
                className="text-xs text-primary-400 hover:text-primary-500 font-medium"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={paged.length > 0 && selectedIds.size === paged.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-primary-400 focus:ring-primary-400"
                  />
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Student</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Canteen</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Coupons</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Date/Time</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((qr) => (
                <tr key={qr.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(qr.id)}
                      onChange={() => toggleSelect(qr.id)}
                      className="rounded border-gray-300 text-primary-400 focus:ring-primary-400"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{qr.studentName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{qr.canteenName || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      qr.canteenType === 'canteena'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {qr.canteenType === 'canteena' ? 'Canteen A' : 'Canteen B'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{qr.count || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right hidden sm:table-cell">{formatDateTime(qr.scannedAt)}</td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-gray-400">
                    No records found
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
    </div>
  )
}

export default Reports
