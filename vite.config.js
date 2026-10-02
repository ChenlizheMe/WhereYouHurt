import { defineConfig } from 'vite'

// Relative assets keep the build usable on GitHub Pages project URLs and local previews.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules/three-stdlib')) return 'three'
          if (id.includes('node_modules/@react-three') || id.includes('node_modules/@react-spring')) return 'r3f'
          if (id.includes('node_modules/react')) return 'react'
        },
      },
    },
  },
})
