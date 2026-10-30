import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicStatistics } from './views/PublicStatistics'
import './styles.css'
createRoot(document.getElementById('root')!).render(<StrictMode><PublicStatistics /></StrictMode>)
