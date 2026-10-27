/** @type {import('stylelint').Config} */
const config = {
	extends: ['stylelint-config-standard-scss', 'stylelint-config-recess-order'],
	rules: {
		// CSS Modules: классы в camelCase, чтобы обращаться styles.someClass
		'selector-class-pattern': [
			'^[a-z][a-zA-Z0-9]*$',
			{ message: 'Классы CSS Modules пишем в camelCase (styles.someClass)' }
		],
		'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
		'custom-property-pattern': null,
		'scss/dollar-variable-pattern': null,
		'scss/at-mixin-pattern': null,
		'color-named': 'never',
		'declaration-no-important': true,
		'max-nesting-depth': 3
	}
}

export default config
