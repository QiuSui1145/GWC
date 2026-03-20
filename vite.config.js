import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // 关键：将所有发往 /proxy_api 的请求转发到你的云端地址
      '/proxy_api': {
        target: 'https://ap-northeast-1.clawcloudrun.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy_api/, ''),
        // 如果你的代理软件需要，可以加上这个：
        secure: false, 
      }
    }
  }
})