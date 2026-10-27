import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'

import type { Booking } from '@/entities/booking'
import { mockApi } from '@/test/mock-api'
import { renderWithProviders } from '@/test/render'
import { freezeTime } from '@/test/time'

import { BookingDayScreen } from './booking-day-screen'

/**
 * Интеграционные тесты экрана: настоящие фичи, хуки и mock-сервер (msw/node).
 * Подменяется только роутер Next — выбранная дата берётся из ?date=.
 */

const navigation = vi.hoisted(() => ({ search: new URLSearchParams(), replace: vi.fn() }))

vi.mock('next/navigation', () => ({
	useSearchParams: () => navigation.search,
	useRouter: () => ({ replace: navigation.replace }),
	usePathname: () => '/'
}))

const TODAY = '2026-10-27'
const TOMORROW = '2026-10-28'
const YESTERDAY = '2026-10-26'

const RETRO: Booking = { id: 'retro', date: TOMORROW, start: '10:00', end: '11:00', title: 'Ретро' }
const DEMO: Booking = { id: 'demo', date: TOMORROW, start: '14:00', end: '15:00', title: 'Демо' }

const renderScreen = (date = TOMORROW) => {
	navigation.search = new URLSearchParams(date === TODAY ? '' : `date=${date}`)
	return renderWithProviders(<BookingDayScreen />)
}

const openCreateForm = async (user: ReturnType<typeof renderScreen>['user']) => {
	await screen.findByRole('article', { name: /Ретро/ })
	await user.click(screen.getByRole('button', { name: 'Новая бронь' }))
	return screen.getByRole('dialog', { name: 'Новая бронь' })
}

beforeEach(() => {
	freezeTime(`${TODAY}T12:00:00`)
	mockApi.store.reset([RETRO, DEMO])
})

describe('Создание брони', () => {
	it('предлагает первый свободный час и создаёт бронь', async () => {
		const success = vi.spyOn(toast, 'success')
		const { user } = renderScreen()
		const dialog = await openCreateForm(user)

		const form = within(dialog)
		expect(form.getByLabelText('Дата')).toHaveValue(TOMORROW)
		expect(form.getByLabelText('Дата')).toHaveFocus()
		expect(form.getByLabelText('Начало')).toHaveValue('09:00')
		expect(form.getByLabelText('Окончание')).toHaveValue('10:00')
		// Занятое время видно прямо в форме
		expect(await form.findByText('10:00–11:00')).toBeInTheDocument()

		await user.type(form.getByLabelText('Название'), 'Синк с дизайном')
		await user.click(form.getByRole('button', { name: 'Забронировать' }))

		expect(await screen.findByRole('article', { name: '09:00–10:00, Синк с дизайном' })).toBeInTheDocument()
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(success).toHaveBeenCalledWith('Бронь создана', expect.anything())
	})

	it('смена начала сдвигает окончание с сохранением длительности', async () => {
		const { user } = renderScreen()
		const form = within(await openCreateForm(user))

		await user.selectOptions(form.getByLabelText('Окончание'), '10:30')
		await user.selectOptions(form.getByLabelText('Начало'), '15:00')

		expect(form.getByLabelText('Окончание')).toHaveValue('16:30')
		expect(form.getByText('Длительность: 1 ч 30 мин')).toBeInTheDocument()
	})

	it('живые подсказки по правилам и блокировка отправки', async () => {
		const { user } = renderScreen()
		const form = within(await openCreateForm(user))
		const end = form.getByLabelText('Окончание')

		await user.selectOptions(end, '11:15')
		expect(end).toHaveAccessibleDescription(/Максимальная длительность — 2 ч/)
		expect(end).toBeInvalid()

		await user.selectOptions(form.getByLabelText('Начало'), '10:30')
		await user.selectOptions(end, '11:30')
		expect(form.getByText(/Время пересекается с другой бронью/)).toBeInTheDocument()
		const [retroSlot, demoSlot] = within(form.getByRole('region', { name: 'Занято в этот день' })).getAllByRole(
			'listitem'
		)
		expect(retroSlot).toHaveTextContent(/10:00–11:00.*пересекается с выбранным временем/)
		expect(demoSlot).not.toHaveTextContent(/пересекается/)

		await user.click(form.getByRole('button', { name: 'Забронировать' }))
		// Запрос не ушёл: форма открыта, в хранилище по-прежнему две брони
		expect(form.getByLabelText('Начало')).toHaveFocus()
		expect(mockApi.store.listByDate(TOMORROW)).toHaveLength(2)

		// Касание границ — не конфликт
		await user.selectOptions(form.getByLabelText('Начало'), '11:00')
		expect(form.queryByText(/Время пересекается/)).not.toBeInTheDocument()
	})

	it('409: данные сохраняются, список обновляется, конфликт подсвечен', async () => {
		mockApi.scenario.set({ conflict: 'once' })
		const { user } = renderScreen()
		const form = within(await openCreateForm(user))

		await user.selectOptions(form.getByLabelText('Начало'), '12:00')
		await user.type(form.getByLabelText('Название'), 'Важная встреча')
		await user.click(form.getByRole('button', { name: 'Забронировать' }))

		const alert = await form.findByRole('alert')
		expect(alert).toHaveTextContent('Это время уже занято')
		expect(alert).toHaveTextContent('12:00–13:00 — Бронь другого сотрудника')

		// Форма не закрылась и ничего не потеряла
		expect(form.getByLabelText('Начало')).toHaveValue('12:00')
		expect(form.getByLabelText('Окончание')).toHaveValue('13:00')
		expect(form.getByLabelText('Название')).toHaveValue('Важная встреча')

		// Расписание за окном обновилось и подсветило чужую бронь
		const rival = await screen.findByRole('article', { name: '12:00–13:00, Бронь другого сотрудника' })
		expect(within(rival).getByText('Пересекается')).toBeInTheDocument()

		// Выбрал другое время — устаревшее сообщение исчезает, отправка проходит
		await user.selectOptions(form.getByLabelText('Начало'), '15:00')
		expect(form.queryByRole('alert')).not.toBeInTheDocument()
		await user.click(form.getByRole('button', { name: 'Забронировать' }))
		expect(await screen.findByRole('article', { name: '15:00–16:00, Важная встреча' })).toBeInTheDocument()
	})

	it('на прошедшую дату создание недоступно', async () => {
		mockApi.store.reset([{ id: 'old', date: YESTERDAY, start: '10:00', end: '11:00', title: 'Старая' }])
		renderScreen(YESTERDAY)

		const article = await screen.findByRole('article', { name: /Старая/ })
		expect(screen.getByRole('button', { name: 'Новая бронь' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'Новая бронь' })).toHaveAccessibleDescription(
			'Дата уже прошла — создать бронь нельзя.'
		)
		// Прошедшие брони только для чтения
		expect(within(article).queryByRole('button')).not.toBeInTheDocument()
	})
})

describe('Редактирование брони', () => {
	it('бронь не конфликтует сама с собой и сохраняется', async () => {
		const { user } = renderScreen()
		await user.click(await screen.findByRole('button', { name: 'Изменить бронь 10:00–11:00' }))
		const form = within(screen.getByRole('dialog', { name: 'Изменить бронь' }))

		expect(form.getByLabelText('Название')).toHaveValue('Ретро')
		await user.selectOptions(form.getByLabelText('Окончание'), '10:30')
		expect(form.queryByText(/Время пересекается/)).not.toBeInTheDocument()

		await user.click(form.getByRole('button', { name: 'Сохранить' }))
		expect(await screen.findByRole('article', { name: '10:00–10:30, Ретро' })).toBeInTheDocument()
	})

	it('404: бронь удалили, пока форма была открыта', async () => {
		const { user } = renderScreen()
		await user.click(await screen.findByRole('button', { name: 'Изменить бронь 14:00–15:00' }))
		const form = within(screen.getByRole('dialog', { name: 'Изменить бронь' }))

		mockApi.store.remove(DEMO.id)
		await user.click(form.getByRole('button', { name: 'Сохранить' }))

		expect(await form.findByRole('alert')).toHaveTextContent('Бронь не найдена — похоже, её уже удалили.')
		await waitFor(() => expect(screen.queryByRole('article', { name: /Демо/ })).not.toBeInTheDocument())
	})

	it('закрытие возвращает фокус на кнопку, открывшую форму', async () => {
		// Esc в jsdom не порождает событие cancel у <dialog> — его проверяет e2e в настоящем браузере
		const { user } = renderScreen()
		const editButton = await screen.findByRole('button', { name: 'Изменить бронь 10:00–11:00' })
		await user.click(editButton)

		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Закрыть' }))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(editButton).toHaveFocus()
	})
})

describe('Удаление брони', () => {
	it('после подтверждения удаляет бронь', async () => {
		const success = vi.spyOn(toast, 'success')
		const { user } = renderScreen()
		await user.click(await screen.findByRole('button', { name: 'Удалить бронь 10:00–11:00' }))

		const dialog = within(screen.getByRole('dialog', { name: 'Удалить бронь?' }))
		expect(dialog.getByRole('button', { name: 'Отмена' })).toHaveFocus()
		await user.click(dialog.getByRole('button', { name: 'Удалить' }))

		await waitFor(() => expect(screen.queryByRole('article', { name: /Ретро/ })).not.toBeInTheDocument())
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(success).toHaveBeenCalledWith('Бронь удалена', expect.anything())
	})

	it('404: бронь уже удалили — окно закрывается, список обновляется', async () => {
		const info = vi.spyOn(toast, 'info')
		const { user } = renderScreen()
		await user.click(await screen.findByRole('button', { name: 'Удалить бронь 14:00–15:00' }))

		mockApi.store.remove(DEMO.id)
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(info).toHaveBeenCalledWith('Бронь уже удалили', expect.anything())
		expect(screen.queryByRole('article', { name: /Демо/ })).not.toBeInTheDocument()
	})

	it('бронь успела начаться — объясняет, что удалить нельзя', async () => {
		mockApi.store.reset([{ id: 'soon', date: TODAY, start: '12:30', end: '13:00', title: 'Скоро' }])
		const { user } = renderScreen(TODAY)
		await user.click(await screen.findByRole('button', { name: 'Удалить бронь 12:30–13:00' }))

		// Пока окно открыто, бронь началась
		vi.setSystemTime(new Date(`${TODAY}T12:31:00`))
		const dialog = within(screen.getByRole('dialog'))
		await user.click(dialog.getByRole('button', { name: 'Удалить' }))

		expect(await dialog.findByRole('alert')).toHaveTextContent('Бронь уже началась — удалить её нельзя.')
		expect(dialog.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
		// Остаётся только закрыть окно: крестик и основная кнопка
		expect(dialog.getAllByRole('button', { name: 'Закрыть' })).toHaveLength(2)
	})
})
