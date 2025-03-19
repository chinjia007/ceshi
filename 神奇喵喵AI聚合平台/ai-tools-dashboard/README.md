# 神奇喵喵AI聚合平台

这是一个四格布局（田字格）的HTML网页应用，允许用户在一个页面同时加载和使用多个AI工具。

## 功能特点

- 四格布局，可同时查看多个AI工具
- 侧边栏包含四个下拉选择框，分别对应四个窗口
- 支持多种国内常用AI工具，如元宝、豆包、kimi等
- 简洁美观的界面设计

## 使用方法

1. 打开`index.html`文件
2. 在左侧侧边栏的下拉框中选择想要在对应窗口加载的AI工具
3. 选择工具后，对应窗口将加载所选工具的网页
4. 可以随时切换任何窗口加载的工具

## 添加更多工具

如果要添加更多AI工具，只需在`index.html`文件中的下拉选择框中增加选项：

```html
<select id="tool1" class="tool-dropdown">
    <option value="">请选择工具</option>
    <option value="https://yuanbao.tencent.com/chat/">元宝</option>
    <option value="https://www.doubao.com/chat/">豆包</option>
    <!-- 在这里添加更多工具选项 -->
    <option value="你的工具URL">工具名称</option>
</select>
```

## 注意事项

- 部分网站可能因安全限制无法在iframe中正常加载
- 推荐使用现代浏览器（如Chrome、Edge、Firefox最新版本）访问此应用 