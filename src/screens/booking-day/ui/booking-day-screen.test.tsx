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

type User = ReturnType<typeof renderScreen>['user']

const combobox = (container: HTMLElement, name: string) => within(container).getByRole('combobox', { name })

/** Выбор значения в собственном Select: открыть список и кликнуть пункт. */
const pick = async (user: User, container: HTMLElement, name: string, value: string) => {
	await user.click(combobox(container, name))
	await user.click(within(container).getByRole('option', { name: value }))
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
		expect(form.getByRole('button', { name: 'Дата' })).toHaveTextContent('ср, 28 октября')
		// Сначала «что», потом «когда»: фокус на названии
		expect(form.getByLabelText(/^Название/)).toHaveFocus()
		expect(combobox(dialog, 'Начало')).toHaveTextContent('09:00')
		expect(combobox(dialog, 'Окончание')).toHaveTextContent('10:00')
		// Занятость дня видна прямо в форме
		expect(await form.findByText('Время свободно')).toBeInTheDocument()
		expect(form.getByText('10:00–11:00 · Ретро')).toBeInTheDocument()

		await user.type(form.getByLabelText(/^Название/), 'Синк с дизайном')
		await user.click(form.getByRole('button', { name: 'Забронировать' }))

		expect(await screen.findByRole('article', { name: '09:00–10:00, Синк с дизайном' })).toBeInTheDocument()
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(success).toHaveBeenCalledWith('Бронь создана', expect.anything())
	})

	it('смена начала сдвигает окончание с сохранением длительности', async () => {
		const { user } = renderScreen()
		const dialog = await openCreateForm(user)
		const form = within(dialog)

		await pick(user, dialog, 'Окончание', '10:30')
		await pick(user, dialog, 'Начало', '15:00')

		expect(combobox(dialog, 'Окончание')).toHaveTextContent('16:30')
		expect(form.getByRole('button', { name: '1 ч 30 мин' })).toHaveAttribute('aria-pressed', 'true')
	})

	it('быстрый выбор длительности; варианты за пределами дня недоступны', async () => {
		const { user } = renderScreen()
		const dialog = await openCreateForm(user)
		const form = within(dialog)

		await user.click(form.getByRole('button', { name: '2 ч' }))
		expect(combobox(dialog, 'Окончание')).toHaveTextContent('11:00')

		await pick(user, dialog, 'Начало', '17:00')
		expect(form.getByRole('button', { name: '1 ч' })).toBeEnabled()
		expect(form.getByRole('button', { name: '1 ч 30 мин' })).toBeDisabled()
	})

	it('клик по свободному окну открывает форму с этим временем', async () => {
		const { user } = renderScreen()
		await user.click(await screen.findByRole('button', { name: /Свободно 11:00–14:00/ }))

		const dialog = screen.getByRole('dialog', { name: 'Новая бронь' })
		expect(combobox(dialog, 'Начало')).toHaveTextContent('11:00')
		expect(combobox(dialog, 'Окончание')).toHaveTextContent('12:00')
	})

	it('время выбирается с клавиатуры: стрелки, набор цифр, Esc не закрывает окно', async () => {
		const { user } = renderScreen()
		const dialog = await openCreateForm(user)
		const form = within(dialog)
		const start = combobox(dialog, 'Начало')

		start.focus()
		await user.keyboard('{ArrowDown}')
		expect(start).toHaveAttribute('aria-expanded', 'true')
		await user.keyboard('{ArrowDown}{Enter}')
		expect(start).toHaveTextContent('09:15')
		expect(start).toHaveAttribute('aria-expanded', 'false')

		await user.keyboard('14')
		expect(form.getByRole('option', { name: '14:00' })).toHaveAttribute(
			'id',
			start.getAttribute('aria-activedescendant')
		)
		await user.keyboard('{Escape}')
		expect(start).toHaveAttribute('aria-expanded', 'false')
		expect(start).toHaveTextContent('09:15')
		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	it('дата выбирается в календаре, прошедшие дни недоступны', async () => {
		const { user } = renderScreen()
		const dialog = await openCreateForm(user)
		const form = within(dialog)

		await user.click(form.getByRole('button', { name: 'Дата' }))
		const calendar = within(form.getByRole('grid'))
		expect(calendar.getByRole('button', { name: /26 октября 2026/ })).toHaveAttribute('aria-disabled', 'true')
		expect(calendar.getByRole('button', { name: /28 октября 2026/ })).toHaveFocus()

		await user.keyboard('{ArrowRight}{ArrowRight}{Enter}')
		expect(form.getByRole('button', { name: 'Дата' })).toHaveTextContent('пт, 30 октября')
		expect(form.queryByRole('grid')).not.toBeInTheDocument()
	})

	it('живые подсказки по правилам и блокировка отправки', async () => {
		const { user } = renderScreen()
		const dialog = await openCreateForm(user)
		const form = within(dialog)
		const end = combobox(dialog, 'Окончание')

		await pick(user, dialog, 'Окончание', '11:15')
		expect(end).toHaveAccessibleDescription(/Максимум 2 ч/)
		expect(end).toBeInvalid()

		await pick(user, dialog, 'Начало', '10:30')
		await pick(user, dialog, 'Окончание', '11:30')
		expect(form.getByRole('status', { name: /Это время занято/ })).toBeInTheDocument()
		const [retroSlot, demoSlot] = within(form.getByRole('region', { name: 'Занято в этот день' })).getAllByRole(
			'listitem'
		)
		expect(retroSlot).toHaveTextContent(/10:00–11:00.*пересекается/)
		expect(demoSlot).not.toHaveTextContent(/пересекается/)

		await user.click(form.getByRole('button', { name: 'Забронировать' }))
		// Запрос не ушёл: форма открыта, в хранилище по-прежнему две брони
		expect(combobox(dialog, 'Начало')).toHaveFocus()
		expect(mockApi.store.listByDate(TOMORROW)).toHaveLength(2)

		// Касание границ — не конфликт
		await pick(user, dialog, 'Начало', '11:00')
		// Предупреждение сворачивается анимацией: в DOM оно ещё есть, но скрыто от скринридера
		expect(form.queryByRole('status', { name: /Это время занято/ })).not.toBeInTheDocument()
		expect(form.getByText('Время свободно')).toBeInTheDocument()
	})

	it('409: данные сохраняются, список обновляется, конфликт подсвечен', async () => {
		mockApi.scenario.set({ conflict: 'once' })
		const { user } = renderScreen()
		const dialog = await openCreateForm(user)
		const form = within(dialog)

		await pick(user, dialog, 'Начало', '12:00')
		await user.type(form.getByLabelText(/^Название/), 'Важная встреча')
		await user.click(form.getByRole('button', { name: 'Забронировать' }))

		const alert = await form.findByRole('alert')
		expect(alert).toHaveTextContent('Время уже занято')
		expect(alert).toHaveTextContent('12:00–13:00 · Бронь другого сотрудника')

		// Форма не закрылась и ничего не потеряла
		expect(combobox(dialog, 'Начало')).toHaveTextContent('12:00')
		expect(combobox(dialog, 'Окончание')).toHaveTextContent('13:00')
		expect(form.getByLabelText(/^Название/)).toHaveValue('Важная встреча')

		// Расписание за окном обновилось и подсветило чужую бронь
		const rival = await screen.findByRole('article', { name: '12:00–13:00, Бронь другого сотрудника' })
		expect(within(rival).getByText('Пересекается')).toBeInTheDocument()

		// Выбрал другое время — устаревшее сообщение исчезает, отправка проходит
		await pick(user, dialog, 'Начало', '15:00')
		expect(form.queryByRole('alert')).not.toBeInTheDocument()
		await user.click(form.getByRole('button', { name: 'Забронировать' }))
		expect(await screen.findByRole('article', { name: '15:00–16:00, Важная встреча' })).toBeInTheDocument()
	})

	it('на прошедшую дату создание недоступно', async () => {
		mockApi.store.reset([{ id: 'old', date: YESTERDAY, start: '10:00', end: '11:00', title: 'Старая' }])
		renderScreen(YESTERDAY)

		const article = await screen.findByRole('article', { name: /Старая/ })
		expect(screen.getByRole('button', { name: 'Новая бронь' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'Новая бронь' })).toHaveAccessibleDescription('Этот день уже прошёл')
		// Прошедшие брони только для чтения
		expect(within(article).queryByRole('button')).not.toBeInTheDocument()
	})
})

describe('Редактирование брони', () => {
	it('бронь не конфликтует сама с собой и сохраняется', async () => {
		const { user } = renderScreen()
		await user.click(await screen.findByRole('button', { name: 'Изменить бронь 10:00–11:00' }))
		const dialog = screen.getByRole('dialog', { name: 'Изменить бронь' })
		const form = within(dialog)

		expect(form.getByLabelText(/^Название/)).toHaveValue('Ретро')
		await pick(user, dialog, 'Окончание', '10:30')
		expect(form.queryByRole('status', { name: /Это время занято/ })).not.toBeInTheDocument()

		await user.click(form.getByRole('button', { name: 'Сохранить' }))
		expect(await screen.findByRole('article', { name: '10:00–10:30, Ретро' })).toBeInTheDocument()
	})

	it('404: бронь удалили, пока форма была открыта', async () => {
		const { user } = renderScreen()
		await user.click(await screen.findByRole('button', { name: 'Изменить бронь 14:00–15:00' }))
		const dialog = screen.getByRole('dialog', { name: 'Изменить бронь' })
		const form = within(dialog)

		mockApi.store.remove(DEMO.id)
		await user.click(form.getByRole('button', { name: 'Сохранить' }))

		expect(await form.findByRole('alert')).toHaveTextContent('Эту бронь уже удалили.')
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
	/** Удаление — из формы редактирования, с подтверждением во втором окне. */
	const openDeleteConfirm = async (user: User, range: string) => {
		await user.click(await screen.findByRole('button', { name: `Изменить бронь ${range}` }))
		await user.click(
			within(screen.getByRole('dialog', { name: 'Изменить бронь' })).getByRole('button', {
				name: `Удалить бронь ${range}`
			})
		)
		return screen.getByRole('dialog', { name: 'Удалить бронь?' })
	}

	it('после подтверждения удаляет бронь и закрывает форму', async () => {
		const success = vi.spyOn(toast, 'success')
		const { user } = renderScreen()
		const dialog = within(await openDeleteConfirm(user, '10:00–11:00'))

		expect(dialog.getByRole('button', { name: 'Отмена' })).toHaveFocus()
		await user.click(dialog.getByRole('button', { name: 'Удалить' }))

		await waitFor(() => expect(screen.queryByRole('article', { name: /Ретро/ })).not.toBeInTheDocument())
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(success).toHaveBeenCalledWith('Бронь удалена', expect.anything())
	})

	it('404: бронь уже удалили — окно закрывается, список обновляется', async () => {
		const info = vi.spyOn(toast, 'info')
		const { user } = renderScreen()
		const dialog = within(await openDeleteConfirm(user, '14:00–15:00'))

		mockApi.store.remove(DEMO.id)
		await user.click(dialog.getByRole('button', { name: 'Удалить' }))

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(info).toHaveBeenCalledWith('Эту бронь уже удалили')
		expect(screen.queryByRole('article', { name: /Демо/ })).not.toBeInTheDocument()
	})

	it('бронь успела начаться — объясняет, что удалить нельзя', async () => {
		mockApi.store.reset([{ id: 'soon', date: TODAY, start: '12:30', end: '13:00', title: 'Скоро' }])
		const { user } = renderScreen(TODAY)
		const dialog = within(await openDeleteConfirm(user, '12:30–13:00'))

		// Пока окно открыто, бронь началась
		vi.setSystemTime(new Date(`${TODAY}T12:31:00`))
		await user.click(dialog.getByRole('button', { name: 'Удалить' }))

		expect(await dialog.findByRole('alert')).toHaveTextContent('Встреча уже началась, её нельзя удалить.')
		expect(dialog.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
		// Остаётся только закрыть окно: крестик и основная кнопка
		expect(dialog.getAllByRole('button', { name: 'Закрыть' })).toHaveLength(2)
	})
})
