// 测试jsParser修改
const { parseJs, analyzePageStructure } = require('./src/parser/jsParser.js');

// 模拟小程序JS内容，包含methods对象
const jsContent = `
Page({
  methods: {
    handleTap: function() { 
      console.log('tap'); 
    },
    handleClick: () => { 
      console.log('click'); 
    }
  }
});
`;

// 解析JS内容
const ast = parseJs(jsContent);

// 分析页面结构
const result = analyzePageStructure(ast);

// 输出methods信息
console.log('Methods size:', result.methods.size);
result.methods.forEach((method, key) => {
  console.log('Method:', key, method.type);
});