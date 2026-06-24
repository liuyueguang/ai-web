# Murmure STUDIO

一款身心健康/情绪疗愈的单页 Web 应用。用户可以上传耳部照片，获取 AI 生成的诗意"耳语"，获得定制化的耳饰佩戴方案（光环星座），并与情绪支持机器人聊天——整体风格定位为宁静、奢华的疗愈品牌。

## 构建与运行

```bash
pnpm dev          # 启动开发服务器 (Vite)
pnpm build        # 生产构建
pnpm preview      # 预览生产构建
```

包管理器：**pnpm**（存在 pnpm-workspace.yaml，允许 esbuild 构建）。

## 技术栈

- **React 18**（函数组件 + Hooks）
- **Vite 6** + `@vitejs/plugin-react`
- **Tailwind CSS v4**，通过 `@tailwindcss/vite` 插件引入
- **Lucide React**（`^0.468.0`）用于所有图标
- 纯 JavaScript/JSX — **不使用 TypeScript**

## 项目结构

```
index.html              # 入口 HTML，<div id="root"> + module script
src/
  main.jsx              # ReactDOM.createRoot → <App />
  App.jsx               # 约 730 行的单一组件——所有逻辑和 UI 均在此文件中
  index.css             # Tailwind 引入 + 自定义动画（fade-in-up、spin-slow）
public/
  moon.svg              # 网站图标
vite.config.js          # React + Tailwind CSS 插件配置
```

## 架构设计

### 单组件应用
所有状态、API 调用和 UI 渲染均集中在 `src/App.jsx` 中。**没有路由**，**没有组件拆分**，没有状态管理库。`App` 组件管理三个功能模块：

1. **耳语生成器**（图片上传 + AI 图像分析）
2. **光环星座**（基于文本的 AI 耳饰佩戴方案生成）
3. **情绪树洞**（悬浮聊天窗口）

### API 后端

| 接口 | 用途 |
|---|---|
| `http://120.26.44.144/13010/api/chat` | 主要 AI 后端——处理图像分析及文本生成 |
| `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent` | TTS 语音合成（当前在 UI 中已注释） |
| `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent` | 光环星座生成（已定义，但实际使用的是 `/api/chat`） |

- API 密钥通过 `apiKey` 变量注入（当前为空字符串，由环境/部署平台设置）
- `fetchWithRetry()` 辅助函数实现指数退避重试：1s → 2s → 4s → 8s → 16s，最多 5 次
- `base64PcmToWav()` 将 TTS 返回的 PCM base64 音频转换为可播放的 WAV 格式

### 国际化 (i18n)
所有 UI 文案均存放在 `i18n` 对象中，按语言代码（`zh`、`en`、`fr`）索引。通过 `lang` 状态变量切换语言。未使用任何 i18n 库。

### 设计 Token

| Token | 色值 | 用途 |
|---|---|---|
| 背景色 | `#FDFCF8` | 页面背景 |
| 主文字色 | `#5C5552` | 标题、正文 |
| 辅助文字色 | `#8B8580` | 副文本、描述 |
| 金色强调 | `#D4A373` | 按钮、高亮、Moon 图标 |
| 边框色 | `#E8DCC4` | 分割线、卡片边框 |
| 绿色 | `#95B8A2` | 辅助强调色、水晶元素 |
| 次要背景 | `#F5F5F0` | 区域背景 |

字体：`.font-serif` 使用 `Georgia, 'Times New Roman', serif`；无衬线字体使用系统默认字体。

### 自定义 CSS 动画
- `animate-fade-in-up` — 0.6s ease-out，淡入 + translateY(20px→0)
- `animate-spin-slow` — 3s 线性旋转

## 编码规范

- JSX 文件使用 `.jsx` 扩展名
- React Hooks（useState、useRef、useEffect）从 `'react'` 中导入
- 图标从 `lucide-react` 中逐个按需导入
- API 调用使用原生 `fetch()` 配合重试辅助函数
- 错误处理采用设置兜底/默认值 + `console.error` 的方式
- 所有 UI 文案通过 `t` 变量引用（`const t = i18n[lang]`）
- CSS 类使用 Tailwind 原子类，自定义色值使用任意值语法（如 `bg-[#FDFCF8]`）
- 代码注释使用英文
