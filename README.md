# 一分钟人生岔路口：AI 平行人生生成器

一个面向抖音互动空间 Hackathon 的 HTML5 移动端互动剧情 Demo。用户会在一分钟内随机进入一种人生身份，连续做出 6 次选择，每次选择都会改变心态、钱包、运气和离谱值，最终得到一个荒诞但适合分享的人生结局。

## 1. 项目介绍

游戏名称：《一分钟人生岔路口》

一句话介绍：6 次选择，生成你的一分钟平行人生。

核心身份：

- 大学生
- 社畜
- 创业者
- 猫
- 外星人

核心属性：

- 心态 `mood`
- 钱包 `money`
- 运气 `luck`
- 离谱值 `crazy`

## 2. 两个版本区别

`offline/` 是上传稳定版：

- 单文件 `index.html`
- 使用 Canvas 视觉版交互界面
- 纯离线运行
- 不依赖后端
- 不引用外部资源
- 内置剧情池和结局池，模拟 AI 生成效果
- 适合抖音互动空间上传

`api-demo/` 是现场演示版：

- 前端体验接近离线版
- 后端通过本地接口调用大模型
- API Key 只存在后端环境变量
- 大模型不可用时自动使用 fallback 剧情
- 适合现场讲解“AI 实时生成分支剧情”的创新点

## 3. 为什么做离线版和 API 演示版

抖音互动空间上传通常更重视稳定性、体积、离线可运行和入口规范，所以离线版必须不依赖任何网络或第三方服务。

Hackathon 现场展示则需要体现 AI 生成能力，所以 API 演示版把大模型能力放在本地后端中，既能展示实时生成，又不会把 API Key 暴露到前端。

这两个版本互不影响：离线版负责稳定交付，API 演示版负责增强展示。

## 4. 如何运行 offline 版

直接用浏览器打开：

```bash
life-crossroads/offline/index.html
```

也可以进入目录后用任意本地静态服务器打开。

## 5. 如何运行 api-demo 版

启动后端：

```bash
cd life-crossroads/api-demo/server
npm install
npm start
```

启动前端静态服务：

```bash
cd life-crossroads/api-demo/frontend
python -m http.server 5173
```

访问：

```text
http://localhost:5173
```

不建议直接双击 `api-demo/frontend/index.html`，部分浏览器在 `file://` 页面下会限制跨源请求。

## 6. 如何配置环境变量

复制示例文件：

```bash
cd life-crossroads/api-demo/server
cp .env.example .env
```

配置：

```text
PORT=3001
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=your_api_key
```

`LLM_BASE_URL` 使用 OpenAI-compatible base URL，不要包含 `/chat/completions`。

如果不配置环境变量，后端会直接返回 fallback 剧情，Demo 仍然可以完整运行。

## 7. 如何打包上传抖音互动空间

只打包 `offline/` 内部文件，确保 zip 根目录直接包含 `index.html`：

```bash
cd life-crossroads/offline
zip -r ../life-crossroads-offline.zip .
```

不要直接压缩整个 `offline/` 文件夹，否则解压后可能变成：

```text
offline/index.html
```

平台通常要求 zip 根目录直接有：

```text
index.html
```

## 8. 可行性说明

- 离线版是单文件 HTML，体积远小于 8MB。
- 所有 UI、CSS、剧情数据和逻辑都在本地。
- 游戏流程固定为 6 步，状态管理简单，适合移动端稳定体验。
- 属性变化全部限制在 `0-100`，不会出现异常数值。
- 即使某个属性降到 `0`，游戏仍会完成 6 步，并在结局中体现崩坏状态。

## 9. 鲁棒性设计

离线版：

- 每轮选择后立即锁定按钮，避免连点导致重复结算。
- 每局从身份事件池随机抽取 6 个不重复事件。
- 结局根据最终属性匹配，匹配不到时随机兜底。
- 分享复制失败时自动选中文案，提示用户手动复制。

API 演示版：

- 前端请求失败时自动使用本地 fallback。
- 后端对请求体做基础校验。
- 后端调用模型失败、超时、解析失败时返回 fallback。
- 后端会修正模型输出字段、选择数量、effects 数值和 scene。
- 后端不记录 API Key。

## 10. 后续可扩展方向

- 增加更多身份和事件池。
- 根据选择历史生成更强的个性化结局。
- 增加分享海报生成。
- 增加音效和震动反馈。
- 接入埋点分析不同选项的选择率。
- 增加多语言版本或方言版本。
