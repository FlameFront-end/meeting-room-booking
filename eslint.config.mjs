import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'
import testingLibrary from 'eslint-plugin-testing-library'
import tseslint from 'typescript-eslint'

/**
 * Слои архитектуры сверху вниз. Слой может импортировать только из слоёв ниже себя.
 * app (роутинг Next) → core → screens → widgets → features → entities → shared
 * mock-server — имитация бэкенда, видит только entities и shared.
 */
const LAYERS = ['core', 'screens', 'widgets', 'features', 'entities', 'shared']

const layerZones = LAYERS.flatMap((layer, index) => {
	const upper = LAYERS.slice(0, index)
	return [
		...upper.map(from => ({
			target: `./src/${layer}`,
			from: `./src/${from}`,
			message: `Слой "${layer}" не может зависеть от вышележащего слоя "${from}".`
		})),
		...(layer === 'core'
			? []
			: [
					{
						target: `./src/${layer}`,
						from: './src/mock-server',
						message: 'Приложение не должно знать о mock-сервере. Он подключается только в core.'
					}
				])
	]
})

const mockServerZones = ['core', 'screens', 'widgets', 'features'].map(from => ({
	target: './src/mock-server',
	from: `./src/${from}`,
	message: 'mock-server — это «бэкенд»: ему доступны только entities и shared.'
}))

export default defineConfig([
	globalIgnores([
		'.next/**',
		'out/**',
		'coverage/**',
		'playwright-report/**',
		'test-results/**',
		'next-env.d.ts',
		'public/mockServiceWorker.js'
	]),

	js.configs.recommended,
	...nextVitals,
	...nextTs,
	...pluginQuery.configs['flat/recommended'],

	{
		files: ['**/*.{ts,tsx}'],
		extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
			'@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
			'@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			// Пустая строка в UI почти всегда значит «нет значения» — для строк || уместнее ??
			'@typescript-eslint/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true } }]
		}
	},

	{
		rules: {
			'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
			eqeqeq: ['error', 'always'],
			'prefer-const': 'error',
			'object-shorthand': 'error',
			'react/self-closing-comp': 'error',
			'react/jsx-no-useless-fragment': 'error',
			'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
			'import/no-duplicates': 'error',
			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
					pathGroups: [{ pattern: '@/**', group: 'internal' }],
					'newlines-between': 'always',
					alphabetize: { order: 'asc', caseInsensitive: true }
				}
			]
		}
	},

	// Архитектурные границы
	{
		files: ['src/**/*.{ts,tsx}'],
		rules: {
			'import/no-restricted-paths': ['error', { zones: [...layerZones, ...mockServerZones] }],
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@/entities/*/*', '@/features/*/*', '@/widgets/*/*', '@/screens/*/*'],
							message: 'Импортируй слайс через его публичный API (index.ts), без глубоких путей.'
						}
					]
				}
			]
		}
	},

	// Next-роутинг: тонкий слой, только сборка экранов и провайдеров
	{
		files: ['app/**/*.{ts,tsx}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@/entities/**', '@/features/**', '@/widgets/**', '@/mock-server/**'],
							message: 'app/ только собирает экраны (screens) и провайдеры (core).'
						}
					]
				}
			]
		}
	},

	// Тесты
	{
		files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
		...testingLibrary.configs['flat/react'],
		rules: {
			...testingLibrary.configs['flat/react'].rules,
			'@typescript-eslint/no-non-null-assertion': 'off',
			'no-restricted-imports': 'off'
		}
	},

	// E2E: в фикстурах Playwright есть параметр use(), который react-hooks принимает за хук React
	{
		files: ['e2e/**/*.ts'],
		rules: {
			'react-hooks/rules-of-hooks': 'off'
		}
	},

	// Конфиги и скрипты на JS не проходят через type-aware правила
	{
		files: ['**/*.{js,mjs,cjs}'],
		extends: [tseslint.configs.disableTypeChecked]
	},

	prettier
])
