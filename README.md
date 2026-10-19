# Easy Tab · 极简新标签页

按《极简新标签页 技术规格说明书 v2》实现的 Chrome Manifest V3 首版，原生 HTML / CSS / ES Modules，无运行时依赖、无构建步骤。

## 安装

1. 下载并解压仓库。
2. 打开 `chrome://extensions`，开启开发者模式。
3. 点击“加载已解压的扩展程序”，选择包含 `manifest.json` 的目录。
4. 新建标签页。可先点击“添加第一个图标”，或在页面右键操作。

## 已实现

- 三引擎点选切换，Enter 在新标签搜索。
- 一级分组、1×1 / 2×1 / 1×2 / 2×2 混合密排网格、组内拖动排序、拖到侧栏移动分组；分组用点击或全屏 ↑ / ↓ 快捷键切换。
- 搜索框上方本地时钟，可切换 12 / 24 小时制、显示或隐藏日期、切换日期格式；图标名称可隐藏。
- 垂直布局保持流式排列（未锁死 38.2vh），常见窗口下书签区重心约在 61%–64%。
- 自定义或清单外站点使用高清 favicon 链（Google 128 / DuckDuckGo / Chrome 本地接口），低于 32px 或全部失败时自动回退文字图标；清单内站点优先读随包图标。
- 添加 / 编辑图标时可请求预览，直接选择带背景、镂空或文字图标；带背景模式填满圆角，镂空模式保留玻璃底板。
- 点击“添加图标”直接打开“从常用站点选择”：左侧顶部固定“自定义图标”，可选择站点或进入手动 / 自定义上传流程；10 类、162 条本地站点，顶部搜索最多 24 条，窄窗分类变为横向标签。
- 选择器图标直接读取 assets/site-icons 下的本地文件（发布包中 155/162 有本地图标，其中 30 个品牌为已入库的 LobeHub SVG，其余为单独打包的 favicon；未入库文件缺失时显示名称首字），不请求远程 favicon，也不打开网页；选中的站点会把本地图标文件名写入站点数据，网格同样优先读取它。
- sites.json 的 icon 字段保存本地文件名；带横版文字标识的品牌另有 iconWide。首次打开选择器才加载清单与选择器模块，新标签页首屏不加载。只有用户主动点“请求图标”时才发起远程预览。
- 横向（2×1）图标优先显示 iconWide 的横版文字标识（如 GitHub、Bing、Claude、Gemini）；没有文字标识的品牌在横向时仍显示原图标。现有旧数据通过本地文件名映射自动获得新 SVG 与横版标识。
- 自定义右键菜单与边缘防溢出；输入框保留原生菜单。
- 本地壁纸按原图存入 IndexedDB，不做缩放或重编码；设置面板建议选择小于 20MB 的图片。先呈现默认背景再淡入大图。
- 固定模糊、遮罩、圆角、两种版心预设、五套可点选全局色彩主题（暗夜极光 / 纯粹极简白 / 极简玻璃白 / 深邃蓝 / 温润米咖）；窄窗分组抽屉。
- 极简模式只淡出顶栏与站点区，搜索内容保持原尺寸平滑移到视口中心；分组标签长按约 300ms 后可拖动排序；全屏 ↑ / ↓ 切换分组，输入搜索框或打开设置 / 菜单 / 弹窗时不生效。
- JSON 导出可选内嵌图片，导入先校验再覆盖或合并；合并重新分配 ID，保留当前设置和壁纸。
- DataStore、WallpaperProvider 接口，BingWallpaperProvider 空壳；同步 / 每日壁纸选项禁用且可见。

## 首版边界

Google 已在用户 Chrome 抓到官方上传请求，但本机跨站复现返回 403；Bing、搜狗尚未抓取。因此 `verifiedUploads` 均为 `null`。已实现文件 / URL 输入校验、10MB 限制、multipart / base64 表单提交工具及剪贴板降级；当前拖图进入“复制图片并打开图搜”流程，**不宣称三家真实上传已完成**。该功能已暂缓实现，研究结论与验证边界见 [研究记录](docs/IMAGE_SEARCH.md)。远程图片下载受 CORS 和网络限制；失败时提示先保存本地。剪贴板受浏览器策略影响，失败后提供保存图片上传。

100ms 骨架与网格可用是性能目标，尚未完成真实 Chrome 新标签环境的性能验收。搜索框会调用 `focus()`，地址栏是否交出焦点由 Chrome 决定。

内置站点清单当前 162 条、10 个分类，域名来自人工整理，尚未逐一联网核验。清单随扩展版本发布，不做自动联网更新；增删前需人工核对域名、分类、别名和本地图标文件，详细规则见 docs/SITES_LIST.md。别名必须唯一；当前已移除 `tb`、`db`、`so`、`dd` 等歧义短别名。选择器图标来自随包发布的本地文件，发布包中 155 个站点有图标（7 个缺图站点显示名称首字）；其中 30 个品牌改用 LobeHub SVG（已入库），其余 favicon PNG/JPG 仍单独打包、未纳入 Git。

未替换的本地图标取自各站点公开的 favicon；少数站点只提供 16 / 32px 源图，放大到选择器尺寸后可能偏软。需要更高清的版本时，应在发布前替换 `assets/site-icons/` 中对应文件，而不是恢复运行时抓取。30 个品牌使用 `assets/icons/lobe-icons/` 的矢量图标，暗色主题下单色标识会自动反转为浅色。

## 第三方图标许可

`assets/icons/group-icons/` 中的分组图标来自 Google [Material Symbols](https://fonts.google.com/icons)，采用 [Apache License 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE) 许可证。上游源码见 [google/material-design-icons](https://github.com/google/material-design-icons)。

界面使用 `favorite`、`stadia_controller`、`home`、`code_xml` 和 `shopping_cart_checkout`；目录另含 `design_services`、`diversity_3`、`smart_display` 三个预留图标。这些图标的许可独立于项目自身代码，不适用于其他目录中的站点 Logo 或 favicon。再分发时须遵守上游许可证，保留适用的版权及许可声明；若修改图标文件，应注明修改。

`assets/icons/lobe-icons/` 来自 [LobeHub Icons](https://github.com/lobehub/lobe-icons) 的 npm 包 `@lobehub/icons-static-svg` 1.95.1，采用 MIT 许可；来源、版本与完整性信息见该目录的 `SOURCE.json`，许可见 `LICENSE`。`assets/site-icons/` 中 30 个受替换品牌的 SVG 由这些文件复制而来。品牌 Logo 的商标权属于对应权利人，MIT 许可不等同于品牌授权。

### Lobe Icons

`assets/icons/lobe-icons/` 中的 AI / LLM 品牌 SVG 图标来自 [Lobe Icons](https://github.com/lobehub/lobe-icons)，使用官方静态包 `@lobehub/icons-static-svg` 1.95.1，采用 MIT 许可证，版权归属 `Copyright (c) 2023 LobeHub`。

完整版权及许可声明保存在 [LICENSE](assets/icons/lobe-icons/LICENSE)，来源、版本和下载完整性信息见 [SOURCE.json](assets/icons/lobe-icons/SOURCE.json)。素材未经修改；复制或再分发时须保留版权及许可声明。品牌 Logo 的商标权属于对应权利人，MIT 许可不等同于品牌授权。

### Dashboard Icons

`assets/icons/dashboard-icons/` 来自 [homarr-labs/dashboard-icons](https://github.com/homarr-labs/dashboard-icons)，项目采用 Apache License 2.0，版权声明为 `Copyright (c) 2024 Bjorn Lammers, Meier Lukas, Thomas Camlong and Homarr Labs`。通过官方仓库固定提交的归档下载，未逐图请求网站；素材保持原样。完整许可、上游说明和元数据随目录保存，固定提交及校验值见 `SOURCE.json`。

再分发须提供许可证、保留适用声明；修改文件须注明修改，并保留上游适用的 NOTICE（如有）。[网站条款](https://dashboardicons.com/terms) 明确第三方图标可能有独立版权、许可、署名及品牌要求，仓库 Apache 2.0 不覆盖或替代这些要求，也不授予品牌商标权。

### Simple Icons

`assets/icons/simple-icons/` 来自 [Simple Icons](https://github.com/simple-icons/simple-icons) 官方 npm 包 `simple-icons` 16.35.0，采用单个发布包下载，SVG 未修改。集合采用 CC0 1.0，但**并非所有单个品牌图标均为 CC0**。完整集合许可见 `LICENSE.md`，上游免责声明见 `DISCLAIMER.md`，每个图标已知的许可、品牌规范及来源见 `data/simple-icons.json`；版本与完整性信息见 `SOURCE.json`。

使用和再分发具体图标时须核对其独立许可、署名与品牌规范。缺少单图许可字段不表示不存在限制；CC0 不授予商标权。本次仅归档素材及已知许可信息，尚未逐一核验各品牌外部条款，也未接入界面。

## 数据与开发

- `chrome.storage.local`: `appData` 存 `schemaVersion: 1`、`revision`（多标签冲突检测）、分组、有序站点、外观；`devicePrefs` 存引擎、极简、版心。
- IndexedDB easy-tab-assets / blobs：保存 wallpaper 与 icon:<uuid> Blob；选择器图标改为本地文件，不再使用 icon-cache。壁纸压缩写入超时会回退保存原始文件。
- 站点选择器清单 data/sites.json：纯文本 categories + sites，不含任何 Logo、图片或 base64；分类 id 唯一，每类 12–20 条，总数不超过 200。
- 备份封装 `version: 1`、`data`、`prefs`、`assets`。导入禁止非 HTTP(S) 站点地址，禁用 SVG 资产，解码图片后才写入；上限 200 组、10000 站点、120MB JSON。
- 备份可能含私人网址与图片，建议自行保管；不上传云端。
- 清单外站点或用户主动点“请求图标”时，会依次尝试 Google 与 DuckDuckGo 的公开 favicon 服务，再回退 Chrome 本地接口；离线或失败时使用文字图标。通过选择器新增的清单内站点默认不发起这些请求。
- 图片删除后暂不主动清理未引用 Blob，避免多标签和失败写入误删；后续可增加安全垃圾回收。
- 未来 Sync 按 `group:<id>` 分片、独立组序 key、500ms 防抖，不能把 Blob 放进 sync；当前未接入 sync。

运行 `npm test`（Node.js 20+，不需要 npm install）。GitHub Actions [test.yml](.github/workflows/test.yml) 会执行语法检查与全部测试。手动验收清单见 `docs/ACCEPTANCE.md`。目录中不含构建产物。

### 图标分类与铺满

默认按四条边中点的 2×2 像素平均 alpha（严格大于 200）判断：四边均实心时铺满，否则保留镂空留白。分类使用 32×32 画布，缓存保存 Blob、kind、v: 2 和原图尺寸；旧版缓存从 Blob 重新分类，任一边不足 32px 回退文字。手动“实心铺满 / 镂空 / 文字”优先，上传图标保留 PNG 透明度；未设置 iconStyle 代表自动，已有手动样式保留。缓存独立于备份所引用的图片，不新增扩展权限。

桌面两种版心共用 min(61.8vw, 1200px) 容器、145px 侧栏和38px列间距，时钟、搜索行和标签网格在同一主列；搜索行含圆形按钮，与网格共用左右边界。居中均分外侧留白，黄金左留白为剩余空间的0.382；窄窗仍使用原抽屉。书签在限高容器内优先滚动，滚轮只滚动网格，不切换分组。分组通过点击侧栏、长按拖动排序，以及全屏 ↑ / ↓ 快捷键切换（输入搜索框或打开设置、菜单、弹窗时快捷键不接管，不首尾循环）。已浏览分组保留 DOM，图片分类和解码结果在页面内复用；编辑、排序、导入等数据变化会更新相关组视图。


搜索框相机按钮直接打开当前引擎的官方图搜页面；拖入网页图片时优先提取实际图片地址，仍走“复制图片并打开图搜”，到官方页面相机入口粘贴。Google 官方上传成功、跨站直传复现返回 403；三家自动直传仍未启用。剪贴板失败可保存上传，网页图片因 CORS 读取失败可先保存再打开图搜页面。修复记录见 docs/IMAGE_SEARCH.md。
