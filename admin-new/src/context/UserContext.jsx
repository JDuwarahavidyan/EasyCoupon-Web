import { createContext, useReducer } from 'react'

const INITIAL_STATE = {
  users: [],
  isFetching: false,
  error: null,
}

const userReducer = (state, action) => {
  switch (action.type) {
    case 'GET_USERS_START':
      return { ...state, isFetching: true, error: null }
    case 'GET_USERS_SUCCESS':
      return { users: action.payload, isFetching: false, error: null }
    case 'GET_USERS_FAILURE':
      return { ...state, isFetching: false, error: action.payload }
    case 'DELETE_USER_SUCCESS':
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.payload),
      }
    case 'UPDATE_USER_SUCCESS':
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.payload.id ? action.payload : u
        ),
      }
    case 'DISABLE_USER_SUCCESS':
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.payload ? { ...u, disabled: true } : u
        ),
      }
    case 'ENABLE_USER_SUCCESS':
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.payload ? { ...u, disabled: false } : u
        ),
      }
    default:
      return state
  }
}

export const UserContext = createContext(INITIAL_STATE)

export const UserContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, INITIAL_STATE)

  return (
    <UserContext.Provider
      value={{
        users: state.users,
        isFetching: state.isFetching,
        error: state.error,
        dispatch,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
