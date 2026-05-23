# 离线上传版

这是《一分钟人生岔路口》的上传稳定版。

## 特点

- 入口文件：`index.html`
- 单文件实现，CSS 和 JS 全部内联
- 无网络请求
- 无外部资源引用
- 不依赖后端或大模型服务
- 内置 5 个身份、至少 40 个事件、至少 15 个结局
- 适合抖音互动空间上传

## 运行方式

直接用浏览器打开：

```bash
life-crossroads/offline/index.html
```

刷新页面即可重新开始。

## 打包方式

请进入 `offline` 目录后打包内部文件，确保 zip 根目录直接包含 `index.html`：

```bash
cd life-crossroads/offline
zip -r ../life-crossroads-offline.zip .
```

不要直接压缩整个 `offline/` 文件夹，否则上传包解压后可能是：

```text
offline/index.html
```

平台通常要求 zip 根目录直接包含：

```text
index.html
```

## 上传前检查

- `index.html` 可以离线打开并完整玩完 6 步。
- 运行时不会发起网络请求。
- 不调用 `fetch`、`XMLHttpRequest`、`WebSocket` 或第三方请求库。
- 不引用外部 `script`、`link`、`img`、`audio` 等资源。
- zip 体积小于 8MB。
