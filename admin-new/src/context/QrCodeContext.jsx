import { createContext, useReducer } from 'react'

const INITIAL_STATE = {
  qrcodes: [],
  isFetching: false,
  error: null,
}

const qrCodeReducer = (state, action) => {
  switch (action.type) {
    case 'GET_QRCODES_START':
      return { ...state, isFetching: true, error: null }
    case 'GET_QRCODES_SUCCESS':
      return { qrcodes: action.payload, isFetching: false, error: null }
    case 'GET_QRCODES_FAILURE':
      return { ...state, isFetching: false, error: action.payload }
    default:
      return state
  }
}

export const QrCodeContext = createContext(INITIAL_STATE)

export const QrCodeContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(qrCodeReducer, INITIAL_STATE)

  return (
    <QrCodeContext.Provider
      value={{
        qrcodes: state.qrcodes,
        isFetching: state.isFetching,
        error: state.error,
        dispatch,
      }}
    >
      {children}
    </QrCodeContext.Provider>
  )
}
