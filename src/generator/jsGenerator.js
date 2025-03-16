/**
 * JS生成器
 * 负责将转换后的JS逻辑生成Vue组件的脚本部分
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * 生成Vue组件的JS部分
 * @param {Object} vueJs 转换后的Vue组件JS对象
 * @param {string} outputPath 输出文件路径
 * @returns {Promise<void>}
 */
async function generateJsFile(vueJs, outputPath) {
  try {
    // 确保输出目录存在
    await fs.ensureDir(path.dirname(outputPath));
    
    // 直接生成独立的JS文件
    await fs.writeFile(outputPath, vueJs.content, 'utf-8');
    
    return outputPath;
  } catch (error) {
    console.error('生成JS文件失败:', error);
    throw error;
  }
}

/**
 * 更新Vue文件的script部分
 * @param {string} vueContent 原Vue文件内容
 * @param {string} jsContent 新的JS内容
 * @returns {string} 更新后的Vue文件内容
 */
function updateVueScriptContent(vueContent, jsContent) {
  // 查找<script>标签
  const scriptRegex = /<script>[\s\S]*?<\/script>/;
  
  // 如果找到<script>标签，替换其内容
  if (scriptRegex.test(vueContent)) {
    return vueContent.replace(scriptRegex, `<script>\n${jsContent}\n</script>`);
  }
  
  // 如果没有找到<script>标签，在</template>后添加
  const templateEndRegex = /<\/template>/;
  if (templateEndRegex.test(vueContent)) {
    return vueContent.replace(templateEndRegex, `</template>\n\n<script>\n${jsContent}\n</script>`);
  }
  
  // 如果都没有找到，直接添加到文件末尾
  return `${vueContent}\n\n<script>\n${jsContent}\n</script>`;
}

/**
 * 生成Vue组件的数据部分
 * @param {Object} data Vue组件数据对象
 * @returns {string} 生成的数据代码字符串
 */
function generateDataString(data) {
  if (!data || Object.keys(data).length === 0) {
    return 'return {};';
  }
  
  let result = 'return {';
  
  for (const [key, value] of Object.entries(data)) {
    result += `\n    ${key}: ${JSON.stringify(value)},`;
  }
  
  result += '\n  };';
  
  return result;
}

/**
 * 生成Vue组件的方法部分
 * @param {Object} methods Vue组件方法对象
 * @returns {string} 生成的方法代码字符串
 */
function generateMethodsString(methods) {
  if (!methods || Object.keys(methods).length === 0) {
    return '';
  }
  
  let result = '';
  
  for (const [key, value] of Object.entries(methods)) {
    result += `\n  ${key}() {\n    // 转换后的方法实现\n  },`;
  }
  
  return result;
}

/**
 * 生成Vue组件的生命周期部分
 * @param {Object} lifeCycles Vue组件生命周期对象
 * @returns {string} 生成的生命周期代码字符串
 */
function generateLifeCyclesString(lifeCycles) {
  if (!lifeCycles || Object.keys(lifeCycles).length === 0) {
    return '';
  }
  
  let result = '';
  
  for (const [key, value] of Object.entries(lifeCycles)) {
    result += `\n  ${key}() {\n    // 转换后的生命周期方法实现\n  },`;
  }
  
  return result;
}

module.exports = {
  generateJsFile
};