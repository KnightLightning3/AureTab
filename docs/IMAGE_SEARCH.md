# 图搜接口接入记录

Google 已在用户 Chrome 中抓取并复现；官方页上传成功，跨站直传复现返回 403。其余引擎未抓取。

| 引擎 | 上传 URL / 字段 / 参数 / Cookie 条件 | 抓取日期 | 状态 |
| --- | --- | --- | --- |
| Google Lens | POST `https://lens.google.com/v3/upload`；官方文件输入 `encoded_image`；详见下方 | 2026-10-18 | 官方上传成功；跨站复现 403，直传禁用 |
| Bing Visual Search | 待抓包 | 未抓取 | 降级可用，上传禁用 |
| 搜狗识图 | 待抓包 | 未抓取 | 降级可用，上传禁用 |

## 接入步骤

1. 在官方图搜页面打开 DevTools Network，上传不含私人信息的小图片。
2. 记录 URL、请求方法、multipart 字段名或 base64 编码、额外参数、重定向行为、Cookie / 同意页依赖。
3. 将复现所需的公开参数填入 `js/search/imageSearch.js` 的 `verifiedUploads`，写明实际抓取日期 `capturedAt` 和代码注释；不要提交 Cookie 或凭证。
4. 验证隐藏表单确实能从扩展页面提交到新标签页；若存在 CSP 或服务端限制，调整适配器且保留降级。不要把网络请求完成等同于成功识图。
5. 每家分别测本地图片、网页图片、超限文件、非图片、断网、剪贴板拒绝、首次同意页。只有确认后才把该 adapter 的 `verified` 标为 true。

远程 URL 下载和 base64 转换是异步操作，不能保证原 drop 手势仍有效。降级按钮使用新的显式点击手势打开官方页面并尝试复制；不申请 `clipboardWrite` 或广泛 `host_permissions`。提交完成无法跨域检查最终结果，需保留用户主动降级入口。


## 2026-10-18 入口与降级修复

- 搜索框右侧改为本地相机 SVG 按钮，点击选择图片；文字输入仍由 Enter 搜索。
- 拖图同步读取 DataTransfer，支持 files / items、text/html 中的实际 img src、uri-list 与纯文本图片地址。优先取图片 src，避免把外层文章链接当作图片；相对 src 用 uri-list 基址解析。
- 本地文件和下载内容均限制 10MB，空图片、非图片及非 HTTP(S) 链接会给出提示；下载仍受 CORS 限制，不新增 host_permissions。
- 剪贴板写入在打开外站之前发起，保留用户点击手势；新页被拦截时保留图片和重试入口。无法复制时仍可保存图片并手动上传，下载文件补上扩展名。网页下载失败时不再只留下两个禁用按钮，始终提供“打开图搜页面”。
- Google 导航入口改为 https://www.google.com/imghp?hl=zh-CN 。此前 https://lens.google/ 已跳到介绍页，参考[Google Lens 页面](https://lens.google/)；已在官方 Google 图片页确认相机弹层和 encoded_image 文件输入。但文件上传测试等待超时，未取得完整上传 URL、参数及结果验证，**verifiedUploads 三项继续为 null，不宣称自动上传已修复**。
- 产品可用路径：拖图 / 相机选文件 → 复制图片并打开图搜 → 在官方相机入口粘贴，或保存图片后上传。

验证：npm test 共 41 项通过，新增图片来源提取、大小/类型限制、流式下载截断、剪贴板与导航调用顺序及弹窗拦截测试。本机测试页派发含真实 PNG 的 drop 事件，已确认识图对话框与三个操作按钮；相机 SVG 实际显示正常。截图见 [image-search-flow.jpg](image-search-flow.jpg)。跨网页原生拖拽、真实 Chrome 新标签页的剪贴板策略及三家最终识图结果仍待实机验收。


## 2026-10-18 用户 Chrome 抓取与复现

- 官方入口：Google Images → Search by image → upload a file。上传生成的 256×256 测试 PNG（绿色方块、浅色圆形和 Easy Tab test 文字），已进入 Google Search 的 Visual matches，结果也识别出了测试文字与图形。
- Network 实际捕获：`POST https://lens.google.com/v3/upload`，查询参数名为 `ep`、`st`、`authuser`、`hl`、`vpw`、`vph`；`ep=gsbubb`，Content-Type 为 multipart/form-data，响应 303，后续导航到 Google 识图结果。官方文件输入名为 `encoded_image`。导出的脱敏 HAR 没有请求体，因此没有声称已穷尽全部表单字段。
- 在同一个 Chrome、同一登录环境，用本机测试页导入项目的 `submitMultipart`，以真实 DataTransfer / File 提交相同 PNG：只带 `ep=gsbubb` 返回 403；补齐上述公开查询参数（时间戳重新生成）仍返回 403。证据见 [Google 403 复现截图](google-upload-403.png)。
- 结论：抓到的官方网页端点不能据此认定为可供扩展调用的外部接口。403 的具体原因尚未确认，可能涉及来源或其他服务端校验；不复制 Cookie、不伪造来源，也不猜测替代端点。`verifiedUploads.google` 保持 null，防止用户拖图后进入已知失败页。
- 本轮未验证 chrome-extension 来源的直接提交，未验证匿名环境或首次同意页。实际拖拽由用户验收。现有可用路线仍是拖图 / 相机选文件 → 复制图片并打开 Google 图片页 → 相机入口粘贴，或保存后上传。
- `npm test`：45 项通过，包含 Luna 补充的 multipart 请求构造、同步提交与清理测试，以及已拒绝 / 未验证引擎不得创建提交表单的回归测试。没有新增权限或依赖。原始 HAR 仅存于临时目录，不提交 Cookie、账号或会话标识。
