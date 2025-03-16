/**
 * JS解析器
 * 负责将支付宝小程序的JS文件解析为AST（抽象语法树）
 */

const parser = require("@babel/parser");
const t = require("@babel/types");
const traverse = require("@babel/traverse").default;

function parseJs(jsContent) {
  const ast = parser.parse(jsContent, {
    sourceType: "module",
    plugins: [
      "classProperties",
      "objectRestSpread",
      "asyncGenerators",
      "dynamicImport",
      "optionalChaining",
      "nullishCoalescing",
      ["decorators", { decoratorsBeforeExport: true }],
      "exportDefaultFrom",
      "exportNamespaceFrom",
      "typescript",
      "jsx",
      // 添加完整的 async/await 支持
      ["syntax-async-functions", { "loose": true }],
      "functionBind",
      "functionSent",
      "throwExpressions"
    ],
    allowAwaitOutsideFunction: true, // 允许在函数外使用 await
    allowReturnOutsideFunction: true, // 允许在函数外使用 return
    tokens: true, // 保留token信息用于精准定位
  });

  // 遍历 AST，为每个节点添加原始代码
  traverse(ast, {
    enter(path) {
      const { node } = path;
      if (node.start !== undefined && node.end !== undefined) {
        // 保存原始代码
        node._sourceCode = jsContent.slice(node.start, node.end);
        
        // 为表达式语句的子节点也保存原始代码
        if (node.type === 'ExpressionStatement' && node.expression) {
          node.expression._sourceCode = jsContent.slice(node.expression.start, node.expression.end);
          
          // 处理函数调用
          if (node.expression.type === 'CallExpression') {
            const { callee, arguments: args } = node.expression;
            if (callee) {
              callee._sourceCode = jsContent.slice(callee.start, callee.end);
              if (callee.type === 'MemberExpression') {
                callee.object._sourceCode = jsContent.slice(callee.object.start, callee.object.end);
                callee.property._sourceCode = jsContent.slice(callee.property.start, callee.property.end);
              }
            }
            args.forEach(arg => {
              if (arg.start !== undefined && arg.end !== undefined) {
                arg._sourceCode = jsContent.slice(arg.start, arg.end);
                // 处理对象表达式的属性
                if (arg.type === 'ObjectExpression' && arg.properties) {
                  arg.properties.forEach(prop => {
                    if (prop.start !== undefined && prop.end !== undefined) {
                      prop._sourceCode = jsContent.slice(prop.start, prop.end);
                      if (prop.key && prop.key.start !== undefined && prop.key.end !== undefined) {
                        prop.key._sourceCode = jsContent.slice(prop.key.start, prop.key.end);
                      }
                      if (prop.value && prop.value.start !== undefined && prop.value.end !== undefined) {
                        prop.value._sourceCode = jsContent.slice(prop.value.start, prop.value.end);
                      }
                    }
                  });
                }
              }
            });
          }
        }
      }
    }
  });

  return ast;
}

/**
 * 分析小程序页面或组件的结构
 * @param {Object} ast JS的AST
 * @returns {Object} 分析结果，包含数据、方法、生命周期等
 */
function analyzePageStructure(ast) {
  const result = {
    data: null,
    methods: new Map(),
    lifeCycles: new Map(),
    properties: [],
    observers: [],
    apiCalls: []
  };

  traverse(ast, {
    CallExpression(path) {
      const { node } = path;
      if (
        t.isIdentifier(node.callee, { name: "Page" }) ||
        t.isIdentifier(node.callee, { name: "Component" })
      ) {
        const configObj = node.arguments[0];
        if (t.isObjectExpression(configObj)) {
          configObj.properties.forEach(prop => {
            if (t.isObjectProperty(prop) || t.isObjectMethod(prop)) {
              const key = prop.key.name;
              
              // 处理数据
              if (key === 'data') {
                result.data = extractDataFromProperty(prop);
              }
              // 处理方法
              else if (key === 'methods') {
                if (t.isObjectExpression(prop.value)) {
                  prop.value.properties.forEach(methodProp => {
                    if (t.isObjectMethod(methodProp) || 
                        (t.isObjectProperty(methodProp) && 
                         (t.isFunctionExpression(methodProp.value) || t.isArrowFunctionExpression(methodProp.value)))) {
                      result.methods.set(methodProp.key.name, methodProp);
                    }
                  });
                }
              }
              // 处理组件属性（props）
              else if (key === 'properties' || key === 'props') {
                if (t.isObjectExpression(prop.value)) {
                  result.properties = prop.value.properties;
                }
              }
              // 处理生命周期和其他方法
              else if (t.isObjectMethod(prop) || 
                      (t.isObjectProperty(prop) && 
                       (t.isFunctionExpression(prop.value) || t.isArrowFunctionExpression(prop.value)))) {
                if (isLifecycleMethod(key)) {
                  result.lifeCycles.set(key, prop);
                } else {
                  result.methods.set(key, prop);
                }
              }
            }
          });
        }
      }
    }
  });

  return result;
}

/**
 * 检查方法名是否为生命周期方法
 * @param {string} methodName 方法名
 * @returns {boolean} 是否为生命周期方法
 */
function isLifecycleMethod(methodName) {
  const lifecycleMethods = [
    'onLoad',
    'onShow',
    'onReady',
    'onHide',
    'onUnload',
    'created',
    'attached',
    'ready',
    'detached',
    'error',
    'didMount',
    'didUpdate',
    'didUnmount',
    'didHide',
    'didShow'
  ];
  return lifecycleMethods.includes(methodName);
}

/**
 * 从属性中提取数据对象
 * @param {Object} prop 属性节点
 * @returns {Object} 数据对象
 */
function extractDataFromProperty(prop) {
  if (t.isObjectProperty(prop) && t.isObjectExpression(prop.value)) {
    const result = {};
    prop.value.properties.forEach(p => {
      if (t.isObjectProperty(p)) {
        const key = p.key.name || p.key.value;
        if (t.isArrayExpression(p.value)) {
          result[key] = p.value.elements.map(element => {
            if (t.isObjectExpression(element)) {
              const obj = {};
              element.properties.forEach(prop => {
                if (t.isObjectProperty(prop)) {
                  obj[prop.key.name || prop.key.value] = 
                    t.isStringLiteral(prop.value) ? prop.value.value :
                    t.isNumericLiteral(prop.value) ? prop.value.value :
                    undefined;
                }
              });
              return obj;
            }
            return undefined;
          }).filter(Boolean);
        } else if (t.isLiteral(p.value)) {
          result[key] = p.value.value;
        } else if (t.isNullLiteral(p.value) || (t.isIdentifier(p.value) && p.value.name === 'null')) {
          // 处理 null 值
          result[key] = null;
        }
      }
    });
    return result;
  }
  return null;
}

function extractProperties(propertiesNode) {
  return propertiesNode.properties.map((prop) => ({
    name: prop.key.name,
    type: prop.value.type === "Identifier" ? prop.value.name : "unknown",
    value: prop.value,
  }));
}

function extractObservers(observersNode) {
  const observers = [];

  if (t.isArrayExpression(observersNode)) {
    observersNode.elements.forEach((element) => {
      if (
        t.isFunctionExpression(element) ||
        t.isArrowFunctionExpression(element)
      ) {
        observers.push({
          params: element.params.map((p) => p.name),
          body: element.body,
        });
      }
    });
  }

  return observers;
}

module.exports = {
  parseJs,
  analyzePageStructure,
};
