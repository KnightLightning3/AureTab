# 常用网站图标本地审查

基线：`data/sites.json` 共 166 站；读取快照 SHA-256 `858d684407d7e8f731f311667717d6e77242a7e49365c3c09cabe38ee977a6be`。只提供审查建议，不修改白名单、业务代码或资源。未联网、未复制图标。

范围：143 个非 AI、非云/Hugging Face 站点。云平台、部署平台及两款网盘均交由云审查，Docker Hub 按开发镜像仓库纳入。范围外域名逐项列在 JSON exclusions。

## 方法与限制

批量遍历三个库的全部 SVG：Lobe 950、Dashboard 3650、Simple 3466；另核对现有 site-icons 的63个 SVG。读取实际文件头并解析 XML 根节点和 viewBox，不按文件名后缀信任格式。Dashboard 有16个伪 SVG，具体路径和头信息见 JSON。三个库仅 Dashboard 另有1个 PNG；无精确邮箱补充资源。所有推荐 SVG 均为有效 XML 且不含 image 嵌入位图。

现有位图经 Pillow 解码、读取真实尺寸并以整张联系表检查品牌外观。SVG 通过品牌精确名称、路径/title、常规色与几何信息比对；未逐个渲染全部 SVG，不能替代品牌方最新视觉规范核验。Simple Icons 全为24×24方形 viewBox，因此即便内部是字标也不当作横版。SVG 是可缩放矢量，viewBox数值大小不代表分辨率优劣。

wide 必须为独立、真正的品牌字标/组合标，实际 viewBox 宽高比≥1.8；不以 CSS 拉伸或方形画布里的扁字标充数。仅推荐12份。没有 wide 表示未找到足够合适的候选。

## 重点结论

- Gmail：Dashboard gmail.svg 是多色 M 信封，精确 Gmail，优于单色 Simple Icons；现有副本也可保留。
- QQ邮箱：现有副本实际是 QQ 企鹅；缺少精确邮箱图标，main:null。
- 网易163邮箱：缺图，main:null；网易云音乐/网易新闻均不替代。
- 天猫：现有图为淘宝“淘”字，main:null。网易门户现有图明确带 NEWS，暂不以新闻产品替代门户。WPS 现有黑底圆圈 W 品牌无法确认，暂留空。
- PyPI、Iconify 改用可缩放的同品牌 SVG；父代理复核后确认，不应仅凭立方体或房屋 i 的外形判断原 favicon 品牌错误。
- eBay 有效 SVG 缺 viewBox，不作为 wide；Spotify 两个 wordmark 实际为 PNG，排除。

## 市场白名单常用性观察

当前166站未发现明确垃圾、占位或明显无关站点；不能仅凭本地资料认定流量/活跃状态。CodeSandbox、V2EX、Hacker News、Iconify、蓝湖、即时设计、学堂在线、中国大学MOOC属于专业或特定人群常用；脉脉、盒马、咪咕视频也更偏场景，不等同于大众通用入口。它们可作为后续用户群定位讨论项，不建议据此直接删站。未作任何站点删除，也未引入库内大量自托管/小众软件。

## 逐站建议

| 域名 | main | wide | 理由 |
| --- | --- | --- | --- |
| mail.google.com | `assets/icons/dashboard-icons/svg/gmail.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| mail.qq.com | 缺图 null | — | 未找到精确 QQ 邮箱图标；现有 mail.qq.com.svg 与 dashboard qq.svg 是 QQ 企鹅，属于另一产品，不替代。 |
| mail.163.com | 缺图 null | — | 三个库及现有资源均无精确网易163邮箱图标；不以网易门户或网易云音乐代替。 |
| google.com | `assets/icons/lobe-icons/google-color.svg` | `assets/icons/lobe-icons/google-brand-color.svg` | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 24 24。 可选横版 viewBox=0 0 77 24，比例 3.208。 |
| bing.com | `assets/icons/lobe-icons/bing-color.svg` | `assets/icons/lobe-icons/bing-text.svg` | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 24 24。 可选横版 viewBox=0 0 44 24，比例 1.833。 |
| baidu.com | `assets/icons/lobe-icons/baidu-color.svg` | `assets/icons/lobe-icons/baidu-brand-color.svg` | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 24 24。 可选横版 viewBox=0 0 72 24，比例 3.000。 |
| sogou.com | `assets/icons/simple-icons/icons/sogou.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| duckduckgo.com | `assets/icons/dashboard-icons/svg/duckduckgo.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| quark.cn | `assets/site-icons/quark.cn.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 48×48；不放大冒充高分辨率。 |
| bilibili.com | `assets/icons/lobe-icons/bilibili-color.svg` | `assets/icons/lobe-icons/bilibili-text.svg` | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 24 24。 可选横版 viewBox=0 0 52 24，比例 2.167。 |
| iqiyi.com | `assets/site-icons/iqiyi.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| v.qq.com | `assets/site-icons/v.qq.com.jpg` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| youku.com | `assets/site-icons/youku.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| mgtv.com | `assets/site-icons/mgtv.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| ixigua.com | `assets/site-icons/ixigua.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| youtube.com | `assets/icons/dashboard-icons/svg/youtube.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 76.8 512 358.4。 |
| netflix.com | `assets/icons/dashboard-icons/svg/netflix.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=114.86 -0.13 282.24 512.28。 |
| twitch.tv | `assets/icons/dashboard-icons/svg/twitch.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=31.28 -0.01 449.33 512。 |
| douyin.com | `assets/site-icons/douyin.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| kuaishou.com | `assets/icons/simple-icons/icons/kuaishou.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| miguvideo.com | 缺图 null | — | 三个本地库与现有 site-icons 未找到精确品牌资源；缺图，不借用同公司其他产品。 |
| yangshipin.cn | `assets/site-icons/yangshipin.cn.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 48×48；不放大冒充高分辨率。 |
| weibo.com | `assets/icons/dashboard-icons/svg/weibo.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 1080 1080。 |
| zhihu.com | `assets/icons/simple-icons/icons/zhihu.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| douban.com | `assets/icons/simple-icons/icons/douban.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| xiaohongshu.com | `assets/icons/simple-icons/icons/xiaohongshu.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| weixin.qq.com | `assets/icons/dashboard-icons/svg/wechat.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 24 24。 |
| x.com | `assets/icons/dashboard-icons/svg/x.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| facebook.com | `assets/icons/dashboard-icons/svg/facebook.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| instagram.com | `assets/icons/dashboard-icons/svg/instagram.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| reddit.com | `assets/icons/dashboard-icons/svg/reddit.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| discord.com | `assets/icons/dashboard-icons/svg/discord.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0.02 57.8 511.92 396.3。 |
| telegram.org | `assets/icons/dashboard-icons/svg/telegram.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| linkedin.com | `assets/icons/dashboard-icons/svg/linkedin.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| pinterest.com | `assets/icons/dashboard-icons/svg/pinterest.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| tieba.baidu.com | `assets/site-icons/tieba.baidu.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| thepaper.cn | `assets/site-icons/thepaper.cn.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| news.cn | `assets/site-icons/news.cn.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| people.com.cn | 缺图 null | — | 三个本地库与现有 site-icons 未找到精确品牌资源；缺图，不借用同公司其他产品。 |
| cctv.com | `assets/site-icons/cctv.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| 36kr.com | 缺图 null | — | 三个本地库与现有 site-icons 未找到精确品牌资源；缺图，不借用同公司其他产品。 |
| sspai.com | `assets/site-icons/sspai.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 64×64；不放大冒充高分辨率。 |
| huxiu.com | `assets/site-icons/huxiu.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 100×100；不放大冒充高分辨率。 |
| jiemian.com | `assets/site-icons/jiemian.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 16×16；不放大冒充高分辨率。 |
| bbc.com | `assets/site-icons/bbc.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| nytimes.com | `assets/site-icons/nytimes.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| taobao.com | `assets/icons/simple-icons/icons/taobao.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| tmall.com | 缺图 null | — | 现有 tmall.com.jpg 实际为橙色“淘”字淘宝图标；未找到精确天猫候选。 |
| jd.com | `assets/site-icons/jd.com.ico` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 96×96；不放大冒充高分辨率。 |
| pinduoduo.com | `assets/site-icons/pinduoduo.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 48×48；不放大冒充高分辨率。 |
| amazon.com | `assets/icons/dashboard-icons/svg/amazon.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| ebay.com | `assets/icons/simple-icons/icons/ebay.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| goofish.com | `assets/site-icons/goofish.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| 1688.com | `assets/site-icons/1688.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 64×64；不放大冒充高分辨率。 |
| github.com | `assets/icons/lobe-icons/github.svg` | `assets/icons/lobe-icons/github-text.svg` | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 24 24。 可选横版 viewBox=0 0 78 24，比例 3.250。 |
| gitlab.com | `assets/icons/dashboard-icons/svg/gitlab.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=93.97 97.52 192.05 184.99。 |
| gitee.com | `assets/icons/simple-icons/icons/gitee.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| stackoverflow.com | `assets/icons/simple-icons/icons/stackoverflow.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| developer.mozilla.org | `assets/icons/simple-icons/icons/mdnwebdocs.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| npmjs.com | `assets/icons/dashboard-icons/svg/npm.svg` | `assets/icons/dashboard-icons/svg/npm.svg` | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 18 7。 可选横版 viewBox=0 0 18 7，比例 2.571。 |
| pypi.org | `assets/icons/simple-icons/icons/pypi.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| hub.docker.com | `assets/icons/dashboard-icons/svg/docker.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=-0.07 71.3 511.97 369.5。 |
| juejin.cn | `assets/icons/simple-icons/icons/juejin.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| csdn.net | `assets/icons/simple-icons/icons/csdn.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| v2ex.com | `assets/icons/simple-icons/icons/v2ex.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| news.ycombinator.com | `assets/icons/dashboard-icons/svg/hacker-news.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| leetcode.com | `assets/icons/dashboard-icons/svg/leetcode.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 94 110.92。 |
| codesandbox.io | `assets/icons/simple-icons/icons/codesandbox.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| figma.com | `assets/icons/lobe-icons/figma-color.svg` | `assets/icons/lobe-icons/figma-text.svg` | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 24 24。 可选横版 viewBox=0 0 70 24，比例 2.917。 |
| dribbble.com | `assets/icons/simple-icons/icons/dribbble.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| behance.net | `assets/icons/dashboard-icons/svg/behance.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 1080 1080。 |
| canva.com | `assets/site-icons/canva.com.jpg` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| zcool.com.cn | `assets/icons/simple-icons/icons/zcool.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| huaban.com | `assets/site-icons/huaban.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| unsplash.com | `assets/icons/simple-icons/icons/unsplash.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| pexels.com | `assets/icons/simple-icons/icons/pexels.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| notion.so | `assets/icons/lobe-icons/notion.svg` | `assets/icons/lobe-icons/notion-text.svg` | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 24 24。 可选横版 viewBox=0 0 87 24，比例 3.625。 |
| feishu.cn | `assets/site-icons/feishu.cn.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| dingtalk.com | `assets/site-icons/dingtalk.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| work.weixin.qq.com | `assets/site-icons/work.weixin.qq.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 48×48；不放大冒充高分辨率。 |
| docs.qq.com | `assets/site-icons/docs.qq.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| shimo.im | `assets/site-icons/shimo.im.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| yuque.com | `assets/site-icons/yuque.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 200×200；不放大冒充高分辨率。 |
| trello.com | `assets/icons/simple-icons/icons/trello.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| slack.com | `assets/icons/dashboard-icons/svg/slack.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| zoom.us | `assets/icons/dashboard-icons/svg/zoom.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 512 512。 |
| wps.cn | 缺图 null | — | 现有 wps.cn.png 为黑底白色圆圈 W，无法确认是经典 WPS 品牌，三个库无精确候选，暂留空。 |
| icourse163.org | `assets/site-icons/icourse163.org.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 64×64；不放大冒充高分辨率。 |
| open.163.com | `assets/site-icons/open.163.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| coursera.org | `assets/icons/simple-icons/icons/coursera.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| edx.org | `assets/icons/simple-icons/icons/edx.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| khanacademy.org | `assets/icons/simple-icons/icons/khanacademy.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| xuexi.cn | `assets/site-icons/xuexi.cn.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 30×30；不放大冒充高分辨率。 |
| dedao.cn | `assets/site-icons/dedao.cn.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| xuetangx.com | `assets/site-icons/xuetangx.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| duolingo.com | `assets/icons/dashboard-icons/svg/duolingo.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 250 250。 |
| quizlet.com | `assets/icons/simple-icons/icons/quizlet.svg` | `assets/icons/dashboard-icons/svg/quizlet.svg` | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 可选横版 viewBox=0 0 244 53，比例 4.604。 |
| amap.com | `assets/site-icons/amap.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| map.baidu.com | `assets/site-icons/map.baidu.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 48×48；不放大冒充高分辨率。 |
| 12306.cn | `assets/site-icons/12306.cn.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 48×48；不放大冒充高分辨率。 |
| ctrip.com | `assets/site-icons/ctrip.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 16×16；不放大冒充高分辨率。 |
| meituan.com | `assets/icons/simple-icons/icons/meituan.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| dianping.com | `assets/site-icons/dianping.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 64×64；不放大冒充高分辨率。 |
| music.163.com | `assets/icons/simple-icons/icons/neteasecloudmusic.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| spotify.com | `assets/icons/dashboard-icons/svg/spotify.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 226.733 226.733。 |
| movie.douban.com | `assets/site-icons/movie.douban.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| maoyan.com | `assets/site-icons/maoyan.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| so.com | `assets/site-icons/so.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 116×116；不放大冒充高分辨率。 |
| sm.cn | `assets/site-icons/sm.cn.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| microsoft.com | `assets/icons/dashboard-icons/svg/microsoft.svg` | `assets/icons/lobe-icons/microsoft-text.svg` | 精确微软四色四方格常规 SVG，viewBox=0 0 512 512。可选横版 viewBox=0 0 108 24，比例4.500；Lobe 源 title 误写 Azure，但实际路径为 Microsoft 字标（不是 Azure 云图形），需注意元数据错误。 |
| apple.com | `assets/icons/lobe-icons/apple.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 24 24。 |
| huawei.com | `assets/icons/lobe-icons/huawei-color.svg` | `assets/icons/lobe-icons/huawei-text.svg` | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 24 24。 可选横版 viewBox=0 0 120 24，比例 5.000。 |
| mi.com | `assets/icons/dashboard-icons/svg/xiaomi-global.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=-200.008 -199.727 512 512。 |
| 163.com | 缺图 null | — | 现有 163.com.png 为带 NEWS 字样的网易新闻产品图标，不能直接认作网易门户经典标志；缺少精确候选。 |
| tencent.com | `assets/icons/lobe-icons/tencent-brand-color.svg` | `assets/icons/lobe-icons/tencent-brand-color.svg` | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=0 0 153 24。 可选横版 viewBox=0 0 153 24，比例 6.375。 |
| sina.com.cn | `assets/site-icons/sina.com.cn.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 114×114；不放大冒充高分辨率。 |
| sohu.com | `assets/site-icons/sohu.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| caixin.com | `assets/site-icons/caixin.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 120×120；不放大冒充高分辨率。 |
| yicai.com | `assets/site-icons/yicai.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 16×16；不放大冒充高分辨率。 |
| guancha.cn | `assets/site-icons/guancha.cn.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 114×114；不放大冒充高分辨率。 |
| zaobao.com.sg | `assets/site-icons/zaobao.com.sg.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| y.qq.com | `assets/site-icons/y.qq.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| kugou.com | `assets/site-icons/kugou.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 16×16；不放大冒充高分辨率。 |
| ximalaya.com | `assets/site-icons/ximalaya.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 48×48；不放大冒充高分辨率。 |
| xiaoyuzhoufm.com | `assets/site-icons/xiaoyuzhoufm.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| vimeo.com | `assets/icons/simple-icons/icons/vimeo.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| threads.net | `assets/icons/dashboard-icons/svg/threads.svg` | — | 精确品牌 SVG；优先常规彩色款，排除浅色/深色异色与装饰变体。 viewBox=35.7 0 440.4 512。 |
| maimai.cn | 缺图 null | — | 三个本地库与现有 site-icons 未找到精确品牌资源；缺图，不借用同公司其他产品。 |
| suning.com | `assets/site-icons/suning.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 40×40；不放大冒充高分辨率。 |
| vip.com | `assets/site-icons/vip.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 16×16；不放大冒充高分辨率。 |
| dangdang.com | `assets/site-icons/dangdang.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 16×16；不放大冒充高分辨率。 |
| you.163.com | `assets/site-icons/you.163.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 114×114；不放大冒充高分辨率。 |
| dewu.com | `assets/site-icons/dewu.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 64×64；不放大冒充高分辨率。 |
| freshippo.com | 缺图 null | — | 三个本地库与现有 site-icons 未找到精确品牌资源；缺图，不借用同公司其他产品。 |
| codepen.io | `assets/site-icons/codepen.io.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 48×48；不放大冒充高分辨率。 |
| cnblogs.com | `assets/site-icons/cnblogs.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| iconify.design | `assets/icons/simple-icons/icons/iconify.svg` | — | 精确品牌 SVG；使用标准单色品牌轮廓；无更合适的本地常规彩色 SVG。 viewBox=0 0 24 24。 |
| gaoding.com | `assets/site-icons/gaoding.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| chuangkit.com | `assets/site-icons/chuangkit.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| uisdc.com | `assets/site-icons/uisdc.com.jpg` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| lanhuapp.com | `assets/site-icons/lanhuapp.com.ico` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 32×32；不放大冒充高分辨率。 |
| js.design | `assets/site-icons/js.design.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 128×128；不放大冒充高分辨率。 |
| youdao.com | `assets/site-icons/youdao.com.png` | — | 保留现有精确站点 favicon；三个库未发现更合适的精确产品 SVG。实际图像尺寸 48×48；不放大冒充高分辨率。 |

## 完整性

JSON 为 `{recommendations:[{domain,main,wide?,reason}],exclusions:[...]}`；所有 main/wide 均为仓库相对路径，main:null 明确表示缺图。建议表覆盖范围内全部域名。未覆盖/忽略并行工作文件；只写本报告和 data/icon-review-web.json。
