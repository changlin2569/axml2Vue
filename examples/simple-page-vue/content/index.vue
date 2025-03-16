
<template>
<div class="app-container">
  <import-sjs from="./index.sjs" name="m" />
<text>
    js message: {{message}}
  </text>
<text>
    sjs message: {{m.message}}
  </text>
<text>
    formatted value: {{m.format(value)}}
  </text>
<img :src="imageUrl" />
<text>
    x: {{x}}
  </text>
<text>
    z: {{z}}
  </text>
  </div>
</template>

<script>
import component from './index';
export default component;
</script>

<style src="./index.css"></style>
