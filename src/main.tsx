import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { bootAccent } from '@/hooks/use-accent'
import './index.css'

bootAccent()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
