# AXML2Vue

将支付宝小程序 AXML 转换为 Vue 组件的工具。

## 功能特点

- 将 AXML 模板转换为 Vue 模板
- 将小程序 JS/TS 文件转换为 Vue 组件
- 保留 SJS 文件并正确处理导入
- 支持小程序的生命周期、事件处理和数据绑定
- 自动处理标签映射（如 view -> div, text -> span）
- 将只包含纯文本的标签转换为 text 标签
- 正确处理双大括号语法转换为 Vue 的 v-bind

## 安装

### 全局安装

```bash
npm install -g axml2vue
```

### 或者使用 npx 直接运行

```bash
npx axml2vue --input <小程序项目路径> --output <Vue项目输出路径>
```

## 使用方法

### 命令行

```bash
axml2vue --input <小程序项目路径> --output <Vue项目输出路径>
```

### 使用 npm scripts

在项目中安装后，可以在 package.json 中添加脚本：

```json
"scripts": {
  "convert": "axml2vue --input src/miniprogram --output src/vue-app"
}
```

然后运行：

```bash
npm run convert
```

## 转换规则

- 小程序标签映射:
  - view -> div
  - image -> image
  - text -> span
  - 只包含纯文本的标签 -> text
- 事件处理:
  - onTap -> @click
  - catchTap -> @click
  - onLongPress -> @longpress
- 指令:
  - a:if -> v-if
  - a:for -> v-for
  - a:key -> :key
- 数据绑定:
  - {{value}} -> :attribute="value"
  - class="{{className}}" -> :class="className"
  - 多个类名绑定 -> :class="\`class1 ${dynamicClass}\`"

## 示例

### 输入 (AXML)

```html
<view class="container {{ test }}">
  <view a:if="{{showContent}}" class="content-item">
    <text>条件渲染内容</text>
  </view>
  <image src="{{imageUrl}}" mode="aspectFit" />
  <button onTap="handleTap">点击按钮</button>
</view>
```

### 输出 (Vue)

```html
<div :class="`container ${test}`">
  <div v-if="showContent" class="content-item">
    <text>条件渲染内容</text>
  </div>
  <image :src="imageUrl" mode="aspectFit" />
  <button @click="handleTap()">点击按钮</button>
</div>
```

## 许可证

MIT