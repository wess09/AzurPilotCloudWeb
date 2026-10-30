import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ root: 'stats', plugins: [react()], build: { outDir: '../dist/stats', emptyOutDir: true }, server: { port: 5174 } })
