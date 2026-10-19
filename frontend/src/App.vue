<script setup lang="ts">
</script>

<template>
  <router-view />
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  font-family: var(--font-sans);
  color: var(--color-text-main);
  background-color: var(--color-bg-page);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-sans);
  color: var(--color-text-main);
}

* {
  box-sizing: border-box;
}

a {
  color: inherit;
  text-decoration: none;
}

button, input, optgroup, select, textarea, .el-button, .el-input__inner, .el-textarea__inner, .el-table {
  font-family: var(--font-sans) !important;
}
</style>
