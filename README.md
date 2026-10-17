# Easy Tab · 极简新标签页

按《极简新标签页 技术规格说明书 v2》实现的 Chrome Manifest V3 首版，原生 HTML / CSS / ES Modules，无运行时依赖、无构建步骤。

## 安装

1. 下载并解压仓库。
2. 打开 `chrome://extensions`，开启开发者模式。
3. 点击“加载已解压的扩展程序”，选择包含 `manifest.json` 的目录。
4. 新建标签页。可先点击“添加第一个图标”，或在页面右键操作。

## 已实现

- Google / Bing / 搜狗固定循环切换，Enter 在新标签搜索。
- 一级分组、1×1 / 2×2 网格、组内拖动排序、拖到侧栏移动分组。
- 官方 favicon 接口、1 至 3 字文字回退、自定义图片图标。
- 自定义右键菜单与边缘防溢出；输入框保留原生菜单。
- 本地壁纸存 IndexedDB，最长边 1920px、JPEG 0.85；先呈现默认背景再淡入大图。
- 固定模糊、遮罩、圆角、两种版心预设；窄窗分组抽屉；极简模式。
- JSON 导出可选内嵌图片，导入先校验再覆盖或合并；合并重新分配 ID，保留当前设置和壁纸。
- `DataStore`、`WallpaperProvider` 接口，`BingWallpaperProvider` 空壳；同步 / Bing 选项禁用且可见。

## 首版边界

图搜的三家上传端点尚未通过官方站点抓包确认，因此 `verifiedUploads` 均为 `null`。已实现文件 / URL 输入校验、10MB 限制、multipart / base64 表单提交工具及剪贴板降级；当前拖图进入“复制图片并打开图搜”流程，**不宣称三家真实上传已完成**。请按 `docs/IMAGE_SEARCH.md` 抓包验证后启用。远程图片下载受 CORS 和网络限制；失败时提示先保存本地。剪贴板受浏览器策略影响，失败后提供保存图片上传。

100ms 骨架与网格可用是性能目标，尚未完成真实 Chrome 新标签环境的性能验收。搜索框会调用 `focus()`，地址栏是否交出焦点由 Chrome 决定。

## 数据与开发

- `chrome.storage.local`: `appData` 存 `schemaVersion: 1`、分组、有序站点、外观；`devicePrefs` 存引擎、极简、版心。
- IndexedDB `easy-tab-assets` / `blobs`: `wallpaper` 与 `icon:<uuid>` Blob。无 localStorage，无远程脚本。
- 备份封装 `version: 1`、`data`、`prefs`、`assets`。导入禁止非 HTTP(S) 站点地址，禁用 SVG 资产，解码图片后才写入；上限 200 组、10000 站点、120MB JSON。
- 备份可能含私人网址与图片，建议自行保管；不上传云端。
- 图片删除后暂不主动清理未引用 Blob，避免多标签和失败写入误删；后续可增加安全垃圾回收。
- 未来 Sync 按 `group:<id>` 分片、独立组序 key、500ms 防抖，不能把 Blob 放进 sync；当前未接入 sync。

运行 `npm test`（Node.js 20+，不需要 npm install）。手动验收清单见 `docs/ACCEPTANCE.md`。目录中不含 Git 仓库或构建产物。
