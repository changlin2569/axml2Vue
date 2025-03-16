
<template>
<div class="app-container">
  <div :class="`container ${test} ${getClassName()}`">
    <div class="header">
      <text class="title">
        支付宝小程序示例
      </text>
    </div>
  <div class="content content-ss">
      <div v-if="showContent" class="content-item">
        <text>
          条件渲染内容
        </text>
      </div>
    <div v-for="(item, index) in items" class="list-item">
        <text :key="item.key">
          {{idx}}: {{item.name}}
        </text>
      </div>
    <text class="btn" @click="handleTap()">
        点击按钮
      </text>
    <text class="btn-stop" @click="handleCatchTap()">
        阻止冒泡按钮
      </text>
    <text>
        动态获取文本内容：{{ getText() }}
      </text>

    <loading id="123" :loading="true" />
    <content message="hello" />
    </div>
  </div>
  </div>
</template>

<script>
import component from './index';
export default component;
</script>

<style src="./index.css"></style>
