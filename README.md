# 一分钟人生岔路口：AI 平行人生生成器

面向抖音互动空间 Hackathon 的 HTML5 竖屏互动剧情 Demo。玩家选择一种人生身份，连续做出 6 次选择，每次选择都会改变心态、钱包、运气和离谱值，最终生成一个幽默、轻荒诞、适合分享的人生结局。

## 项目结构

```text
life-crossroads/
  offline/
    index.html
    css/style.css
    js/game.js
    js/particles.js
    audio/bgm.mp3
    README.md
  api-demo/
    frontend/
      index.html
      css/style.css
      js/game.js
      js/particles.js
      audio/bgm.mp3
    server/
      package.json
      server.js
      .env.example
    README.md
  README.md
```

## 核心玩法

- 5 种身份：大学生、社畜、创业者、猫、外星人
- 6 步选择：每一步两个选项
- 4 项属性：心态 `mood`、钱包 `money`、运气 `luck`、离谱值 `crazy`
- 每次选择会改变属性，并展示结果反馈
- 最后根据属性和选择历史生成结局与分享文案

## 两个版本

### `offline/` 离线展示版

用于稳定展示和上传包准备。

- Cyber Canvas 新界面
- 本地剧情池和结局池
- 本地背景音乐与粒子效果
- 不依赖后端和 API Key
- 入口是 `offline/index.html`

当前版本的核心玩法资源都在本地。若目标平台严格禁止任何外链，请在打包前检查 `offline/index.html`，必要时移除字体外链，浏览器会回退到系统字体。

### `api-demo/` API 演示版

用于现场展示“AI 实时生成剧情”。

- 前端 UI 与最新离线版保持一致
- 后端使用 Node.js + Express
- 前端不保存 API Key
- 后端从 `.env` 读取模型配置
- 支持 `API模式 / 离线模式` 一键切换
- API 失败时自动 fallback 到本地剧情

## 运行离线版

```bash
cd life-crossroads/offline
python -m http.server 5173
```

访问：

```text
http://localhost:5173
```

也可以直接打开：

```text
life-crossroads/offline/index.html
```

## 运行 API 演示版

启动后端：

```bash
cd life-crossroads/api-demo/server
npm install
npm start
```

启动前端：

```bash
cd life-crossroads/api-demo/frontend
python -m http.server 5175
```

访问：

```text
http://localhost:5175
```

页面右上角按钮可以切换：

- `API模式`：每一步请求后端大模型接口。
- `离线模式`：只使用前端内置剧情，不请求后端。

## 环境变量

在 `api-demo/server/.env` 中配置：

```text
PORT=3001
LLM_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
LLM_MODEL=mimo-v2.5
LLM_API_KEY=your_api_key
```

`LLM_BASE_URL` 使用 OpenAI-compatible base URL，不要包含 `/chat/completions`。

如果不配置模型环境变量，API 演示版仍然可以通过 fallback 完整运行。

## API 接口

```text
POST http://localhost:3001/api/next
POST http://localhost:3001/api/ending
```

后端会做：

- 请求体基础校验
- 模型调用超时控制
- JSON 解析和 Markdown JSON 提取
- 缺字段自动补齐
- choices 数量修正
- effects 数值范围限制
- scene 白名单限制
- 失败 fallback
- 控制台打印 `[FALLBACK]` 原因

## 打包上传

只打包 `offline/` 内部文件，确保 zip 根目录直接包含 `index.html`：

```bash
cd life-crossroads/offline
zip -r ../life-crossroads-offline.zip .
```

不要直接压缩整个 `offline/` 文件夹，否则 zip 解压后可能变成：

```text
offline/index.html
```

## 后续方向

- 增加更多身份和事件池
- 生成分享海报图片
- 增加结局收藏展示
- 优化移动端横竖屏适配
- 用 GitHub Releases 托管高清演示视频
