# AureTab 商店上架调研

核查日期：2026-10-20。以 Google、Microsoft 官方资料为依据；实际注册、验证和支付选项以提交时后台为准。本次已添加 Logo，尚未注册开发者账号或提交审核。

## 账号与手续

| 项目 | Chrome Web Store | Microsoft Edge Add-ons |
| --- | --- | --- |
| 入口 | [开发者后台](https://chrome.google.com/webstore/devconsole/) | [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview) 的 Microsoft Edge 项目 |
| 费用 | 一次性开发者注册费，按 Google 官方说明通常为 US$5，最终以后台支付页为准 | 扩展项目注册免费 |
| 账号 | Google 账号；验证联系邮箱；发布和更新前必须开启两步验证 | 个人 Microsoft 账号 MSA；可选 Individual 或 Company |
| 个人发布 | 可按实际身份注册、申报 | 支持个人开发者，无须为了个人扩展注册公司 |
| 验证 | 如实申报 Trader / Non-trader；Trader 可能需要法定名称、联系方式和身份证明，验证信息向用户展示 | 填写真实地区、发布者名称与联系方式；公司账号需要公司信息及授权联系人验证，补件按后台要求处理 |

Chrome 的 Trader 身份取决于是否以商业、职业等目的提供服务，不能仅凭“个人账号”或“免费插件”决定。Edge 的地区和账号类型注册后不可更改；企业账号验证可能需要数天至数周。

来源：[Chrome 注册](https://developer.chrome.com/docs/webstore/register)、[Google 注册费说明](https://storage.googleapis.com/support-kms-prod/pOoBimb6uEK6GBt3SJxVBoJf0tPzgI89q3yR)、[邮箱验证](https://developer.chrome.com/docs/webstore/set-up-account)、[两步验证](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification)、[Trader 身份](https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure)、[Edge 开发者注册](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)。

## 提交材料与流程

共用准备：根目录含 `manifest.json` 的运行文件 ZIP、名称与介绍、类别和语言、支持联系方式、公开可访问的隐私政策 URL。后台还要填写单一用途、每项权限理由、数据使用方式和远程代码声明，选择发布地区与可见性，再提交审核。

| 图片 | Chrome | Edge |
| --- | --- | --- |
| Logo | 必需，128×128 PNG；方形主体建议 96×96，四侧各留 16px 透明边距 | 每种语言必需；1:1，推荐 300×300，最小 128×128 |
| 截图 | 必需，至少 1 张，最多 5 张；1280×800 或 640×400 | 可选，最多 6 张；1280×800 或 640×480 |
| 小宣传图 | 必需，440×280 | 可选，440×280 |
| 大宣传图 | 可选，1400×560 | 可选，1400×560 |

建议共用 1280×800 的真实功能截图：默认首页、分组与站点、主题设置。Logo PNG 已在 `assets/brand/` 生成；截图和宣传图尚未制作。

Chrome 流程：注册及验证 → 上传 ZIP → 填商店介绍、隐私、分发与测试说明 → 提交审核 → 自动或手动发布。通常数天，也可能数周，不能保证固定日期。Edge 流程：注册及验证 → 新建扩展并上传 ZIP → 填可用性、属性、隐私和商店资料 → 填测试备注 → 提交认证。

来源：[Chrome 发布流程](https://developer.chrome.com/docs/webstore/publish)、[Chrome 图片规格](https://developer.chrome.com/docs/webstore/images)、[Chrome 审核时间](https://developer.chrome.com/docs/webstore/review-process)、[Edge 发布与材料规格](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)。

## 本项目可用的申报内容

以下内容依据当前代码整理，提交者仍需逐项核对后台问题；不能直接把数据使用选项全部勾成“不处理用户数据”。

- **单一用途**：为用户提供可个性化的新标签页，集中进行网页搜索、分组管理常用站点及设置本地壁纸。
- **storage 理由**：在本机保存用户添加的站点、分组、主题和偏好，以便重开新标签页后恢复配置。
- **favicon 理由**：通过浏览器提供的 favicon 接口读取用户添加站点的图标，供新标签页网格展示；远程图标失败时也使用此接口回退。
- **远程代码**：当前运行 JavaScript 随包提供，没有远程脚本执行；远程图片请求应与远程代码执行区分，并在隐私材料中说明。
- **测试步骤**：安装后新建标签页 → 添加站点及分组 → 拖动排序 → 切换主题与本地壁纸 → 导出并导入备份 → 重新打开标签页确认保存；搜索与图片搜索需要网络，无登录账号要求。

`manifest.json` 使用 Manifest V3，只声明 `storage` 和 `favicon`；覆盖 `newtab`。商店介绍要明确“替换浏览器新标签页”，不要宣称会更改地址栏或默认搜索设置。未完成的每日壁纸、云同步和图片自动直传不要列为已支持功能。

## 隐私政策应说明的实际行为

Chrome 官方明确：只在设备上处理或保存用户数据，也需要披露，并为处理用户信息的扩展提供隐私政策。[用户数据政策 FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)

针对当前实现，政策至少说明：

1. 站点名称和网址、分组、设置保存在 `chrome.storage.local`；用户壁纸和上传图标保存在 IndexedDB。当前无开发者服务器同步和统计功能。
2. 内置精选图标来自安装包；清单外站点或主动请求图标时，代码可能将站点域名发送给 Google、DuckDuckGo favicon 服务。第三方同时会收到网络请求通常包含的 IP 等信息，不能声称“完全离线”或“绝不向第三方发送数据”。相关实现见 `js/grid/favicon.js`。
3. 用户提交搜索时，关键词通过 URL 发送到其选择的搜索引擎；相机入口打开官方图搜页面。拖图流程可能读取远程图片、写入剪贴板并打开第三方页面，自动直传目前未启用。相关实现见 `js/search/`。
4. JSON 备份由用户导入、导出，可能包含私人网址及图片；说明备份由用户保管，以及如何删除站点、清除扩展数据或卸载。当前删除图片不保证立即清除未引用 Blob，不要承诺即时物理擦除。
5. 提供维护者的有效联系方式、政策生效日期和更新方式；商店声明、政策文字与实际行为保持一致。

这里是内容清单，尚未作为正式隐私政策发布。可将正式政策托管到公开的 GitHub Pages 等页面，再填入两家后台；不要使用未上线或需要登录的 URL。

## 上架前剩余待办

- [x] 原创品牌 Logo、扩展多尺寸图标、标签页 favicon 和打包接入。
- [ ] 由发布者注册账号，完成邮箱、两步验证、身份申报及后台要求的验证；Chrome 支付注册费。
- [ ] 确认支持邮箱，撰写并公开托管隐私政策，核对数据披露。
- [ ] 准备真实截图及 Chrome 必需的 440×280 宣传图，完成商店介绍。
- [ ] 复核随包第三方图标、壁纸的授权与品牌使用要求；已有许可文件不等于所有第三方商标都获得授权。
- [ ] 在真实 Chrome 和 Edge 中加载发布 ZIP 的解压目录，完成新标签页、favicon、搜索、拖图、导入导出验收；现有自动测试不替代浏览器兼容验收。
- [ ] 运行 `npm test` 和 `npm run package`；默认生成 `/tmp/auretab.zip`。更新已上架版本时递增 manifest 版本，分别提交两家后台。

当前可用同一套源码准备两家商店的候选 ZIP；最终是否需要兼容调整，以两种浏览器的实际验收结果为准。
