# 图标精选与封装报告

本轮由三个 DeepSeek Flash 子代理分别审查 AI/云品牌、常用网站、运行时迁移，父代理执行批量检测、可视检查和最终整合。审查限定在现有市场的 **166 个站点**；7-Zip 等库内非白名单产品不进入插件资源。白名单保存在 `data/icon-whitelist.json`，源库保持 Git 忽略，未删除或修改源库。

## 结果

- 原始扫描 8,255 个图像文件；初始快照有 143 组字节重复，共 147 份冗余副本。
- 白名单初选 451 个候选，另按人工审查补充精确产品候选。图片头、SVG 根节点、实际宽高/纵横比、SHA-256、SVG 几何签名共同参与检测；可选 Sharp 渲染生成 alpha/亮度边缘近似指纹。
- 最终 **149 个站点有主图标、32 个有横版**。每产品最多保留一个主图和一个横版；npm 主图本身即横版，两种用途共用同一文件。
- `assets/site-icons/` 共 **180 个图片文件、418,164 字节（约 408.4 KiB）**；与初始市场副本比较移除 47 份过时/重复/不适用文件。源库中的其他颜色和重复版本原样保留，不纳入封装。
- 38 个源文件未通过结构检查，包括 16 个扩展名为 SVG、内容却是 PNG 的文件，另有活动/外部内容或缺少有效比例等情况。没有用这些文件冒充矢量。
- 7 个原 favicon 小于既有渲染器最低 32px，未放大冒充清晰图片，改为文字占位；它们计入下表 17 个待补素材站点。

## 选择原则

1. 精确产品优先：QQ 企鹅不能替代 QQ 邮箱、淘宝不能替代天猫、默认不以公司字标代替产品横版；ChatGPT 现按用户明确指定使用 OpenAI 标识和字标。
2. 在正确品牌内优先可缩放矢量和经典色；保留清晰的现有彩色 favicon，避免仅为矢量而变成陌生的单色款。SVG 的 viewBox 数值大小不代表分辨率。
3. Kimi 的白字彩色 SVG 在白底不可读，最终主图选择自带黑底的精确 Kimi 版本。其他单色图标通过既有对比度逻辑适配背景。
4. 横版须实际画布宽高比至少 1.8，渲染有效内容比例至少 1.6（有渲染指标时）；不得靠 CSS 拉伸方形图标。用于当前数据模型的 `2×1` 横向尺寸，`1×2` 仍指纵向。
5. 形状相近只是复核线索，不跨品牌自动合并。物理 SHA-256 相同的已选图共用一份文件；没有生成重编码或修改图像内容的版本。
6. 插件只请求 `assets/site-icons/` 下的精选副本。兼容映射将旧库路径和旧文件名迁移到精选副本；没有合适副本的旧选择走原有文字/请求回退。

## 待补素材

| 站点 | 域名 | 当前处理 |
| --- | --- | --- |
| QQ邮箱 | mail.qq.com | 文字占位；缺少精确资源或现有位图不足 32px |
| 网易163邮箱 | mail.163.com | 文字占位；缺少精确资源或现有位图不足 32px |
| 咪咕视频 | miguvideo.com | 文字占位；缺少精确资源或现有位图不足 32px |
| 人民网 | people.com.cn | 文字占位；缺少精确资源或现有位图不足 32px |
| 36氪 | 36kr.com | 文字占位；缺少精确资源或现有位图不足 32px |
| 界面新闻 | jiemian.com | 文字占位；缺少精确资源或现有位图不足 32px |
| 天猫 | tmall.com | 文字占位；缺少精确资源或现有位图不足 32px |
| WPS | wps.cn | 文字占位；缺少精确资源或现有位图不足 32px |
| 学习强国 | xuexi.cn | 文字占位；缺少精确资源或现有位图不足 32px |
| 携程 | ctrip.com | 文字占位；缺少精确资源或现有位图不足 32px |
| 网易 | 163.com | 文字占位；缺少精确资源或现有位图不足 32px |
| 第一财经 | yicai.com | 文字占位；缺少精确资源或现有位图不足 32px |
| 酷狗音乐 | kugou.com | 文字占位；缺少精确资源或现有位图不足 32px |
| 脉脉 | maimai.cn | 文字占位；缺少精确资源或现有位图不足 32px |
| 唯品会 | vip.com | 文字占位；缺少精确资源或现有位图不足 32px |
| 当当 | dangdang.com | 文字占位；缺少精确资源或现有位图不足 32px |
| 盒马 | freshippo.com | 文字占位；缺少精确资源或现有位图不足 32px |

这些站点仍保留在市场中，没有因为缺图而下架；可上传或主动请求图标。报告不是各品牌外部授权或网站活跃状态的逐项核验。

## 可复用工具

- `scripts/curate-icons.py analyze`：仅本地扫描，生成 inventory、candidates、summary 和 render-input 到指定工作目录，默认 `/tmp/easy-tab-icon-audit`。依赖 Python 3 和 Pillow。
- `node scripts/icon-metrics.cjs /tmp/easy-tab-icon-audit/render-input.json /tmp/easy-tab-icon-audit/metrics.json`：批量渲染及大致形状比较。需要可由 Node 解析到的 `sharp`（可通过 `NODE_PATH` 指定其 node_modules）。
- 两份人工推荐表：`data/icon-review-ai.json`、`data/icon-review-web.json`。先核对推荐，随后 `python3 scripts/curate-icons.py apply` 复制选中资源、去重、写入引用及许可。此步骤需要本地原始资源库。
- `node scripts/icon-contact-sheet.cjs`：渲染精选主图联系表，方便人工视觉复核。需要 Sharp；遇到 ICO 用 Pillow 临时解码。
- `npm run icons:refresh`：仅由 `data/icon-selection.json` 重建运行时索引和兼容映射，**不需要原始资源库**。
- `npm run package`：生成 `/tmp/auretab.zip`。只纳入运行时文件和版权资料，明确排除三个原始资源库、审查报告、脚本与测试。也可用 `python3 scripts/package-extension.py --output <目标路径>` 指定输出。

来源、逐图 SHA-256、尺寸、选择理由、相同几何/近似形状对比和旧文件迁移表见 `data/icon-selection.json`。初始审查建议仅供追溯，最终选择以该文件为准。每次扩充白名单后应先重跑本地审查，再发布封装包。

## 许可文件

实际插件随 `assets/site-icons/NOTICE.md`、`licenses/selected-icons.json`、三库完整许可和 Simple Icons 已选图标元数据发布。源库许可证也已复制出 Git 忽略目录，因此干净检出和封装不依赖被忽略文件。保留原 favicon 的第三方权利说明；图标集合许可证不替代品牌自身的版权、商标或使用规范。

用户指定更新：ChatGPT 主图现使用 `assets/icons/lobe-icons/openai.svg` 的原始字节，封装为 `assets/site-icons/chatgpt.com.svg`；横版亦按用户指定使用 `openai-text.svg`，封装为 `chatgpt.com-text.svg`。
