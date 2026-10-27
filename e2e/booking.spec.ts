import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'

/**
 * Сценарии на завтра: результат не зависит от времени запуска,
 * а в демо-данных на завтра есть «Ретро» 10:00–11:00 и бронь без названия 11:00–12:00.
 */
const openTomorrow = async (page: Page, query = '') => {
	await page.goto(`/${query}`)
	await page.getByRole('button', { name: 'Следующий день' }).click()
	await expect(page.getByRole('article', { name: /Ретро/ })).toBeVisible()
}

test.describe('Бронирование', () => {
	test('создание брони', async ({ page }) => {
		await openTomorrow(page)
		await page.getByRole('button', { name: 'Новая бронь' }).click()

		const dialog = page.getByRole('dialog', { name: 'Новая бронь' })
		await expect(dialog.getByLabel('Начало')).toHaveValue('09:00')
		await expect(dialog.getByLabel('Окончание')).toHaveValue('10:00')
		await dialog.getByLabel('Название').fill('Синк с дизайном')
		await dialog.getByRole('button', { name: 'Забронировать' }).click()

		await expect(dialog).toBeHidden()
		await expect(page.getByText('Бронь создана')).toBeVisible()
		await expect(page.getByRole('article', { name: '09:00–10:00, Синк с дизайном' })).toBeVisible()
	})

	test('редактирование брони', async ({ page }) => {
		await openTomorrow(page)
		await page.getByRole('button', { name: 'Изменить бронь 10:00–11:00' }).click()

		const dialog = page.getByRole('dialog', { name: 'Изменить бронь' })
		await expect(dialog.getByLabel('Название')).toHaveValue('Ретро')
		await dialog.getByLabel('Окончание').selectOption('10:30')
		await dialog.getByRole('button', { name: 'Сохранить' }).click()

		await expect(dialog).toBeHidden()
		await expect(page.getByRole('article', { name: '10:00–10:30, Ретро' })).toBeVisible()
	})

	test('удаление брони с подтверждением', async ({ page }) => {
		await openTomorrow(page)
		await page.getByRole('button', { name: 'Удалить бронь 10:00–11:00' }).click()

		const dialog = page.getByRole('dialog', { name: 'Удалить бронь?' })
		await dialog.getByRole('button', { name: 'Удалить' }).click()

		await expect(dialog).toBeHidden()
		await expect(page.getByText('Бронь удалена')).toBeVisible()
		await expect(page.getByRole('article', { name: /Ретро/ })).toBeHidden()
	})

	test('409: слот заняли в последний момент — данные формы на месте, список обновлён', async ({ page }) => {
		await openTomorrow(page, '?mock-conflict=once')
		await page.getByRole('button', { name: 'Новая бронь' }).click()

		const dialog = page.getByRole('dialog', { name: 'Новая бронь' })
		await dialog.getByLabel('Начало').selectOption('14:00')
		await dialog.getByLabel('Название').fill('Важная встреча')
		await dialog.getByRole('button', { name: 'Забронировать' }).click()

		const alert = dialog.getByRole('alert').filter({ hasText: 'Это время уже занято' })
		await expect(alert).toContainText('14:00–15:00 — Бронь другого сотрудника')
		await expect(dialog.getByLabel('Начало')).toHaveValue('14:00')
		await expect(dialog.getByLabel('Название')).toHaveValue('Важная встреча')

		const rival = page.getByRole('article', { name: '14:00–15:00, Бронь другого сотрудника' })
		await expect(rival).toContainText('Пересекается')

		// Другое время — и бронь создаётся с тем же названием
		await dialog.getByLabel('Начало').selectOption('15:00')
		await expect(alert).toBeHidden()
		await dialog.getByRole('button', { name: 'Забронировать' }).click()
		await expect(page.getByRole('article', { name: '15:00–16:00, Важная встреча' })).toBeVisible()
	})

	test('Esc закрывает форму и возвращает фокус', async ({ page }) => {
		await openTomorrow(page)
		const editButton = page.getByRole('button', { name: 'Изменить бронь 10:00–11:00' })
		await editButton.click()

		const dialog = page.getByRole('dialog', { name: 'Изменить бронь' })
		await expect(dialog.getByLabel('Дата')).toBeFocused()
		await page.keyboard.press('Escape')

		await expect(dialog).toBeHidden()
		await expect(editButton).toBeFocused()
	})
})
