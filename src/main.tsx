import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'react-photo-view/dist/react-photo-view.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
