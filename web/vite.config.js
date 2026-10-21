import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      // 开发时把 /api 转发到本地后端代理（node server/index.js），避免 CORS，密钥只在后端
      '/api': 'http://localhost:3000'
    }
  }
})
