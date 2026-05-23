# API 演示版

这是《一分钟人生岔路口》的现场演示版，用于展示“AI 实时生成分支剧情”的能力。

## 特点

- 前端使用原生 HTML/CSS/JS。
- 前端已同步离线版 Cyber Canvas 新界面。
- 后端使用 Node.js + Express。
- API Key 只放在后端 `.env` 中。
- 前端不会暴露 API Key。
- 后端按 OpenAI-compatible Chat Completions 协议调用大模型。
- 大模型不可用、超时或返回异常时，会自动 fallback，游戏仍可继续。

## 运行后端

```bash
cd life-crossroads/api-demo/server
npm install
npm start
```

默认服务地址：

```text
http://localhost:3001
```

## 配置大模型 API

复制环境变量示例：

```bash
cd life-crossroads/api-demo/server
cp .env.example .env
```

编辑 `.env`：

```text
PORT=3001
LLM_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
LLM_MODEL=mimo-v2.5
LLM_API_KEY=your_api_key
```

注意：`LLM_BASE_URL` 不要包含 `/chat/completions`。

如果不配置 `LLM_API_KEY` 或 `LLM_BASE_URL`，后端会返回本地 fallback 剧情，Demo 仍然可以完整体验。

也可以使用 Anthropic-compatible Messages API：

```text
PORT=3001
ANTHROPIC_BASE_URL=https://example.com/anthropic
ANTHROPIC_AUTH_TOKEN=your_token
ANTHROPIC_MODEL=mimo-v2.5
```

注意：`ANTHROPIC_BASE_URL` 不要包含 `/v1/messages`，后端会自动拼接。

如果同时配置了 `LLM_*` 和 `ANTHROPIC_*`，后端优先使用 `LLM_*`。当前项目更推荐 OpenAI-compatible 路径，因为它响应更快，也不会把大量 thinking 内容塞进返回体。

## 运行前端

推荐通过本地静态服务器访问前端，而不是双击 `file://` 打开：

```bash
cd life-crossroads/api-demo/frontend
python -m http.server 5173
```

访问：

```text
http://localhost:5173
```

前端默认请求：

```text
http://localhost:3001/api/next
http://localhost:3001/api/ending
```

如需调整后端地址，可在前端页面加载前设置：

```js
window.API_BASE = "http://localhost:3001";
```

或直接修改 `frontend/js/game.js` 顶部的：

```js
const API_BASE = window.API_BASE || "http://localhost:3001";
```

## 接口

`POST /api/next`：根据身份、当前步数、属性和历史选择生成下一段剧情。

`POST /api/ending`：根据身份、最终属性和历史选择生成结局。

## 鲁棒性

- 前端请求失败时自动使用本地 fallbackEvents。
- 请求过程中显示“命运生成中……”。
- 后端对请求体做基础校验。
- 后端至少重试 1 次模型请求。
- 后端模型调用超时控制在 15 秒以内。
- 后端可从 Markdown 包裹内容中提取 JSON。
- 后端会补齐缺失字段，修正 choices 数量、effects 数值和 scene。
- 后端不会记录 API Key。
- 后端返回 fallback 时，会在控制台打印 `[FALLBACK]` 和具体原因。
