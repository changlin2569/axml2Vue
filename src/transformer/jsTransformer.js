/**
 * JS转换器
 * 负责将支付宝小程序的JS逻辑转换为Vue组件格式
 */

/**
 * 检查是否为页面或组件文件
 * @param {Object} jsAst JS的抽象语法树
 * @returns {boolean} 是否为页面或组件文件
 */
function isPageOrComponent(jsAst) {
  // 检查是否包含 Page 或 Component 函数调用
  return jsAst.program.body.some(node => {
    if (node.type === 'ExpressionStatement' && 
        node.expression.type === 'CallExpression') {
      const callee = node.expression.callee;
      return callee.type === 'Identifier' && 
             (callee.name === 'Page' || callee.name === 'Component');
    }
    return false;
  });
}

/**
 * 小程序生命周期与Vue生命周期的映射关系
 * 可以根据需要自定义扩展
 */
const LIFECYCLE_MAP = {
  // 页面生命周期（Page）
  onLoad: {
    vue: "created",
    description: "页面加载时触发，对应Vue的created"
  },
  onShow: {
    vue: "mounted",
    description: "页面显示时触发，对应Vue的mounted"
  },
  onReady: {
    vue: "mounted",
    description: "页面初次渲染完成时触发，对应Vue的mounted"
  },
  onHide: {
    vue: "beforeDestroy",
    description: "页面隐藏时触发，对应Vue的beforeDestroy"
  },
  onUnload: {
    vue: "destroyed",
    description: "页面卸载时触发，对应Vue的destroyed"
  },
  
  // 组件生命周期（Component）
  didMount: {
    vue: "mounted",
    description: "组件挂载时触发，对应Vue的mounted"
  },
  didUpdate: {
    vue: "updated",
    description: "组件更新时触发，对应Vue的updated"
  },
  didUnmount: {
    vue: "destroyed",
    description: "组件卸载时触发，对应Vue的destroyed"
  },
  didHide: {
    vue: "deactivated",
    description: "组件隐藏时触发，对应Vue的deactivated"
  },
  didShow: {
    vue: "activated",
    description: "组件显示时触发，对应Vue的activated"
  }
};

/**
 * 转换JS的AST为Vue组件格式
 * @param {Object} jsAst JS的抽象语法树
 * @param {Array} sjsImports SJS导入信息
 * @returns {Object} 转换后的Vue组件对象或null（如果不需要转换）
 */
function transformJs(jsAst, sjsImports = []) {
  // 检查是否为页面或组件文件
  if (!isPageOrComponent(jsAst)) {
    return null; // 不需要转换的文件返回 null
  }

  // 检查是否为工具函数文件
  if (isUtilFile(jsAst)) {
    return transformUtilFile(jsAst);
  }

  // 创建Vue组件对象
  const vueComponent = {
    type: "Script",
    content: "",
    imports: [],
    data: {},
    methods: {},
    computed: {},
    props: {},
    watch: {},
    lifeCycles: {},
    sjsImports: [], // 添加 SJS 导入信息
  };

  // 处理导入语句
  jsAst.program.body.forEach(node => {
    if (node.type === 'ImportDeclaration') {
      vueComponent.imports.push(generateImportStatement(node));
    }
  });

  // 分析小程序页面或组件结构
  const { analyzePageStructure } = require("../parser/jsParser");
  const pageStructure = analyzePageStructure(jsAst);

  // 转换数据
  if (pageStructure.data) {
    vueComponent.data = transformData(pageStructure.data);
  }

  // 处理 SJS 导入
  if (sjsImports && sjsImports.length > 0) {
    vueComponent.sjsImports = sjsImports;
    
    // 为每个 SJS 导入添加导入语句
    sjsImports.forEach(({ from, name }) => {
      // 保持 .sjs 扩展名不变
      vueComponent.imports.push(`import ${name}Module from '${from}';`);
    });
  }

  // 转换方法
  if (pageStructure.methods && pageStructure.methods.size > 0) {
    vueComponent.methods = transformMethods(pageStructure.methods);
  }

  // 转换生命周期
  if (pageStructure.lifeCycles && pageStructure.lifeCycles.size > 0) {
    vueComponent.lifeCycles = transformLifeCycles(pageStructure.lifeCycles);
  }

  // 转换组件属性为Vue props
  if (pageStructure.properties.length > 0) {
    vueComponent.props = transformProperties(pageStructure.properties);
  }

  // 转换数据监听器为Vue watch
  if (pageStructure.observers.length > 0) {
    vueComponent.watch = transformObservers(pageStructure.observers);
  }

  // 生成Vue组件内容
  vueComponent.content = generateComponentContent(vueComponent);

  return vueComponent;
}

/**
 * 生成导入语句
 * @param {Object} importNode 导入语句节点
 * @returns {string} 生成的导入语句
 */
function generateImportStatement(importNode) {
  const source = importNode.source.value;
  // 修改路径，将 .js 扩展名改为 .vue（如果是组件的话）
  const newSource = source.endsWith('.js') ? source.replace(/\.js$/, '') : source;
  
  if (importNode.specifiers.length === 0) {
    return `import '${newSource}';`;
  }

  const specifiers = importNode.specifiers.map(spec => {
    if (spec.type === 'ImportDefaultSpecifier') {
      return spec.local.name;
    }
    if (spec.type === 'ImportSpecifier') {
      return spec.imported.name === spec.local.name ?
        spec.imported.name :
        `${spec.imported.name} as ${spec.local.name}`;
    }
    if (spec.type === 'ImportNamespaceSpecifier') {
      return `* as ${spec.local.name}`;
    }
    return '';
  }).filter(Boolean);

  if (specifiers.length === 0) {
    return `import '${newSource}';`;
  }

  return `import { ${specifiers.join(', ')} } from '${newSource}';`;
}

/**
 * 转换小程序数据对象为Vue数据对象
 * @param {Object} dataProperty 小程序数据属性
 * @returns {Object} Vue数据对象
 */
function transformData(dataProperty) {
  // 直接处理从jsParser.js返回的数据对象
  if (typeof dataProperty === "object" && dataProperty !== null) {
    // 如果是从analyzePageStructure返回的直接数据对象
    if (!dataProperty.value) {
      return dataProperty;
    }

    // 处理有value属性的对象（旧的实现方式）
    if (dataProperty.value && dataProperty.value.type === "ObjectExpression") {
      const result = {};

      dataProperty.value.properties.forEach((prop) => {
        if (prop.key && (prop.key.name || prop.key.value)) {
          const key = prop.key.name || prop.key.value;

          // 根据值的类型进行处理
          if (prop.value) {
            if (prop.value.type === "Literal" || prop.value.type === "NullLiteral") {
              // 直接使用字面量值
              result[key] = prop.value.value;
              // 特殊处理 null 值
              if (prop.value.type === "NullLiteral" || prop.value.value === null) {
                result[key] = null;
              }
            } else if (prop.value.type === "ArrayExpression") {
              // 处理数组
              const arrayValue = [];
              prop.value.elements.forEach((element) => {
                if (element.type === "Literal") {
                  arrayValue.push(element.value);
                } else if (element.type === "ObjectExpression") {
                  // 处理数组中的对象
                  const objValue = {};
                  element.properties.forEach((objProp) => {
                    if (
                      objProp.key &&
                      (objProp.key.name || objProp.key.value)
                    ) {
                      const objKey = objProp.key.name || objProp.key.value;
                      if (objProp.value.type === "Literal") {
                        objValue[objKey] = objProp.value.value;
                      } else {
                        objValue[objKey] = null; // 其他复杂类型暂时设为null
                      }
                    }
                  });
                  arrayValue.push(objValue);
                } else {
                  arrayValue.push(null); // 其他复杂类型暂时设为null
                }
              });
              result[key] = arrayValue;
            } else if (prop.value.type === "ObjectExpression") {
              // 递归处理嵌套对象
              const objValue = {};
              prop.value.properties.forEach((objProp) => {
                if (objProp.key && (objProp.key.name || objProp.key.value)) {
                  const objKey = objProp.key.name || objProp.key.value;
                  if (objProp.value.type === "Literal") {
                    objValue[objKey] = objProp.value.value;
                  } else {
                    objValue[objKey] = null; // 其他复杂类型暂时设为null
                  }
                }
              });
              result[key] = objValue;
            } else if (prop.value.type === "Identifier" && prop.value.name === "null") {
              // 处理 null 标识符
              result[key] = null;
            } else {
              // 其他类型暂时设为null
              result[key] = null;
            }
          }
        }
      });

      return result;
    }
  }

  return {};
}

/**
 * 转换小程序方法为Vue方法
 * @param {Map} methods 小程序方法Map
 * @returns {Object} Vue方法对象
 */
function transformMethods(methods) {
  const result = {};
  methods.forEach((method, key) => {
    // 跳过生命周期方法，这些将直接放在组件根级别
    if (['didMount', 'didUpdate', 'didUnmount', 'didHide', 'didShow'].includes(key)) {
      return;
    }
    
    if (method && method.value && method.value.type === "FunctionExpression") {
      // 检查是否为异步函数
      const isAsync = method.value.async || false;
      const asyncPrefix = isAsync ? 'async ' : '';
      const params = method.value.params.map(p => p.name).join(', ');
      
      // 提取函数体并格式化
      let body = '';
      if (method.value.body) {
        const rawBody = extractFunctionBody(method.value.body);
        // 确保每行都有正确的缩进
        body = rawBody.split('\n').map(line => line.trim()).filter(Boolean).join('\n      ');
      } else {
        body = `console.log('${key} 方法被调用');`;
      }
      
      result[key] = `${asyncPrefix}${key}(${params}) {
      ${body}
    }`;
    } else if (method && method.type === "ObjectMethod") {
      // 检查是否为异步函数
      const isAsync = method.async || false;
      const asyncPrefix = isAsync ? 'async ' : '';
      const params = method.params.map(p => p.name).join(', ');
      
      // 提取函数体并格式化
      let body = '';
      if (method.body) {
        const rawBody = extractFunctionBody(method.body);
        // 确保每行都有正确的缩进
        body = rawBody.split('\n').map(line => line.trim()).filter(Boolean).join('\n      ');
      } else {
        body = `console.log('${key} 方法被调用');`;
      }
      
      result[key] = `${asyncPrefix}${key}(${params}) {
      ${body}
    }`;
    } else {
      result[key] = `${key}() {
      console.log('${key} 方法被调用');
    }`;
    }
  });
  return result;
}

/**
 * 转换小程序生命周期为Vue生命周期
 * @param {Map} lifeCycles 小程序生命周期Map
 * @returns {Object} Vue生命周期对象
 */
function transformLifeCycles(lifeCycles) {
  const result = {};
  lifeCycles.forEach((lifecycle, key) => {
    // 获取对应的Vue生命周期名称，如果没有映射关系则保持原名
    const vueLifecycle = LIFECYCLE_MAP[key] ? LIFECYCLE_MAP[key].vue : key;
    
    if (lifecycle && lifecycle.value && lifecycle.value.type === "FunctionExpression") {
      // 检查是否为异步函数
      const isAsync = lifecycle.value.async || false;
      const asyncPrefix = isAsync ? 'async ' : '';
      const params = lifecycle.value.params.map(p => p.name).join(', ');
      
      // 提取函数体并格式化
      let body = '';
      if (lifecycle.value.body) {
        const rawBody = extractFunctionBody(lifecycle.value.body);
        // 确保每行都有正确的缩进
        body = rawBody.split('\n').map(line => line.trim()).filter(Boolean).join('\n    ');
      } else {
        body = `console.log('${vueLifecycle} 生命周期被调用');`;
      }
      
      result[vueLifecycle] = `${asyncPrefix}${vueLifecycle}(${params}) {
    ${body}
  }`;
    } else if (lifecycle && lifecycle.type === "ObjectMethod") {
      // 检查是否为异步函数
      const isAsync = lifecycle.async || false;
      const asyncPrefix = isAsync ? 'async ' : '';
      const params = lifecycle.params.map(p => p.name).join(', ');
      
      // 提取函数体并格式化
      let body = '';
      if (lifecycle.body) {
        const rawBody = extractFunctionBody(lifecycle.body);
        // 确保每行都有正确的缩进
        body = rawBody.split('\n').map(line => line.trim()).filter(Boolean).join('\n    ');
      } else {
        body = `console.log('${vueLifecycle} 生命周期被调用');`;
      }
      
      result[vueLifecycle] = `${asyncPrefix}${vueLifecycle}(${params}) {
    ${body}
  }`;
    } else {
      result[vueLifecycle] = `${vueLifecycle}() {
    console.log('${vueLifecycle} 生命周期被调用');
  }`;
    }
  });
  return result;
}

/**
 * 从函数体节点中提取代码
 * @param {Object} bodyNode 函数体节点
 * @returns {string} 提取的代码
 */
function extractFunctionBody(bodyNode) {
  if (!bodyNode || !bodyNode.body) return '';
  
  let code = bodyNode.body.map(node => {
    // 直接使用原始代码
    return node._sourceCode;
  }).filter(Boolean).join('\n      ');
  
  // 替换 this.data.xx 为 this.xx
  code = code.replace(/this\.data\./g, 'this.');
  
  // 替换 this.props.xx 为 this.xx
  code = code.replace(/this\.props\./g, 'this.');
  
  return code;
}

/**
 * 生成表达式代码
 * @param {Object} expr 表达式节点
 * @returns {string} 生成的代码
 */
function generateExpression(expr) {
  if (!expr) return '';
  
  switch (expr.type) {
    case 'Identifier':
      return expr.name;
    case 'Literal':
    case 'NumericLiteral':
    case 'StringLiteral':
    case 'BooleanLiteral':
      return typeof expr.value === 'string' ? `'${expr.value}'` : String(expr.value);
    case 'BinaryExpression':
      return `${generateExpression(expr.left)} ${expr.operator} ${generateExpression(expr.right)}`;
    case 'UnaryExpression':
      return `${expr.operator}${generateExpression(expr.argument)}`;
    case 'MemberExpression':
      const object = expr.object.type === 'ThisExpression' ? 'this' : generateExpression(expr.object);
      const property = expr.computed ? 
        `[${generateExpression(expr.property)}]` : 
        `.${expr.property.name}`;
      return `${object}${property}`;
    case 'CallExpression':
      return generateCallExpression(expr);
    case 'ObjectExpression':
      return `{${expr.properties.map(prop => {
        const key = prop.key.name || prop.key.value;
        const value = generateExpression(prop.value);
        return `${key}: ${value}`;
      }).join(', ')}}`;
    case 'ArrayExpression':
      return `[${expr.elements.map(elem => generateExpression(elem)).join(', ')}]`;
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      const params = expr.params.map(param => param.name).join(', ');
      const body = expr.body.type === 'BlockStatement' ?
        `{\n        ${extractFunctionBody(expr.body)}\n      }` :
        generateExpression(expr.body);
      return expr.type === 'ArrowFunctionExpression' ?
        `(${params}) => ${body}` :
        `function(${params}) ${body}`;
    case 'ConditionalExpression':
      return `${generateExpression(expr.test)} ? ${generateExpression(expr.consequent)} : ${generateExpression(expr.alternate)}`;
    case 'LogicalExpression':
      return `${generateExpression(expr.left)} ${expr.operator} ${generateExpression(expr.right)}`;
    case 'ThisExpression':
      return 'this';
    default:
      return '';
  }
}

/**
 * 生成函数调用代码
 * @param {Object} callExpr 函数调用节点
 * @returns {string} 生成的代码
 */
function generateCallExpression(callExpr) {
  if (!callExpr) return '';
  
  const callee = callExpr.callee.type === 'MemberExpression' ?
    `${generateExpression(callExpr.callee.object)}.${callExpr.callee.property.name}` :
    generateExpression(callExpr.callee);
  
  const args = callExpr.arguments.map(arg => {
    if (arg.type === 'ObjectExpression') {
      return `{${arg.properties.map(prop => {
        const key = prop.key.name || prop.key.value;
        const value = generateExpression(prop.value);
        return `${key}: ${value}`;
      }).join(', ')}}`;
    }
    return generateExpression(arg);
  }).join(', ');
  
  return `${callee}(${args})`;
}

/**
 * 转换小程序组件属性为Vue props
 * @param {Array} properties 小程序组件属性数组
 * @returns {Object} Vue props对象
 */
function transformProperties(properties) {
  const result = {};

  // 处理属性
  properties.forEach((prop) => {
    if (prop.key && (prop.key.name || prop.key.value)) {
      const key = prop.key.name || prop.key.value;
      
      // 处理属性值
      if (prop.value) {
        if (prop.value.type === "ObjectExpression") {
          // 如果属性值是对象表达式，查找 default 值
          let defaultValue = null;
          let defaultValueType = null;
          prop.value.properties.forEach((p) => {
            if (p.key && (p.key.name === 'default' || p.key.value === 'default')) {
              if (p.value.type === "Literal" || p.value.type === "NumericLiteral" || p.value.type === "StringLiteral" || p.value.type === "BooleanLiteral") {
                defaultValue = p.value.value;
                defaultValueType = typeof defaultValue;
              }
            }
          });
          result[key] = { 
            default: defaultValue,
            type: defaultValueType
          };
        } else if (prop.value.type === "Literal" || prop.value.type === "NumericLiteral" || prop.value.type === "StringLiteral" || prop.value.type === "BooleanLiteral") {
          // 如果属性值是字面量，直接使用
          const value = prop.value.value;
          result[key] = { 
            default: value,
            type: typeof value
          };
        } else {
          // 其他情况，使用 null
          result[key] = { 
            default: null,
            type: null
          };
        }
      }
    }
  });

  return result;
}

/**
 * 转换小程序数据监听器为Vue watch
 * @param {Array} observers 小程序数据监听器数组
 * @returns {Object} Vue watch对象
 */
function transformObservers(observers) {
  const result = {};

  // 简化实现，实际需要处理更复杂的情况
  observers.forEach((observer) => {
    if (observer.value && observer.value.type === "ObjectExpression") {
      observer.value.properties.forEach((p) => {
        if (p.key && (p.key.name || p.key.value)) {
          const key = p.key.name || p.key.value;
          // 将路径形式的监听器转换为嵌套的watch
          const path = key.split(".");
          if (path.length === 1) {
            result[key] = "/* 转换后的监听器方法 */";
          } else {
            // 处理多层路径的监听器，如'user.name'
            const rootKey = path[0];
            if (!result[rootKey]) {
              result[rootKey] = {
                handler: "/* 转换后的监听器方法 */",
                deep: true,
              };
            }
          }
        }
      });
    }
  });

  return result;
}

/**
 * 生成Vue组件内容
 * @param {Object} vueComponent Vue组件对象
 * @returns {string} 生成的Vue组件字符串
 */
function generateComponentContent(vueComponent) {
  let content = [];

  // 处理导入语句
  if (vueComponent.imports && vueComponent.imports.length > 0) {
    content.push(vueComponent.imports.join('\n'));
    content.push(''); // 空行
  }

  content.push('export default {');

  // 处理 props（放在第一位）
  if (vueComponent.props && Object.keys(vueComponent.props).length > 0) {
    content.push('  props: {');
    for (const [key, value] of Object.entries(vueComponent.props)) {
      // 根据值的类型正确格式化 default 值
      let defaultValueStr;
      if (value.default === null) {
        defaultValueStr = 'null';
      } else if (value.type === 'string') {
        defaultValueStr = `'${value.default}'`; // 字符串值需要用引号包裹
      } else {
        defaultValueStr = value.default; // 数字、布尔值等直接使用
      }
      
      content.push(`    ${key}: { default: ${defaultValueStr} },`);
    }
    content.push('  },');
    content.push('');
  }

  // 处理 data（放在第二位）
  content.push('  data() {');
  content.push('    return {');
  
  // 添加组件原始数据
  if (vueComponent.data && Object.keys(vueComponent.data).length > 0) {
    for (const [key, value] of Object.entries(vueComponent.data)) {
      // 使用自定义的 JSON 序列化，确保 null 值被正确处理
      const valueStr = value === null ? 'null' : JSON.stringify(value);
      content.push(`      ${key}: ${valueStr},`);
    }
  }
  
  // 添加 SJS 导入的对象
  if (vueComponent.sjsImports && vueComponent.sjsImports.length > 0) {
    vueComponent.sjsImports.forEach(({ name }) => {
      content.push(`      ${name}: ${name}Module,`);
    });
  }
  
  content.push('    };');
  content.push('  },');
  content.push('');

  // 处理生命周期（放在第三位）
  if (vueComponent.lifeCycles && Object.keys(vueComponent.lifeCycles).length > 0) {
    for (const [key, value] of Object.entries(vueComponent.lifeCycles)) {
      // 格式化生命周期方法，确保缩进一致
      const formattedLifecycle = value.replace(/\n\s+/g, '\n    ');
      content.push(`  ${formattedLifecycle},`);
    }
    content.push('');
  }

  // 处理 methods（放在第四位）
  content.push('  methods: {');
  
  // 添加 setData 方法，确保使用 this.xx 而不是 this.data.xx
  content.push(`    setData(data) {
      // 直接设置属性到 this 上，不需要 this.data
      for (const key in data) {
        this[key] = data[key];
      }
    },`);
  
  // 添加其他方法（不包括生命周期方法）
  if (vueComponent.methods && Object.keys(vueComponent.methods).length > 0) {
    for (const [key, value] of Object.entries(vueComponent.methods)) {
      // 格式化方法定义，确保缩进一致
      const formattedMethod = value.replace(/\n\s+/g, '\n      ');
      content.push(`    ${formattedMethod},`);
    }
  }
  content.push('  },');
  content.push('');

  // 处理监听器（放在第五位）
  if (vueComponent.watch && Object.keys(vueComponent.watch).length > 0) {
    content.push('  watch: {');
    for (const [key, value] of Object.entries(vueComponent.watch)) {
      content.push(`    ${key}: ${
        typeof value === "object"
          ? JSON.stringify(value)
          : `function(newVal, oldVal) {
      // ${value}
    }`
      },`);
    }
    content.push('  },');
    content.push('');
  }

  content.push('};');
  
  // 合并所有行并返回格式化后的内容
  return content.join('\n');
}

/**
 * 检查是否为工具函数文件
 * @param {Object} jsAst JS的抽象语法树
 * @returns {boolean} 是否为工具函数文件
 */
function isUtilFile(jsAst) {
  // 检查是否只包含导出语句和函数定义
  return jsAst.program.body.every(node => 
    node.type === 'ExportNamedDeclaration' ||
    node.type === 'ExportDefaultDeclaration' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'VariableDeclaration'
  );
}

/**
 * 转换工具函数文件
 * @param {Object} jsAst JS的抽象语法树
 * @returns {Object} 转换后的内容
 */
function transformUtilFile(jsAst) {
  // 保持原有的导出形式
  const content = jsAst.program.body.map(node => {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration.type === 'VariableDeclaration') {
        const declarations = node.declaration.declarations.map(decl => {
          if (decl.init.type === 'ArrowFunctionExpression') {
            const params = decl.init.params.map(p => p.name).join(', ');
            const body = extractFunctionBody(decl.init.body.type === 'BlockStatement' ? decl.init.body : { body: [{ type: 'ReturnStatement', argument: decl.init.body }] });
            // 改进格式化
            return `export const ${decl.id.name} = (${params}) => {\n  ${body.trim().split('\n').join('\n  ')}\n};`;
          }
          return '';
        }).join('\n\n');
        return declarations;
      }
    }
    return '';
  }).filter(Boolean).join('\n\n');

  return {
    type: 'Script',
    content,
    isUtil: true
  };
}

module.exports = {
  transformJs,
};

