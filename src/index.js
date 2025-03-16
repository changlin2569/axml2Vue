#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const parseAxml = require('./parser/axmlParser');
const transformToVue = require('./transformer/vueTransformer');
const { generateVueFile } = require('./generator/vueGenerator');
const { parseJs } = require('./parser/jsParser');
const { transformJs } = require('./transformer/jsTransformer');
const { generateJsFile } = require('./generator/jsGenerator');

// 命令行参数解析
const args = process.argv.slice(2);
let inputPath = '';
let outputPath = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && i + 1 < args.length) {
    inputPath = args[i + 1];
    i++;
  } else if (args[i] === '--output' && i + 1 < args.length) {
    outputPath = args[i + 1];
    i++;
  }
}

if (!inputPath || !outputPath) {
  console.error('请提供输入和输出路径');
  console.log('使用方法: node src/index.js --input <小程序项目路径> --output <Vue项目输出路径>');
  process.exit(1);
}

// 确保输出目录存在
fs.ensureDirSync(outputPath);

/**
 * 转换单个AXML文件到Vue文件
 * @param {string} axmlPath AXML文件路径
 * @param {string} outputPath 输出Vue文件路径
 * @returns {Array} SJS导入信息
 */
async function convertAxmlToVue(axmlPath, outputPath) {
  try {
    // 读取AXML文件
    const axmlContent = await fs.readFile(axmlPath, 'utf-8');
    
    // 解析AXML
    const axmlAst = parseAxml.parse(axmlContent);
    
    // 转换为Vue格式
    const vueTemplate = transformToVue.transform(axmlAst);
    
    // 获取SJS导入信息
    const sjsImports = transformToVue.getSjsImports();
    
    // 生成Vue文件
    await generateVueFile(vueTemplate, outputPath);
    
    console.log(`转换成功: ${axmlPath} -> ${outputPath}`);
    
    // 返回SJS导入信息，供JS转换器使用
    return sjsImports;
  } catch (error) {
    console.error(`转换失败: ${axmlPath}`, error);
    return [];
  }
}

/**
 * 转换JS文件到Vue组件JS部分
 * @param {string} jsPath JS文件路径
 * @param {string} outputPath 输出Vue文件路径
 * @param {Array} sjsImports SJS导入信息
 */
async function convertJsToVue(jsPath, outputPath, sjsImports = []) {
  try {
    // 读取JS文件
    const jsContent = await fs.readFile(jsPath, 'utf-8');
    
    // 解析JS
    const jsAst = parseJs(jsContent);
    
    // 转换为Vue组件格式
    const vueJs = transformJs(jsAst, sjsImports);
    
    if (vueJs === null) {
      // 如果不是页面或组件文件，直接复制
      await fs.copy(jsPath, outputPath);
      console.log(`JS文件直接复制: ${jsPath} -> ${outputPath}`);
      return;
    }
    
    // 生成Vue组件JS部分
    await generateJsFile(vueJs, outputPath);
    console.log(`JS转换成功: ${jsPath} -> ${outputPath}`);
  } catch (error) {
    console.error(`JS转换失败: ${jsPath}`, error);
  }
}

/**
 * 处理目录
 * @param {string} inputDir 输入目录
 * @param {string} outputDir 输出目录
 */
async function processDirectory(inputDir, outputDir) {
  try {
    const entries = await fs.readdir(inputDir, { withFileTypes: true });
    
    // 确保输出目录存在
    await fs.ensureDir(outputDir);
    
    // 先处理AXML文件，收集SJS导入信息
    const sjsImportsMap = new Map();
    
    for (const entry of entries) {
      const inputPath = path.join(inputDir, entry.name);
      const outputPath = path.join(outputDir, entry.name);
      
      if (entry.isFile() && entry.name.endsWith('.axml')) {
        const baseName = entry.name.replace('.axml', '');
        const vueOutputPath = path.join(outputDir, `${baseName}.vue`);
        const sjsImports = await convertAxmlToVue(inputPath, vueOutputPath);
        
        // 保存SJS导入信息，以便后续处理JS文件时使用
        if (sjsImports.length > 0) {
          sjsImportsMap.set(baseName, sjsImports);
        }
      }
    }
    
    // 处理SJS文件，将其转换为JS模块
    for (const entry of entries) {
      const inputPath = path.join(inputDir, entry.name);
      const outputPath = path.join(outputDir, entry.name);
      
      if (entry.isFile() && entry.name.endsWith('.sjs')) {
        // 直接复制 SJS 文件，不进行转换
        await fs.copy(inputPath, outputPath);
        console.log(`SJS文件直接复制: ${inputPath} -> ${outputPath}`);
      }
    }
    
    // 然后处理其他文件
    for (const entry of entries) {
      const inputPath = path.join(inputDir, entry.name);
      const outputPath = path.join(outputDir, entry.name);
      
      if (entry.isDirectory()) {
        await processDirectory(inputPath, outputPath);
      } else if (entry.isFile()) {
        if ((entry.name.endsWith('.js') || entry.name.endsWith('.ts')) && !entry.name.endsWith('.sjs')) {
          const baseName = entry.name.replace(/\.(js|ts)$/, '');
          const jsOutputPath = outputPath;
          
          // 获取对应的SJS导入信息
          const sjsImports = sjsImportsMap.get(baseName) || [];
          
          await convertJsToVue(inputPath, jsOutputPath, sjsImports);
        } else if (!entry.name.endsWith('.axml') && !entry.name.endsWith('.sjs')) {
          // 复制其他文件（除了AXML和SJS文件，因为SJS文件已经在前面处理过了）
          await fs.copy(inputPath, outputPath);
        }
      }
    }
    
    console.log(`目录处理完成: ${inputDir} -> ${outputDir}`);
  } catch (error) {
    console.error(`目录处理失败: ${inputDir}`, error);
  }
}

// 开始转换
(async () => {
  try {
    await processDirectory(inputPath, outputPath);
    
    // 生成 declare.d.ts 文件
    const declareContent = `/**
 * 全局声明文件
 * 为小程序中的全局变量和函数提供类型声明
 */

// 声明全局的 my 对象
declare const my: any;

// 声明全局的 Page 函数
declare function Page(options: any): any;

// 声明全局的 Component 函数
declare function Component(options: any): any;
`;
    await fs.writeFile(path.join(outputPath, 'declare.d.ts'), declareContent, 'utf-8');
    
    console.log('转换完成!');
  } catch (error) {
    console.error('转换失败:', error);
    process.exit(1);
  }
})();