import { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext.jsx'

const ProtectedRoute = () => {
  const { user } = useContext(AuthContext)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.isFirstTime) {
    return <Navigate to={`/pwreset?uid=${user.uid}`} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
