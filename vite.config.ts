import { defineConfig } from 'vite';

// 要保留的文件/目录
const preserveFiles = [
  { src: 'docs', dest: 'docs' }    // 保留 docs 目录（按需添加）
];

export default defineConfig({
  base: './', // 相对路径
  build: {
    outDir: 'demo', // 打包目录
  }
});
