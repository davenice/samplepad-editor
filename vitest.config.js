import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/util/kitFile*.js', 'src/state/models.js'],
      exclude: ['tests/**', 'node_modules/**']
    }
  },
  resolve: {
    alias: {
      component: resolve(process.cwd(), 'src/component'),
      state: resolve(process.cwd(), 'src/state'),
      actions: resolve(process.cwd(), 'src/actions'),
      menu: resolve(process.cwd(), 'src/menu'),
      util: resolve(process.cwd(), 'src/util'),
      css: resolve(process.cwd(), 'src/css'),
      const: resolve(process.cwd(), 'src/const.js')
    }
  }
})
