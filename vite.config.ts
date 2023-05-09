import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    sveltekit(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@browsermt/bergamot-translator/worker/bergamot-translator-worker.wasm',
          dest: '_app/immutable/workers',
        },
        {
          src: 'node_modules/@browsermt/bergamot-translator/worker/bergamot-translator-worker.js',
          dest: '_app/immutable/workers',
        },
      ],
    }),
  ],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "src/variables.scss" as *;',
      },
    },
  },
  optimizeDeps: {
    exclude: ['svelte-radar-datatable', '@browsermt/bergamot-translator'],
  },
})
