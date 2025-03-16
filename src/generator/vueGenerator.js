/**
 * Vue生成器
 * 负责将转换后的Vue模板生成最终的Vue文件
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * 生成Vue文件
 * @param {Object|string} vueTemplate 转换后的Vue模板对象或字符串
 * @param {string} outputPath 输出文件路径
 * @returns {Promise<void>}
 */
async function generateVueFile(vueTemplate, outputPath) {
  try {
    // 确保输出目录存在
    await fs.ensureDir(path.dirname(outputPath));
    
    // 获取对应的 JS 和 CSS 文件路径（相对路径）
    const baseName = path.basename(outputPath, '.vue');
    
    // 处理模板内容
    const templateContent = typeof vueTemplate === 'string' 
      ? vueTemplate 
      : generateTemplateString(vueTemplate);
    
    // 生成Vue文件内容
    const vueContent = `
<template>
${templateContent}
</template>

<script>
import component from './${baseName}';
export default component;
</script>

<style src="./${baseName}.css"></style>
`;
    
    // 写入文件
    await fs.writeFile(outputPath, vueContent, 'utf-8');
    
    // 创建一个空的 CSS 文件（如果不存在）
    const cssPath = path.join(path.dirname(outputPath), `${baseName}.css`);
    if (!await fs.pathExists(cssPath)) {
      await fs.writeFile(cssPath, '/* 样式内容 */', 'utf-8');
    }
    
    return outputPath;
  } catch (error) {
    console.error('生成Vue文件失败:', error);
    throw error;
  }
}

/**
 * 生成模板字符串
 * @param {Object} vueTemplate Vue模板对象
 * @returns {string} 生成的模板HTML字符串
 */
function generateTemplateString(vueTemplate) {
  // 如果已经有生成好的内容，直接返回
  if (vueTemplate.content && vueTemplate.content.trim() !== '<template>\n  <!-- 转换后的模板内容 -->\n</template>') {
    // 提取<template>标签内的内容
    const contentMatch = vueTemplate.content.match(/<template>([\s\S]*)<\/template>/);
    return contentMatch ? contentMatch[1].trim() : vueTemplate.content;
  }
  
  // 否则根据children递归生成
  return generateNodeString(vueTemplate.children, 2);
}

/**
 * 递归生成节点字符串
 * @param {Array} nodes 节点数组
 * @param {number} indent 缩进级别
 * @returns {string} 生成的HTML字符串
 */
function generateNodeString(nodes, indent = 0) {
  if (!nodes || nodes.length === 0) {
    return '';
  }
  
  const indentStr = ' '.repeat(indent);
  let result = '';
  
  for (const node of nodes) {
    if (node.type === 'Text') {
      result += `${indentStr}${node.value}\n`;
    } else if (node.type === 'Element') {
      // 生成开始标签
      result += `${indentStr}<${node.tagName}${generateAttributesString(node.attributes)}>`;
      
      // 处理子节点
      if (node.children && node.children.length > 0) {
        result += '\n';
        result += generateNodeString(node.children, indent + 2);
        result += `${indentStr}</${node.tagName}>\n`;
      } else {
        // 自闭合标签
        result += `</${node.tagName}>\n`;
      }
    }
  }
  
  return result;
}

/**
 * 生成属性字符串
 * @param {Object} attributes 属性对象
 * @returns {string} 生成的属性字符串
 */
function generateAttributesString(attributes) {
  if (!attributes || Object.keys(attributes).length === 0) {
    return '';
  }
  
  let result = '';
  
  for (const [key, value] of Object.entries(attributes)) {
    if (value === '') {
      result += ` ${key}`;
    } else {
      result += ` ${key}="${value}"`;
    }
  }
  
  return result;
}

module.exports = {
  generateVueFile
};