import { expect, test } from './fixtures'

test.describe('Расписание дня', () => {
	test('показывает брони на сегодня и переключает дни', async ({ page }) => {
		await page.goto('/')

		await expect(page.getByRole('heading', { level: 1, name: 'Переговорная' })).toBeVisible()
		await expect(page.getByText('сегодня', { exact: true })).toBeVisible()
		await expect(page.getByRole('article', { name: /Стендап команды/ })).toBeVisible()

		await page.getByRole('button', { name: 'Следующий день' }).click()
		await expect(page).toHaveURL(/\?date=\d{4}-\d{2}-\d{2}/)
		await expect(page.getByRole('article', { name: /Ретро/ })).toBeVisible()

		await page.getByRole('button', { name: 'Сегодня' }).click()
		await expect(page).not.toHaveURL(/date=/)
		await expect(page.getByRole('article', { name: /Стендап команды/ })).toBeVisible()
	})

	test('дата из URL переживает перезагрузку', async ({ page }) => {
		await page.goto('/')
		await page.getByRole('button', { name: 'Следующий день' }).click()
		await expect(page.getByRole('article', { name: /Ретро/ })).toBeVisible()

		await page.reload()
		await expect(page.getByRole('article', { name: /Ретро/ })).toBeVisible()
	})

	test('ошибка загрузки и восстановление', async ({ page }) => {
		await page.goto('/?mock-fail-list=1')

		// По имени, а не просто по роли: у Next есть собственный скрытый role="alert" (route announcer)
		const alert = page.getByRole('alert', { name: 'Не удалось загрузить расписание' })
		await expect(alert).toContainText('Сервис бронирования временно недоступен')

		await page.evaluate(() => globalThis.mockServer?.setScenario({ failList: false }))
		await alert.getByRole('button', { name: 'Повторить' }).click()
		await expect(page.getByRole('article', { name: /Стендап команды/ })).toBeVisible()
	})
})
