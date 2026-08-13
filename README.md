# Arcle 前端 · 在线聊天

基于 React + Vite + TypeScript 的即时通讯前端，对接 ThinkPHP 后端 API。

## 技术栈

- **框架**：React 18
- **构建工具**：Vite 5
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **路由**：react-router-dom
- **图标**：lucide-react
- **Markdown**：react-markdown + remark-gfm + rehype-highlight

## 功能模块

| 模块 | 说明 |
|------|------|
| 实时聊天 | 聊天室消息收发、引用回复、消息反应（emoji）、举报 |
| 私信 | 私聊会话列表、消息收发 |
| 通讯录 | 关注关系、用户搜索、备注管理 |
| 表白墙 | 匿名/实名表白、点赞、收藏、评论 |
| 漂流瓶 | 投放/拾取漂流瓶、回复 |
| 积分系统 | 签到、消费积分、积分历史 |
| 设置 | 个人资料编辑、密码修改、主题切换、**系统信息查看** |

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5174）
npm run dev

# 构建生产版本
npm run build
```

## 配置

环境变量 `.env`：

```
VITE_API_BASE_URL=http://localhost:8000
```

## 部署

前端构建产物输出到 `dist/`，可直接部署到静态文件服务器或 GitHub Pages。

## 后端仓库

- [meet-cool/tp-chat](https://github.com/meet-cool/tp-chat) — ThinkPHP 后端 API
