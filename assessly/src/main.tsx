import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './styles/index.css'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
