# Mail and AI icon sources

All additions reuse existing local library files byte for byte; no network downloads were made.

| Catalog asset | Local source | Upstream |
| --- | --- | --- |
| `chat.deepseek.com.svg` | `assets/icons/lobe-icons/deepseek-color.svg` | [Lobe Icons](https://github.com/lobehub/lobe-icons), @lobehub/icons-static-svg 1.95.1, MIT |
| `chat.deepseek.com-text.svg` | `assets/icons/lobe-icons/deepseek-text.svg` | Same as above |
| `mail.google.com.svg` | `assets/icons/dashboard-icons/svg/gmail.svg` | [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons), commit 6d31345986eba2067a63eb41c1a5a87d4e8e850a |
| `mail.qq.com.svg` | `assets/icons/dashboard-icons/svg/qq.svg` | Same as above; QQ brand mark |

Library provenance and legal files remain in each library directory (`SOURCE.json`, `LICENSE`). Brand marks remain subject to their owners’ rights. All four selected source files were parsed as SVG XML before copying, avoiding the dashboard library’s known PNG files with .svg extensions.

The downloaded Lobe Icons, Dashboard Icons, and Simple Icons libraries contain no exact NetEase 163 Mail logo. `mail.163.com` therefore uses the existing catalog fallback (no icon field); the NetEase Cloud Music logo is not substituted.

更新：本记录反映新增时的快照。后续精选已移除 QQ 企鹅作为 QQ 邮箱的替代，最终实际封装来源及缺失处理以 data/icon-selection.json 和 docs/ICON_CURATION.md 为准。
