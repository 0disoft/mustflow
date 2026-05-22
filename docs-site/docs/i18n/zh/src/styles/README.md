# docs-site 样式

语言：[英文](../../../../../src/styles/README.md) · [韩文](../../../ko/src/styles/README.md) · [中文](README.md) · [西班牙文](../../../es/src/styles/README.md) · [法文](../../../fr/src/styles/README.md) · [印地文](../../../hi/src/styles/README.md)

此目录承载了文档网站的视觉样式层。`docs-site` 并不依赖庞大的 UI 框架或 TailwindCSS，而是通过职责明确的模块化原生（Vanilla）CSS 样式表来管理网站的布局、组件和排版。

---

## 加载顺序与级联 (Cascading)

这些样式表的加载与编译顺序在 `../config/styles.mjs` 中被严格定义。在添加新的视觉规则时，请确保它们能够沿着 CSS 级联规则以可预测的方式继承样式。

---

## 样式表模块注册表 (Registry)

* **`tokens.css`**：设计系统的主轴引擎。统一声明颜色调色板（HSL 变量）、字形体系（Inter, Outfit 字体）、圆角以及响应式网格间距系统等 CSS 全局自定义属性。
* **`layout.css`**：定义 Starlight 核心框架（导航侧边栏、内容区域、页眉）的视口网格指标、边距和 flex 容器布局。
* **`markdown.css`**：负责富文本内容的渲染。管控表格、段落间距、自定义警示框（Alert）、引用块、行内代码以及语法高亮块的样式。
* **`header-controls.css`**：专门覆盖导航栏页眉内部元素的布局，包括多语言切换下拉菜单、主题切换按钮和搜索输入框等。
* **`page-navigation.css`**：控制页脚页面导航链接（如：上一页 / 下一页）的样式。
* **`interaction.css`**：控制静态 UI 元素（如徽标和导航链接）的动态微动画、激活点击状态、鼠标悬停效果以及文本选择覆盖等。
* **`accessibility.css`**：核心网页无障碍防护罩。强制执行高可见性聚焦环（Focus rings）、自定义轮廓覆盖、CSS 双向文字方向隔离（`unicode-bidi`），以及适配系统减弱动态效果设置的媒体查询（`prefers-reduced-motion: reduce`）。

---

## 设计标记最佳实践 (`tokens.css`)

请始终使用 CSS 自定义属性（变量），避免直接使用硬编码的十六进制（Hex）值，以完美支持亮色/暗色主题的动态切换：
```css
/* 推荐做法 */
.my-card {
  background-color: var(--sl-color-bg-inline);
  padding: var(--sl-spacing-md);
}

/* 不推荐做法 */
.my-card {
  background-color: #1a1a1a;
  padding: 16px;
}
```

---

## 无障碍与键盘操作支持

所有的样式更改必须充分尊重用户的系统偏好与无障碍需求：
* **聚焦状态 (Focus States)**：必须保留高可见性的焦点指示器；除非提供了同等视觉效果的显式 focus 选择器，否则请勿书写 `outline: none`。
* **减弱动态效果 (Reduced Motion)**：当用户在系统设置中禁用了动画效果时，所有的自定义淡入、滑动和过渡效果都必须优雅地降级为静态展示。请确保这些例外规则写在 `@media (prefers-reduced-motion: reduce)` 媒介查询内。
* **键盘导航支持**：非 CSS 的浏览器交互行为（例如键盘焦点陷阱等）由 `../../public/keyboard-navigation.js` 进行动态控制，并在 `../config/head.mjs` 中进行注册。
