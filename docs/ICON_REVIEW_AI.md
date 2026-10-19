# AI 与云产品本地图标评审

## 范围与方法

以本次读取的 `data/sites.json` 166 个站点为白名单：AI 类 15 个，另含 Hugging Face、阿里云、腾讯云、Cloudflare、Vercel、Netlify，共 21 个。没有新增域名。仅修改本评审与 `data/icon-review-ai.json`，不复制图标、不修改站点配置。

检查四个目录：`assets/icons/lobe-icons`、`assets/icons/dashboard-icons/svg`、`assets/icons/simple-icons/icons`、`assets/site-icons`。使用 Python XML 解析真实内容，核对根标签、viewBox、颜色、image 标签及文字源 title；推荐源均为可解析的 SVG，无内嵌 image。文件名只用于发现候选，产品归属结合图形、title 与白名单名称/别名判断；未联网，不对品牌最新版本或商标授权作额外推断。

主图优先原品牌彩色 SVG；Midjourney、Vercel 原本为单色。文字横版允许经典单色字标，`currentColor` 需要使用方提供可见前景色。只保留每产品一个主图及至多一个横版，避免深浅版、单色替代版重复。宽高比使用 viewBox 画布比例，并非自动计算可见路径包围盒。

## 推荐清单

路径均相对仓库根目录。完整路径与逐项理由见 JSON；以下 L 表示 `assets/icons/lobe-icons/`，D 表示 `assets/icons/dashboard-icons/svg/`。

| domain | main | wide | wide viewBox / 宽高比 |
|---|---|---|---|
| chat.deepseek.com | L/deepseek-color.svg | L/deepseek-text.svg | 0 0 131 24 / 5.458 |
| chatgpt.com | D/chatgpt.svg | 缺失，不推荐替代 | — |
| claude.ai | L/claude-color.svg | L/claude-text.svg | 0 0 97 24 / 4.042 |
| gemini.google.com | L/gemini-color.svg | L/gemini-text.svg | 0 0 98 24 / 4.083 |
| copilot.microsoft.com | L/copilot-color.svg | L/copilot-text.svg | 0 0 73 24 / 3.042 |
| midjourney.com | L/midjourney.svg | L/midjourney-text.svg | 0 0 134 24 / 5.583 |
| perplexity.ai | L/perplexity-color.svg | L/perplexity-text.svg | 0 0 117 24 / 4.875 |
| tongyi.aliyun.com | L/qwen-color.svg | L/qwen-text.svg | 0 0 75 24 / 3.125 |
| yiyan.baidu.com | L/wenxin-color.svg | L/wenxin-text.svg | 0 0 47 24 / 1.958 |
| kimi.moonshot.cn | L/kimi-color.svg | L/kimi-text.svg | 0 0 64 24 / 2.667 |
| doubao.com | L/doubao-color.svg | L/doubao-text.svg | 0 0 105 24 / 4.375 |
| chatglm.cn | L/qingyan-color.svg | L/qingyan-text.svg | 0 0 86 24 / 3.583 |
| yuanbao.tencent.com | L/yuanbao-color.svg | L/yuanbao-text.svg | 0 0 92 24 / 3.833 |
| xinghuo.xfyun.cn | L/spark-color.svg | L/spark-text.svg | 0 0 93 24 / 3.875 |
| mistral.ai | L/mistral-color.svg | L/mistral-text.svg | 0 0 134 24 / 5.583 |
| aliyun.com | L/alibabacloud-color.svg | L/alibabacloud-text-cn.svg | 0 0 60 24 / 2.500 |
| cloud.tencent.com | L/tencentcloud-color.svg | L/tencentcloud-text.svg | 0 0 64 24 / 2.667 |
| huggingface.co | L/huggingface-color.svg | L/huggingface-text.svg | 0 0 153 24 / 6.375 |
| cloudflare.com | L/cloudflare-color.svg | L/cloudflare-text.svg | 0 0 242 24 / 10.083 |
| vercel.com | L/vercel.svg | L/vercel-text.svg | 0 0 94 24 / 3.917 |
| netlify.com | D/netlify.svg | 缺失，不推荐替代 | — |

全部 19 个推荐横版比例 ≥ 1.8。文心横版为 47/24 ≈ 1.958，接近门槛但符合要求。

## 缺失与产品边界

- ChatGPT：有经典绿底产品主图，未找到确认属于 ChatGPT 的文字横版。现有 `chatgpt.com-text.svg` 与 Lobe 的 OpenAI 字标对应；不能因 3.583 的合格比例而保留。现有无色结形主图也来自 OpenAI；本次优先产品绿底版本。
- Netlify：Dashboard 彩色 SVG 可用，现有站点为 PNG；Simple Icons 有单色主标，但缺少已确认的文字横版。不用拉伸主图充当 wide。
- 智谱清言：现有主图与横版为 ChatGLM，改推荐 `qingyan-color.svg` / `qingyan-text.svg`。ChatGLM 模型和 Zhipu 公司都不是清言产品。
- 通义：按白名单“通义千问”与 qwen 别名推荐 Qwen。若未来条目改指泛通义门户，必须重审，不能自动认为 Qwen 与整个门户等同。
- Kimi ≠ Moonshot 公司；微软 Copilot ≠ GitHub Copilot；元宝 ≠ 混元；星火 ≠ 讯飞云/Apache Spark；阿里云 ≠ 阿里巴巴/阿里云盘；腾讯云 ≠ 腾讯公司。
- Cloudflare 主品牌不能替换成 Pages、Workers AI 或 cloudflared；Vercel 不能替换成 v0；Hugging Face 保留黄色表情而非泛 AI 图标。

## 文件真实性与排除

Dashboard 的 `claude-ai-light.svg`、`claude-ai-dark.svg` 文件头实际为 PNG（`89504e470d0a1a0a`），排除。此次四目录全量 SVG 内容扫描还发现其他非本任务站点的伪 SVG 和嵌入位图；未将那些文件纳入推荐，也未修改它们。Lobe、Simple Icons 及 site-icons 本次 SVG 解析未发现失败或 image 标签。

AI/云候选中，Dashboard 与 Simple Icons 的同产品主标多与 Lobe 重复；已有经典彩色 Lobe 时不再增加单色、深浅、重绘版本。`assets/site-icons` 中多数本任务 SVG 是 Lobe 的落地副本，推荐保留上游路径方便追溯；不同时列作第二套选择。排除项与理由详见 JSON。

## 验证

JSON 可解析；21 个域名均在基线且无重复；全部 main/wide 路径存在；全部推荐为 SVG 根节点、有有效 viewBox、不含 image；19 个 wide 均满足比例门槛。此评审不更改运行行为，无需运行应用测试。

父代理视觉复核：Kimi 的 Lobe 彩色版为白字蓝点，在浅色背景上不可读，最终主图改用 Dashboard 自带黑底的精确 Kimi 标识；横版仍采用 Kimi 字标。最终选择以 data/icon-selection.json 为准。

后续用户明确指定：ChatGPT 主图改用 Lobe 的 `openai.svg` 单色结形；该人工偏好覆盖本次初始绿色产品标建议。

后续用户明确指定横版：ChatGPT 横版改用 `openai-text.svg`，覆盖初始不配公司字标的建议。
