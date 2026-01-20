import { defineConfig } from 'vite'

export default defineConfig({
  // 核心：设置打包的公共基础路径为相对路径
  base: './',
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx'] // 可选：指定模块解析的扩展名
  },
  build: {
    outDir: 'dist',
    sourcemap: true // 可选：生成源映射文件，便于调试
  },
})