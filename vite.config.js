import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/Tazemi/',
  plugins: [react()],
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, './src/components/index.jsx'),
      '@data': path.resolve(__dirname, './src/data/index.js'),
    },
    extensions: ['.jsx', '.js', '.tsx', '.ts'],
  }
})
