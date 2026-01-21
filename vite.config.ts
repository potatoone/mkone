import { defineConfig } from 'vite';

export default defineConfig({
  base: 'wiki', // 修改此处路径
  build: {
    outDir: 'wiki', // 打包目录
  }
});
