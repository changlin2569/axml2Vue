
<template>
<div class="app-container">
  <div class="container">
    <div class="header">
      <text class="title">
        测试 Image 标签
      </text>
    </div>
  <div class="content">
      <image :src="imageUrl" mode="aspectFit" class="test-image" />
    <image src="/assets/images/logo.png" mode="scaleToFill" />
    </div>
  </div>
  </div>
</template>

<script>
import component from './test-image';
export default component;
</script>

<style src="./test-image.css"></style>
