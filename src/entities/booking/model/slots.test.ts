import type { Booking } from './schema'
import { getFreeWindows, getTimeOptions, shiftEndWithStart, suggestFreeSlot } from './slots'

const TODAY = '2026-10-27'
const TOMORROW = '2026-10-28'
const YESTERDAY = '2026-10-26'

const EARLY_MORNING = new Date(`${TODAY}T08:00:00`)

const booking = (id: string, start: string, end: string, date = TOMORROW): Booking => ({ id, date, start, end })

const values = (options: { value: string }[]) => options.map(option => option.value)
const enabled = (options: { value: string; disabled: boolean }[]) => values(options.filter(option => !option.disabled))

describe('getTimeOptions', () => {
	it('начало: 09:00…17:30 с шагом 15 минут', () => {
		const options = getTimeOptions('start', { date: TOMORROW, now: EARLY_MORNING })
		expect(options[0]).toEqual({ value: '09:00', disabled: false })
		expect(options.at(-1)).toEqual({ value: '17:30', disabled: false })
		expect(values(options).slice(0, 3)).toEqual(['09:00', '09:15', '09:30'])
		expect(options).toHaveLength(35)
	})

	it('окончание: 09:30…18:00', () => {
		const options = getTimeOptions('end', { date: TOMORROW, now: EARLY_MORNING })
		expect(options[0]?.value).toBe('09:30')
		expect(options.at(-1)?.value).toBe('18:00')
	})

	it('на сегодня прошедшее время недоступно, текущая минута — доступна', () => {
		const now = new Date(`${TODAY}T12:00:30`)
		expect(enabled(getTimeOptions('start', { date: TODAY, now }))[0]).toBe('12:00')
		// Окончание не раньше, чем «сейчас» + минимальная длительность
		expect(enabled(getTimeOptions('end', { date: TODAY, now }))[0]).toBe('12:30')
	})

	it('на прошедшую дату недоступно ничего', () => {
		expect(enabled(getTimeOptions('start', { date: YESTERDAY, now: EARLY_MORNING }))).toEqual([])
	})

	it('добавляет текущее значение вне сетки, сохраняя порядок', () => {
		const options = getTimeOptions('start', { date: TOMORROW, now: EARLY_MORNING, current: '10:10' })
		expect(values(options).slice(4, 7)).toEqual(['10:00', '10:10', '10:15'])
	})
})

describe('suggestFreeSlot', () => {
	it('предлагает первый свободный час', () => {
		expect(suggestFreeSlot(TOMORROW, [], EARLY_MORNING)).toEqual({ date: TOMORROW, start: '09:00', end: '10:00' })
	})

	it('обходит занятое время', () => {
		const bookings = [booking('a', '09:00', '10:00'), booking('b', '10:30', '12:00')]
		expect(suggestFreeSlot(TOMORROW, bookings, EARLY_MORNING)).toEqual({
			date: TOMORROW,
			start: '12:00',
			end: '13:00'
		})
	})

	it('на сегодня начинает не раньше текущего времени', () => {
		const now = new Date(`${TODAY}T12:05:00`)
		expect(suggestFreeSlot(TODAY, [], now)).toEqual({ date: TODAY, start: '12:15', end: '13:15' })
	})

	it('если часа нигде нет — предлагает минимальную бронь', () => {
		const now = new Date(`${TODAY}T17:20:00`)
		expect(suggestFreeSlot(TODAY, [], now)).toEqual({ date: TODAY, start: '17:30', end: '18:00' })
	})

	it('ищет начиная с заданного времени и укорачивает бронь под узкое окно', () => {
		expect(suggestFreeSlot(TOMORROW, [], EARLY_MORNING, '14:00')).toEqual({
			date: TOMORROW,
			start: '14:00',
			end: '15:00'
		})
		// Окно 11:00–11:30: полчаса в начале окна лучше, чем час где-то позже
		const narrow = [booking('a', '10:00', '11:00'), booking('b', '11:30', '12:00')]
		expect(suggestFreeSlot(TOMORROW, narrow, EARLY_MORNING, '11:00')).toEqual({
			date: TOMORROW,
			start: '11:00',
			end: '11:30'
		})
	})

	it('null, если свободного времени не осталось', () => {
		expect(suggestFreeSlot(TODAY, [], new Date(`${TODAY}T17:45:00`))).toBeNull()
		expect(suggestFreeSlot(YESTERDAY, [], EARLY_MORNING)).toBeNull()
	})
})

describe('shiftEndWithStart', () => {
	it('сохраняет длительность', () => {
		expect(shiftEndWithStart({ start: '10:00', end: '11:30' }, '13:00')).toBe('14:30')
	})

	it('при некорректной прежней длительности ставит час', () => {
		expect(shiftEndWithStart({ start: '11:00', end: '10:00' }, '13:00')).toBe('14:00')
	})

	it('не выходит за конец рабочего дня', () => {
		expect(shiftEndWithStart({ start: '10:00', end: '12:00' }, '17:00')).toBe('18:00')
	})
})

describe('getFreeWindows', () => {
	it('весь день свободен', () => {
		expect(getFreeWindows(TOMORROW, [], EARLY_MORNING)).toEqual([{ start: '09:00', end: '18:00' }])
	})

	it('окна между бронями, касание границ не оставляет щели', () => {
		const bookings = [
			booking('b', '13:00', '14:00'),
			booking('a', '10:00', '11:00'),
			booking('c', '14:00', '17:45')
		]
		expect(getFreeWindows(TOMORROW, bookings, EARLY_MORNING)).toEqual([
			{ start: '09:00', end: '10:00' },
			{ start: '11:00', end: '13:00' }
		])
	})

	it('для сегодня начинается с текущего времени, округлённого до шага', () => {
		const now = new Date(`${TODAY}T12:05:00`)
		expect(getFreeWindows(TODAY, [], now)).toEqual([{ start: '12:15', end: '18:00' }])
	})

	it('для прошедшей даты окон нет', () => {
		expect(getFreeWindows(YESTERDAY, [], EARLY_MORNING)).toEqual([])
	})
})
