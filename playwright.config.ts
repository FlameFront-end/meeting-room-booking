import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`
const isCI = Boolean(process.env.CI)

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	...(isCI ? { workers: 2 } : {}),
	reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'on-failure' }]],

	use: {
		baseURL: BASE_URL,
		locale: 'ru-RU',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},

	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		// Адаптивность — часть требований: тот же сценарий на узком экране
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	],

	webServer: {
		// В CI сборка уже сделана отдельным шагом — запускаем прод-сервер. Локально — dev.
		command: isCI ? `npm run start -- --port ${PORT}` : `npm run dev -- --port ${PORT}`,
		url: BASE_URL,
		reuseExistingServer: !isCI,
		timeout: 120_000
	}
})
