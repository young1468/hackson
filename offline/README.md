# 离线展示版

这是《一分钟人生岔路口》的离线展示版，入口是 `index.html`。

## 当前文件

```text
offline/
  index.html
  css/style.css
  js/game.js
  js/particles.js
  audio/bgm.mp3
```

## 特点

- Cyber Canvas 竖屏界面
- 本地剧情池和结局池
- 5 个身份、6 步选择、4 项属性
- 本地背景音乐和粒子效果
- 不依赖后端或 API Key

## 运行

```bash
cd life-crossroads/offline
python -m http.server 5173
```

访问：

```text
http://localhost:5173
```

## 打包

请进入 `offline` 目录后打包内部文件，确保 zip 根目录直接包含 `index.html`：

```bash
cd life-crossroads/offline
zip -r ../life-crossroads-offline.zip .
```

不要直接压缩整个 `offline/` 文件夹，否则上传包解压后可能是：

```text
offline/index.html
```

## 上传前检查

- `index.html` 可以完整跑通游戏。
- zip 根目录直接包含 `index.html`。
- 打包时包含 `css/`、`js/`、`audio/`。
- 如果平台严格禁止任何外链，请检查 `index.html` 中的字体引用，必要时移除；系统字体可以正常兜底。
