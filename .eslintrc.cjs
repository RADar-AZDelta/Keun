module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
	plugins: ['svelte3', '@typescript-eslint'],
	ignorePatterns: ['*.cjs'],
	overrides: [{ files: ['*.svelte'], processor: 'svelte3/svelte3' }],
	settings: {
	  'svelte3/typescript': () => require('typescript'),
	},
	parserOptions: {
	  sourceType: 'module',
	  ecmaVersion: 2020,
	},
	env: {
	  browser: true,
	  es2017: true,
	  node: true,
	},
	rules: {
	  quotes: ['error', 'single'],
	  indent: ['error', 2],
	  'no-multi-spaces': ['error'],
	  'import/order': [
		1,
		{
		  groups: ['external', 'builtin', 'internal', 'sibling', 'parent', 'index'],
		  pathGroups: [
			{ pattern: '$lib', group: 'internal' },
			{ pattern: '$lib/**', group: 'internal' },
			{ pattern: 'lib/**', group: 'internal' },
			{ pattern: 'lib', group: 'internal' },
			{ pattern: 'src/**', group: 'internal' },
			{ pattern: 'src', group: 'internal' },
			{ pattern: 'static/**', group: 'internal' },
			{ pattern: 'static', group: 'internal' },
			{ pattern: 'public/**', group: 'internal' },
			{ pattern: 'public', group: 'internal' },
			{ pattern: 'submodules', group: 'external' },
			{ pattern: 'submodules/**', group: 'external' },
		  ],
		  pathGroupsExcludedImportTypes: ['internal'],
		  alphabetize: {
			order: 'asc',
			caseInsensitive: true,
		  },
		},
	  ],
	},
  }