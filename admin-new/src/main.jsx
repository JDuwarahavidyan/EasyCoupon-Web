import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthContextProvider } from './context/AuthContext.jsx'
import { UserContextProvider } from './context/UserContext.jsx'
import { QrCodeContextProvider } from './context/QrCodeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthContextProvider>
        <UserContextProvider>
          <QrCodeContextProvider>
            <App />
          </QrCodeContextProvider>
        </UserContextProvider>
      </AuthContextProvider>
    </BrowserRouter>
  </StrictMode>,
)
