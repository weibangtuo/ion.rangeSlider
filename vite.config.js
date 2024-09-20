import { defineConfig } from 'vite'
import pkg from './package.json'

const fileName = 'ion.rangeSlider'

const build = {
  rollupOptions: {
    output: {
      assetFileNames: (chunkInfo) => {
        if (chunkInfo.name === 'style.css')
          return `${fileName}.min.css`
      }
    }
  }
}

// build lib
if (process.env.LIB_NAME) {
  const config = {
    lib: {
      entry: './src/lib.js',
      name: 'IonRangeSlider',
      fileName
    }
  }

  if (!config[process.env.LIB_NAME]) {
    throw new Error('LIB_NAME is not defined or is not valid')
  }
  build.lib = config[process.env.LIB_NAME]
  build.outDir = 'lib'
  build.emptyOutDir = false
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version)
  },
  server: {
    open: '/index.html'
  },
  build
})
