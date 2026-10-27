import { screen, within } from '@testing-library/react'

import { mockApi } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import { freezeTime } from '@/test/time'

import { DaySchedule } from './day-schedule'

const TODAY = '2026-10-27'

const renderSchedule = (date = TODAY) => renderWithProviders(<DaySchedule date={date} now={new Date()} />)

beforeEach(() => {
	freezeTime(`${TODAY}T12:00:00`)
})

describe('DaySchedule', () => {
	it('показывает загрузку, затем брони по порядку и отмечает прошедшие', async () => {
		mockApi.store.reset([
			{ id: 'b', date: TODAY, start: '14:00', end: '15:30', title: 'Планирование' },
			{ id: 'a', date: TODAY, start: '09:30', end: '10:00' }
		])

		renderSchedule()
		expect(screen.getByRole('status')).toHaveTextContent('Загружаем брони…')

		const items = await screen.findAllByRole('article')
		expect(items.map(item => item.getAttribute('aria-label'))).toEqual([
			'09:30–10:00, Без названия',
			'14:00–15:30, Планирование'
		])
		expect(within(items[0]!).getByText('Прошла')).toBeInTheDocument()
		expect(within(items[1]!).queryByText('Прошла')).not.toBeInTheDocument()
		expect(within(items[1]!).getByText('1 ч 30 мин')).toBeInTheDocument()
	})

	it('пустое состояние', async () => {
		renderSchedule()
		expect(await screen.findByText(/броней нет/)).toBeInTheDocument()
	})

	it('ошибка загрузки с возможностью повторить', async () => {
		mockApi.scenario.set({ failList: true })
		const { user } = renderSchedule()

		const alert = await screen.findByRole('alert')
		expect(alert).toHaveTextContent('Не удалось загрузить брони')
		expect(alert).toHaveTextContent('Сервис бронирования временно недоступен.')

		mockApi.scenario.set({ failList: false })
		mockApi.store.reset([{ id: 'a', date: TODAY, start: '15:00', end: '16:00', title: 'Демо' }])
		await user.click(within(alert).getByRole('button', { name: 'Повторить' }))

		expect(await screen.findByRole('article', { name: '15:00–16:00, Демо' })).toBeInTheDocument()
	})
})
