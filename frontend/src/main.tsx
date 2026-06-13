import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize dark mode from localStorage or system preference
const isDark = localStorage.getItem('theme') === 'dark' || 
  (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
if (isDark) document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
