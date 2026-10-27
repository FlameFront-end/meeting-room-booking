import type { Locator, Page } from '@playwright/test'

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

/** Выбор значения в собственном Select: открыть список и кликнуть пункт. */
const pick = async (scope: Locator, name: string, value: string) => {
	await scope.getByRole('combobox', { name }).click()
	await scope.getByRole('option', { name: value }).click()
}

test.describe('Бронирование', () => {
	test('создание брони', async ({ page }) => {
		await openTomorrow(page)
		await page.getByRole('button', { name: 'Новая бронь' }).click()

		const dialog = page.getByRole('dialog', { name: 'Новая бронь' })
		await expect(dialog.getByRole('combobox', { name: 'Начало' })).toHaveText('09:00')
		await expect(dialog.getByRole('combobox', { name: 'Окончание' })).toHaveText('10:00')
		await dialog.getByLabel(/^Название/).fill('Синк с дизайном')
		await dialog.getByRole('button', { name: 'Забронировать' }).click()

		await expect(dialog).toBeHidden()
		await expect(page.getByText('Бронь создана')).toBeVisible()
		await expect(page.getByRole('article', { name: '09:00–10:00, Синк с дизайном' })).toBeVisible()
	})

	test('редактирование брони', async ({ page }) => {
		await openTomorrow(page)
		await page.getByRole('button', { name: 'Изменить бронь 10:00–11:00' }).click()

		const dialog = page.getByRole('dialog', { name: 'Изменить бронь' })
		await expect(dialog.getByLabel(/^Название/)).toHaveValue('Ретро')
		await pick(dialog, 'Окончание', '10:30')
		await dialog.getByRole('button', { name: 'Сохранить' }).click()

		await expect(dialog).toBeHidden()
		await expect(page.getByRole('article', { name: '10:00–10:30, Ретро' })).toBeVisible()
	})

	test('удаление брони с подтверждением', async ({ page }) => {
		await openTomorrow(page)
		await page.getByRole('button', { name: 'Изменить бронь 10:00–11:00' }).click()
		await page
			.getByRole('dialog', { name: 'Изменить бронь' })
			.getByRole('button', { name: 'Удалить бронь 10:00–11:00' })
			.click()

		const dialog = page.getByRole('dialog', { name: 'Удалить бронь?' })
		await dialog.getByRole('button', { name: 'Удалить' }).click()

		await expect(dialog).toBeHidden()
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(page.getByText('Бронь удалена')).toBeVisible()
		await expect(page.getByRole('article', { name: /Ретро/ })).toBeHidden()
	})

	test('409: слот заняли в последний момент — данные формы на месте, список обновлён', async ({ page }) => {
		await openTomorrow(page, '?mock-conflict=once')
		await page.getByRole('button', { name: 'Новая бронь' }).click()

		const dialog = page.getByRole('dialog', { name: 'Новая бронь' })
		await pick(dialog, 'Начало', '14:00')
		await dialog.getByLabel(/^Название/).fill('Важная встреча')
		await dialog.getByRole('button', { name: 'Забронировать' }).click()

		const alert = dialog.getByRole('alert', { name: 'Время уже занято' })
		await expect(alert).toContainText('14:00–15:00 · Бронь другого сотрудника')
		await expect(dialog.getByRole('combobox', { name: 'Начало' })).toHaveText('14:00')
		await expect(dialog.getByLabel(/^Название/)).toHaveValue('Важная встреча')

		const rival = page.getByRole('article', { name: '14:00–15:00, Бронь другого сотрудника' })
		await expect(rival).toContainText('Пересекается')

		// Другое время — и бронь создаётся с тем же названием
		await pick(dialog, 'Начало', '15:00')
		await expect(alert).toBeHidden()
		await dialog.getByRole('button', { name: 'Забронировать' }).click()
		await expect(page.getByRole('article', { name: '15:00–16:00, Важная встреча' })).toBeVisible()
	})

	test('Esc закрывает форму и возвращает фокус', async ({ page }) => {
		await openTomorrow(page)
		const editButton = page.getByRole('button', { name: 'Изменить бронь 10:00–11:00' })
		await editButton.click()

		const dialog = page.getByRole('dialog', { name: 'Изменить бронь' })
		// Фокус внутри окна. На десктопе — на названии; на тач-устройствах автофокуса в поле нет,
		// чтобы не открывать клавиатуру поверх формы
		await expect(dialog.locator(':focus')).toHaveCount(1)
		if (!test.info().project.name.includes('mobile')) {
			await expect(dialog.getByLabel(/^Название/)).toBeFocused()
		}

		// Esc в открытом списке закрывает только список, а не окно
		const start = dialog.getByRole('combobox', { name: 'Начало' })
		await start.focus()
		await page.keyboard.press('ArrowDown')
		await expect(start).toHaveAttribute('aria-expanded', 'true')
		await page.keyboard.press('Escape')
		await expect(start).toHaveAttribute('aria-expanded', 'false')
		await expect(dialog).toBeVisible()

		await page.keyboard.press('Escape')

		await expect(dialog).toBeHidden()
		await expect(editButton).toBeFocused()
	})

	test('клик по свободному окну открывает форму с этим временем', async ({ page }) => {
		await openTomorrow(page)
		// С клавиатуры — начало окна; мышью было бы время под курсором
		await page.getByRole('button', { name: /Свободно 12:00–18:00/ }).focus()
		await page.keyboard.press('Enter')

		const dialog = page.getByRole('dialog', { name: 'Новая бронь' })
		await expect(dialog.getByRole('combobox', { name: 'Начало' })).toHaveText('12:00')
		await expect(dialog.getByRole('combobox', { name: 'Окончание' })).toHaveText('13:00')
	})
})
