import { test as base, expect } from '@playwright/test'

/**
 * Каждый тест стартует с чистого mock-сервера: демо-данные и сценарий по умолчанию,
 * без искусственной задержки. Состояние mock-API живёт в localStorage/sessionStorage вкладки.
 */
export const test = base.extend({
	page: async ({ page }, use) => {
		await page.addInitScript(() => {
			if (!window.sessionStorage.getItem('e2e:initialized')) {
				window.localStorage.clear()
				window.sessionStorage.clear()
				window.sessionStorage.setItem('e2e:initialized', '1')
				window.sessionStorage.setItem('meeting-room-booking:mock-scenario:v1', JSON.stringify({ latencyMs: 0 }))
			}
		})
		await use(page)
	}
})

export { expect }
