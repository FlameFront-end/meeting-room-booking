import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: { '@': path.resolve(import.meta.dirname, 'src') }
	},
	test: {
		environment: 'jsdom',
		environmentOptions: {
			// Относительные запросы (/api/...) резолвятся от этого origin, как в браузере
			jsdom: { url: 'http://localhost:3000' }
		},
		globals: true,
		setupFiles: ['./src/test/setup.ts'],
		include: ['src/**/*.test.{ts,tsx}'],
		restoreMocks: true,
		unstubGlobals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text-summary', 'html', 'lcov'],
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/index.ts', 'src/mock-server/browser.ts'],
			thresholds: {
				// Бизнес-правила — ядро задачи, для них планка жёстче
				'src/entities/booking/model/**': { statements: 95, branches: 90, functions: 100, lines: 95 }
			}
		}
	}
})
