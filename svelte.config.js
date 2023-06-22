import preprocess from 'svelte-preprocess'
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/kit/vite'

const dev = process.argv.includes('dev');

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: [
    vitePreprocess(),
    preprocess({
      scss: {
        prependData: '@use "src/variables.scss" as *;',
      },
    }),
  ],

  vitePlugin: {
    inspector: {
      toggleKeyCombo: 'control-shift'
    }
  },

  kit: {
    adapter: adapter(),
    paths: {
      base: dev ? '' : process.env.BASE_PATH,
    }
  },
}

export default config
