import { defineConfig } from 'vite';

export default defineConfig({
  base: './wiki', // 相对路径
  build: {
    outDir: 'wiki', // 打包目录
  }
});
