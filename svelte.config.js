import preprocess from 'svelte-preprocess'
import autoAdapter from '@sveltejs/adapter-auto';
import staticAdapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/kit/vite'

const dev = process.argv.includes('dev');

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
      toggleKeyCombo: 'control-shift'
    }
  },

  kit: {
    adapter: process.env.PUBLIC_CLOUD_DATABASE_IMPLEMENTATION === "none" ? staticAdapter({ fallback: 'index.html' }) : autoAdapter(),
    paths: {
      base: dev ? '' : '/Keun',
    }
  },
}

export default config
