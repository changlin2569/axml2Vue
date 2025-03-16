class AxmlToVueConverter {
  // 可配置参数
  componentMap = {
    view: "div",
    image: "image",
    text: "span",
  };

  eventMap = {
    Tap: "click",
    LongPress: "longpress",
    CatchTap: "click",
  };

  // 初始化正则表达式
  eventRegex = /^(on|catch)([A-Z][a-zA-Z]*)/;
  directiveRegex = /^a:/;
  forRegex = /^\{\{\s*(.*?)\s*\}\}$/s;
  hasDoubleBraces = /\{\{[^{}]+\}\}/;

  // 存储 SJS 导入信息
  sjsImports = [];

  constructor(options = {}) {}

  /**
   * 主转换方法
   * @param {Object} ast 输入的AXML AST
   * @returns {string} 生成的Vue模板
   */
  transform(ast) {
    // 清空 SJS 导入信息
    this.sjsImports = [];
    
    // 转换 AST 为 Vue 模板
    const template = this.#wrapRoot(this.#convertNode(ast));
    
    return template;
  }

  /**
   * 获取 SJS 导入信息
   * @returns {Array} SJS 导入信息数组
   */
  getSjsImports() {
    return this.sjsImports;
  }

  // 私有方法实现
  #convertNode(node, indentLevel = 0) {
    if (node.type === "Root") {
      return node.children
        .map((child) => this.#convertNode(child, indentLevel))
        .join("\n");
    }

    if (node.type === "Element") {
      // 处理 import-sjs 标签
      if (node.name === "import-sjs") {
        return this.#handleImportSjs(node, indentLevel);
      }
      return this.#handleElement(node, indentLevel);
    }

    if (node.type === "Text") {
      return this.#handleText(node, indentLevel);
    }

    return "";
  }

  /**
   * 处理 import-sjs 标签
   * @param {Object} node import-sjs 节点
   * @param {number} indentLevel 缩进级别
   * @returns {string} 转换后的注释
   */
  #handleImportSjs(node, indentLevel) {
    const indent = "  ".repeat(indentLevel);
    const attrs = node.attributes || {};
    
    // 提取 from 和 name 属性
    const from = attrs.from?.value || "";
    const name = attrs.name?.value || "";
    
    if (from && name) {
      // 记录 SJS 导入信息
      this.sjsImports.push({ from, name });
      
      // 返回注释，说明这里有 SJS 导入
      return `${indent}<!-- SJS import: ${name} from ${from} -->`; 
    }
    
    return "";
  }

  #handleElement(node, indentLevel) {
    const tag = this.#mapComponent(node.tagName);
    const attrs = this.#processAttributes(node.attributes);
    
    // 检查是否只包含纯文本内容
    const hasOnlyTextChild = node.children.length === 1 && node.children[0].type === "Text";
    
    // 如果只包含纯文本内容，使用 text 标签包裹
    const finalTag = hasOnlyTextChild ? "text" : tag;
    
    const children = node.children
      .map((child) => this.#convertNode(child, indentLevel + 1))
      .join("\n");

    return this.#generateVueElement(finalTag, attrs, children, indentLevel);
  }

  #handleText(node, indentLevel) {
    const indent = "  ".repeat(indentLevel);
    return `${indent}${node.value.replace(/\{\{[\s]*this\./g, "{{ ")}`;
  }

  #mapComponent(tagName) {
    return this.componentMap[tagName] || tagName;
  }

  #processAttributes(attrs) {
    return attrs
      .map((attr) => {
        // 处理事件属性
        const eventMatch = attr.name.match(this.eventRegex);
        if (eventMatch) {
          return this.#processEventAttribute(eventMatch, attr.value);
        }

        // 处理指令属性
        if (this.directiveRegex.test(attr.name)) {
          return this.#processDirective(attr);
        }

        // 处理普通属性
        return this.#processStaticAttribute(attr);
      })
      .filter(Boolean);
  }

  #processEventAttribute(match, value) {
    const [_, prefix, eventType] = match;
    const vueEvent = this.eventMap[eventType] || eventType.toLowerCase();

    return {
      name: `@${vueEvent}`,
      value: value.replace(/^this\./, ""),
      type: "event",
    };
  }

  #processDirective(attr) {
    const directiveType = attr.name.slice(2);
    const processor =
      this[
        `#process${
          directiveType.charAt(0).toUpperCase() + directiveType.slice(1)
        }Directive`
      ];

    if (typeof processor === "function") {
      return processor(attr.value);
    }

    // 提取表达式，去掉双大括号
    const value = this.#extractExpression(attr.value);

    return {
      name: directiveType === "key" ? `:key` : `v-${directiveType}`,
      value: directiveType === "for" ? this.#processForDirective(attr.value) : value,
      type: "directive",
    };
  }

  #processStaticAttribute(attr) {
    // 检查属性值是否使用了双大括号语法
    const hasMustache = /^\{\{(.*)\}\}$/.test(attr.value);
    
    if (attr.name === "class") {
      return {
        name: this.hasDoubleBraces.test(attr.value)
          ? `:${attr.name}`
          : attr.name,
        value: this.#processClassBinding(attr.value),
        type: "static",
      };
    }
    
    // 如果使用了双大括号语法，使用 v-bind 简写（冒号前缀）
    if (hasMustache) {
      const expression = attr.value.match(/^\{\{(.*)\}\}$/)[1].trim();
      return {
        name: `:${attr.name}`,
        value: expression,
        type: "static",
      };
    }

    return {
      name: attr.name,
      value: this.#processAttributeValue(attr.name, attr.value),
      type: "static",
    };
  }

  #processForDirective(value) {
    const match = value.match(this.forRegex);
    if (!match) {
      console.error(`Invalid for directive: ${value}`);
      return null;
    }

    return `(item, index) in ${match[1].trim()}`;
  }

  #processAttributeValue(name, value) {
    if (value === "{{true}}") return true;
    if (value === "{{false}}") return false;
    
    // 不再处理双大括号语法，因为已经在 #processStaticAttribute 中处理了
    return value;
  }

  #processClassBinding(value) {
    const segments = value.split(/(\{\{.*?\}\})/g).map((segment) => {
      const dynamicMatch = segment.match(/^\{\{(.*?)\}\}$/);
      return dynamicMatch ? `\${${dynamicMatch[1].trim()}}` : segment.trim();
    });

    return segments.length <= 1
      ? segments.join("")
      : `\`${segments.join(" ").replace(/\s+/g, " ").trim()}\``;
  }

  #generateVueElement(tag, attrs, children, indentLevel) {
    const indent = "  ".repeat(indentLevel);
    const attributes = this.#formatAttributes(attrs);

    if (children.trim() === "") {
      return `${indent}<${tag}${attributes ? " " + attributes : ""} />`;
    }

    return `${indent}<${tag}${attributes ? " " + attributes : ""}>
  ${children}
  ${indent}</${tag}>`;
  }

  #formatAttributes(attrs) {
    return [
      ...attrs
        .filter((a) => a.type === "directive")
        .map((a) => `${a.name}="${a.value}"`),
      ...attrs
        .filter((a) => a.type === "static")
        .map((a) => `${a.name}="${a.value}"`),
      ...attrs
        .filter((a) => a.type === "event")
        .map((a) => `${a.name}="${a.value}()"`),
    ].join(" ");
  }

  #wrapRoot(content) {
    return `<div class="app-container">
  ${content}
  </div>`;
  }

  #extractExpression(value) {
    const match = value.match(/^\{\{\s*(.*?)\s*\}\}$/);
    return match ? match[1].trim() : value;
  }
}

// 使用示例
const converter = new AxmlToVueConverter();

module.exports = converter;
