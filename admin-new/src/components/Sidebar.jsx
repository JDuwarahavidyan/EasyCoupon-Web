import { NavLink, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'
import { LayoutDashboard, Users, FileBarChart, LogOut, X, ScrollText } from 'lucide-react'
import logo from '../assets/logo.png'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/logs', icon: ScrollText, label: 'Audit Logs' },
]

const Sidebar = ({ open, onClose }) => {
  const { dispatch } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' })
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-linear-to-b from-primary-500 to-primary-700 text-white flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Easy Coupon" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Easy Coupon</h1>
              <p className="text-xs text-white/60">Admin Panel</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-white/10 rounded">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/20 text-white shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-red-200 transition-all w-full"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
