import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './src/App'
import { AuthProvider } from './src/context/AuthContext'
import './src/index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
