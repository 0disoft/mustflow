# docs-site 配置

语言：[英文](../../../../../src/config/README.md) · [韩文](../../../ko/src/config/README.md) · [中文](README.md) · [西班牙文](../../../es/src/config/README.md) · [法文](../../../fr/src/config/README.md) · [印地文](../../../hi/src/config/README.md)

该目录托管了 Starlight 的配置组件。为了避免依赖于单一庞大的配置文件，`docs-site` 采用了**模块化设计方法**，将各个选项拆分为关注点集中的领域特定文件。

---

## 设计意图

维护一个全局多语言文档站点需要能够同时扩展区域语言、样式系统、SEO 元数据以及侧边栏导航。通过将这些配置解耦到独立的 `.mjs` 模块中，我们能够确保：
* **关注点隔离**：对侧边栏导航菜单的更改绝不会影响 SEO 元数据或区域语言路由。
* **更安全的合并**：多个贡献者可以同时更新翻译和导航链接，极大地降低了 Git 合并冲突的风险。

---

## 配置文件映射表

* **`site.mjs`**：包含站点的核心元数据，例如生产环境的 URL、标题以及默认设置。
* **`head.mjs`**：控制注入到每个文档页面 HTML `<head>` 中的自定义标签。在此注册统计分析脚本、外部 CDN 链接或站点级脚本。
* **`locales.mjs`**：定义支持的多语言区域以及映射权重优先级。
* **`machine-readable.mjs`**：声明用于生成 `ai.txt`、`llms.txt`、`llms-full.txt` 和 `robots.txt` 的公开机器可读元数据参数。
* **`navigation.mjs`**：侧边栏分组结构、嵌套关系以及文章链接的权威注册表。
* **`sidebar.mjs`**：组织侧边栏菜单并将导航配置直接传递给 Starlight 引擎。
* **`styles.mjs`**：控制全局样式文件（CSS）的严格加载与级联继承顺序。
* **`starlight.mjs`**：核心协调者，动态聚合上述所有配置文件，生成传递给 Starlight 框架的最终配置参数。

---

## `machine-readable.mjs` 的作用 (AI 与 LLM 适配)

随着 AI 编码助手和 LLM 网页爬虫的普及，现代技术文档必须易于被机器分析和检索。
* **`llms.txt` 和 `llms-full.txt`**：为大语言模型量身定制的端点，提供经过精简的纯 Markdown 站点总结。
* **`ai.txt`**：专门为阅读本站点的 AI 编码代理和开发工具提供特别的上下文边界及动作暗示。
* 在 `machine-readable.mjs` 中配置的属性直接决定了上述静态元数据文件的生成行为。

---

## 步骤维护实用指南

### 向侧边栏添加新文档页面
1. 在 `src/content/docs/<locale>/path/to/file.md` 中编写或放置您的新 Markdown 文件。
2. 打开 `src/config/navigation.mjs` 文件。
3. 找到目标分类数组，添加您的条目对象：
   ```javascript
   { label: '新页面标题', slug: 'path/to/file' }
   ```
4. 在根目录下运行 `bun run docs:check` 以验证导航是否成功构建。

### 注册新全局样式表文件
1. 在 `src/styles/` 下创建您的 CSS 文件。
2. 打开 `src/config/styles.mjs` 文件。
3. 将样式表的相对路径添加到导出的数组中，并确保级联顺序预测正确。
