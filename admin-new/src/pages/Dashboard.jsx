import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Users, ScanLine, TrendingUp, UserCheck } from 'lucide-react'
import StatCard from '../components/StatCard.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { getUserStats, getUserSummary, getNewUsers } from '../api/users.js'
import { getQrStats, getQrCount, getQrSummary } from '../api/qr.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const COLORS = { primary: '#3CB34A', dark: '#25664B', sage: '#5A8E6F', accent: '#627d98', navy: '#243b53', rose: '#be123c' }

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [userSummary, setUserSummary] = useState(null)
  const [qrSummary, setQrSummary] = useState(null)
  const [userStats, setUserStats] = useState([])
  const [qrStats, setQrStats] = useState([])
  const [canteenComparison, setCanteenComparison] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [uSummary, qSummary, uStats, qStats, canteenA, canteenB, newUsers] =
          await Promise.all([
            getUserSummary(),
            getQrSummary(),
            getUserStats(),
            getQrStats(),
            getQrCount('canteena'),
            getQrCount('canteenb'),
            getNewUsers(),
          ])

        setUserSummary(uSummary)
        setQrSummary(qSummary)

        // Format user registration trend
        const uData = MONTHS.map((name, i) => {
          const found = uStats.find((s) => s.month === i + 1)
          return { name, users: found ? found.total : 0 }
        })
        setUserStats(uData)

        // Format QR scan activity
        const qData = MONTHS.map((name, i) => {
          const found = qStats.find((s) => s.month === i + 1)
          return { name, scans: found ? found.total : 0 }
        })
        setQrStats(qData)

        // Format canteen comparison
        const cData = MONTHS.map((name, i) => {
          const a = canteenA.find((s) => s.month === i + 1)
          const b = canteenB.find((s) => s.month === i + 1)
          return { name, 'Canteen A': a ? a.total : 0, 'Canteen B': b ? b.total : 0 }
        })
        setCanteenComparison(cData)

        setRecentUsers(newUsers.slice(0, 6))
      } catch (err) {
        // Silently handle — dashboard will show incomplete data
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />

  const roleData = userSummary
    ? [
        { name: 'Students', value: userSummary.totalStudents, color: COLORS.primary },
        { name: 'Canteen A', value: userSummary.totalCanteenA, color: COLORS.sage },
        { name: 'Canteen B', value: userSummary.totalCanteenB, color: COLORS.accent },
        { name: 'Admins', value: userSummary.totalAdmins, color: COLORS.navy },
        { name: 'Super Admins', value: userSummary.totalSuperAdmins, color: COLORS.rose },
      ].filter((d) => d.value > 0)
    : []

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp._seconds
      ? new Date(timestamp._seconds * 1000)
      : new Date(timestamp)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of Easy Coupon system</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={userSummary?.totalUsers} icon={Users} color="primary" />
        <StatCard title="Today's Scans" value={qrSummary?.todayScans} icon={ScanLine} color="blue" />
        <StatCard title="This Month Scans" value={qrSummary?.thisMonthScans} icon={TrendingUp} color="amber" />
        <StatCard title="Active Users" value={userSummary?.activeUsers} icon={UserCheck} color="primary" />
      </div>

      {/* Charts Row 1: User Trend + Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">User Registration Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={userStats}>
              <defs>
                <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke={COLORS.primary}
                strokeWidth={2}
                fill="url(#gradientGreen)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">User Roles</h3>
          {roleData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {roleData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {roleData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">No data available</p>
          )}
        </div>
      </div>

      {/* Charts Row 2: QR Scan Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">QR Scan Activity</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={qrStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}
            />
            <Bar dataKey="scans" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row 3: Canteen Comparison */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Canteen Comparison (Coupons Used)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={canteenComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Canteen A" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
            <Bar dataKey="Canteen B" fill={COLORS.accent} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Members */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Recent Members</h3>
          <button
            onClick={() => navigate('/users')}
            className="text-sm text-primary-400 hover:text-primary-500 font-medium"
          >
            View All
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => navigate(`/users/${user.id}`)}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 cursor-pointer transition-all"
            >
              <img
                src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.userName)}&background=3CB34A&color=fff`}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.fullName || user.userName}</p>
                <p className="text-xs text-gray-500 truncate">{user.role} &middot; {formatDate(user.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
        {recentUsers.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No recent members</p>
        )}
      </div>
    </div>
  )
}

export default Dashboard
