const { Parser: HtmlParser } = require('htmlparser2');
const { parseExpression } = require('@babel/parser');

/**
 * AXML解析器 (优化版)
 * 使用htmlparser2进行可靠解析，支持：
 * - 嵌套标签
 * - 自闭合标签
 * - 注释节点
 * - 复杂属性值
 */
class AxmlParser {
  constructor() {
    this.currentNode = null;
    this.ast = null;
    this.stack = [];
  }

  /**
   * 主解析方法
   * @param {string} axmlContent 
   * @returns {Object} 完整AST
   */
  parse(axmlContent) {
    this.ast = {
      type: 'Root',
      children: [],
      position: { start: 0, end: axmlContent.length }
    };
    this.currentNode = this.ast;
    this.stack = [this.ast];

    const parser = new HtmlParser({
      onopentag: (name, attributes) => this.handleOpenTag(name, attributes),
      onclosetag: () => this.handleCloseTag(),
      ontext: text => this.handleText(text),
      oncomment: comment => this.handleComment(comment),
      onprocessinginstruction: () => {} // 可选处理指令
    }, {
      decodeEntities: true,
      recognizeSelfClosing: true,
      lowerCaseAttributeNames: false,
    });

    parser.write(axmlContent);
    parser.end();

    return this.ast;
  }

  // 处理标签打开
  handleOpenTag(name, attributes) {
    const node = {
      type: 'Element',
      tagName: name,
      attributes: this.parseAttributes(attributes),
      children: [],
      position: {} // 实际使用时可记录位置信息
    };

    this.currentNode.children.push(node);
    this.stack.push(node);
    this.currentNode = node;
  }

  // 处理标签关闭
  handleCloseTag() {
    this.stack.pop();
    this.currentNode = this.stack[this.stack.length - 1];
  }

  // 处理文本内容
  handleText(text) {
    if (text.trim() === '') return;

    this.currentNode.children.push({
      type: 'Text',
      value: text,
      isMustache: this.detectMustache(text)
    });
  }

  // 处理注释
  handleComment(comment) {
    this.currentNode.children.push({
      type: 'Comment',
      value: comment
    });
  }

  /**
   * 高级属性解析 (处理以下情况)
   * - 无引号属性：disabled
   * - 单引号/双引号：name="va'lue"
   * - 含表达式的属性：data-{{index}}
   */
  parseAttributes(attrs) {
    return Object.entries(attrs).map(([name, value]) => ({
      name,
      value,
      isMustache: this.detectMustache(value),
      expression: this.parseExpression(value)
    }));
  }

  // 检测Mustache语法
  detectMustache(text) {
    return /\{\{.*?\}\}/.test(text);
  }

  /**
   * 表达式解析优化版
   * - 自动提取Mustache内容
   * - 错误恢复机制
   */
  parseExpression(rawText) {
    const cleanText = rawText.replace(/^\{\{|\}\}$/g, '').trim();
    
    try {
      return parseExpression(cleanText, {
        allowAwaitOutsideFunction: true,
        plugins: ['jsx']
      });
    } catch (error) {
      return {
        type: 'ParseError',
        raw: rawText,
        error: error.message
      };
    }
  }
}

const parser = new AxmlParser();

module.exports = parser;