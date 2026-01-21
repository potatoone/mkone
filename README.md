mkone/
├── index.html              # 主入口 HTML
├── css/
│   ├── base.css            # 基础样式
│   ├── layout.css          # 布局样式
│   ├── sidebar.css         # 侧边栏样式
│   └── topbar.css          # 顶栏样式
├── src/
│   ├── main.ts             # 主入口
│   ├── sidebar.ts          # 侧边栏逻辑
│   ├── topbar.ts           # 顶栏逻辑
│   ├── history.ts          # 历史记录逻辑
│   └── markdown.ts         # Markdown 处理
├── docs/
│   ├── README.md
│   ├── guide.md
│   └── about.md            # Markdown 文档
├── demo/dist/                   # 编译输出目录
│   └── main.js
├── tsconfig.json           # TypeScript 配置
├── package.json            # 依赖配置
└── vite.config.ts          # Vite 配置（如果使用 Vite）




安装 typescript
npm install -g typescript

初始化配置文件 tsconfig.json 可手动创建
npx tsc --init

安装构建工具 vite
npm create vite@latest

安装marked
npm install marked
安装marked代码高亮
npm install marked-highlight

运行开发环境
npm run dev

打包项目
npm run build

