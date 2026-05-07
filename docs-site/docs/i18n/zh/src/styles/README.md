# docs-site 样式

语言：[英文](../../../../../src/styles/README.md) · [韩文](../../../ko/src/styles/README.md) · [中文](README.md) · [西班牙文](../../../es/src/styles/README.md) · [法文](../../../fr/src/styles/README.md) · [印地文](../../../hi/src/styles/README.md)

全局 CSS 按职责拆分。

- `tokens.css`：共享的尺寸和间距值。
- `layout.css`：Starlight 布局区域的宽度和结构。
- `markdown.css`：正文 Markdown 元素。
- `header-controls.css`：页眉中的语言和主题控件。
- `page-navigation.css`：上一页和下一页链接。
- `interaction.css`：用于徽标、侧边栏、按钮和选择框等交互式 UI 的文本
  选择行为。
- `accessibility.css`：针对焦点、高对比度、减少动态效果和方向隔离的无障碍
  改进。

加载顺序定义在 `../config/styles.mjs` 中。

键盘导航等非 CSS 浏览器行为由 `../../public/keyboard-navigation.js` 和
`../config/head.mjs` 管理。
