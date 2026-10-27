/** @type {import('lint-staged').Configuration} */
const config = {
	'*.{ts,tsx,js,mjs,cjs}': ['eslint --fix --max-warnings=0 --no-warn-ignored', 'prettier --write'],
	'*.{css,scss}': ['stylelint --fix', 'prettier --write'],
	'*.{json,md,yml,yaml}': ['prettier --write']
}

export default config
