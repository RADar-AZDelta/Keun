import preprocess from 'svelte-preprocess'
import staticAdapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: [
    vitePreprocess(),
    preprocess({
      scss: {},
    }),
  ],

  vitePlugin: {
    inspector: {
      toggleKeyCombo: 'control-shift',
    },
  },

  kit: {
    adapter: staticAdapter({ fallback: 'index.html', pages: 'public', assets: 'public', precompress: false }),
    paths: {
      base: process.argv.includes('dev') ? '' : '/Keun',
    },
    alias: {
      $lib: 'src/lib',
      '$lib/*': 'src/lib/*',
    },
  },
}

export default config
