import { createContext, useReducer, useEffect } from 'react'

const INITIAL_STATE = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  isFetching: false,
  error: null,
}

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isFetching: true, error: null }
    case 'LOGIN_SUCCESS':
      return { user: action.payload, isFetching: false, error: null }
    case 'LOGIN_FAILURE':
      return { user: null, isFetching: false, error: action.payload }
    case 'LOGOUT':
      return { user: null, isFetching: false, error: null }
    case 'RESET_PASSWORD_START':
      return { ...state, isFetching: true, error: null }
    case 'RESET_PASSWORD_SUCCESS':
      return { ...state, isFetching: false, error: null }
    case 'RESET_PASSWORD_FAILURE':
      return { ...state, isFetching: false, error: action.payload }
    default:
      return state
  }
}

export const AuthContext = createContext(INITIAL_STATE)

export const AuthContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, INITIAL_STATE)

  useEffect(() => {
    if (state.user && !state.user.isFirstTime) {
      localStorage.setItem('user', JSON.stringify(state.user))
    } else {
      localStorage.removeItem('user')
    }
  }, [state.user])

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isFetching: state.isFetching,
        error: state.error,
        dispatch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
