import { Routes, Route, Navigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import PasswordReset from './pages/PasswordReset.jsx'
import Dashboard from './pages/Dashboard.jsx'
import UserList from './pages/UserList.jsx'
import UserCreate from './pages/UserCreate.jsx'
import UserDetail from './pages/UserDetail.jsx'
import Reports from './pages/Reports.jsx'
import Logs from './pages/Logs.jsx'

function App() {
  const { user } = useContext(AuthContext)

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/pwreset" element={<PasswordReset />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserList />} />
          <Route path="/users/new" element={<UserCreate />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/logs" element={<Logs />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
    </Routes>
  )
}

export default App
