# docs-site 配置

语言：[英文](../../../../../src/config/README.md) · [韩文](../../../ko/src/config/README.md) · [中文](README.md) · [西班牙文](../../../es/src/config/README.md) · [法文](../../../fr/src/config/README.md) · [印地文](../../../hi/src/config/README.md)

该目录将 Starlight 配置拆分为职责明确的源文件。

- `site.mjs`：站点名称和部署 URL。
- `head.mjs`：添加到每个文档页面 `<head>` 的标签。
- `locales.mjs`：文档语言列表。
- `machine-readable.mjs`：用于 `ai.txt`、`llms.txt`、`llms-full.txt` 和
  `robots.txt` 的公开元数据。
- `navigation.mjs`：侧边栏中显示的文档链接和分组。
- `sidebar.mjs`：传给 Starlight 的侧边栏入口。
- `styles.mjs`：全局 CSS 加载顺序。
- `starlight.mjs`：由上述文件组合出的 Starlight 选项。

当新文档需要显示在侧边栏中时，请将其链接添加到 `navigation.mjs`。添加
新的全局样式文件时，请同时更新 `styles.mjs`。添加浏览器脚本时，请在
`head.mjs` 中注册。
