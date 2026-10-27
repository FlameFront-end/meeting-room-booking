import { freezeTime } from '@/test/time'

import { findConflicts, isBookingStarted, isDateBookable, rangesOverlap, validateBooking } from './rules'
import type { Booking, BookingSlot } from './schema'

const TODAY = '2026-10-27'
const TOMORROW = '2026-10-28'
const YESTERDAY = '2026-10-26'

/** «Сейчас» — 08:00 сегодня: до начала рабочего дня, прошедшее время не мешает проверкам. */
const EARLY_MORNING = new Date(`${TODAY}T08:00:00`)

const booking = (id: string, start: string, end: string, date = TOMORROW): Booking => ({ id, date, start, end })

const slot = (start: string, end: string, date = TOMORROW): BookingSlot => ({ date, start, end })

const codes = (input: BookingSlot, bookings: Booking[] = [], now = EARLY_MORNING, excludeId?: string) =>
	validateBooking(input, { now, bookings, excludeId }).map(violation => violation.code)

describe('validateBooking', () => {
	it('принимает корректную бронь', () => {
		expect(codes(slot('10:00', '11:00'))).toEqual([])
	})

	describe('правило 1: рабочий день 09:00–18:00', () => {
		it('принимает бронь ровно на границах рабочего дня', () => {
			expect(codes(slot('09:00', '10:00'))).toEqual([])
			expect(codes(slot('17:00', '18:00'))).toEqual([])
		})

		it('отклоняет начало раньше 09:00', () => {
			expect(validateBooking(slot('08:30', '09:30'), { now: EARLY_MORNING, bookings: [] })).toEqual([
				{ code: 'OUTSIDE_WORKING_HOURS', field: 'start' }
			])
		})

		it('отклоняет окончание позже 18:00', () => {
			expect(validateBooking(slot('17:30', '18:30'), { now: EARLY_MORNING, bookings: [] })).toEqual([
				{ code: 'OUTSIDE_WORKING_HOURS', field: 'end' }
			])
		})

		it('отклоняет интервал целиком вне рабочего дня', () => {
			expect(codes(slot('19:00', '20:00'))).toEqual(['OUTSIDE_WORKING_HOURS', 'OUTSIDE_WORKING_HOURS'])
			expect(codes(slot('07:00', '08:00'))).toEqual(['OUTSIDE_WORKING_HOURS', 'OUTSIDE_WORKING_HOURS'])
		})
	})

	describe('правило 2: start < end', () => {
		it.each([
			['равны', '10:00', '10:00'],
			['перевёрнуты', '11:00', '10:00']
		])('отклоняет, когда начало и конец %s', (_, start, end) => {
			expect(codes(slot(start, end))).toEqual(['START_NOT_BEFORE_END'])
		})

		it('не проверяет длительность и пересечения у перевёрнутого интервала', () => {
			expect(codes(slot('12:00', '10:00'), [booking('a', '10:00', '12:00')])).toEqual(['START_NOT_BEFORE_END'])
		})
	})

	describe('правила 3–4: длительность от 30 минут до 2 часов', () => {
		it('принимает ровно 30 минут и ровно 2 часа', () => {
			expect(codes(slot('10:00', '10:30'))).toEqual([])
			expect(codes(slot('10:00', '12:00'))).toEqual([])
		})

		it('отклоняет 29 минут', () => {
			expect(codes(slot('10:00', '10:29'))).toEqual(['TOO_SHORT'])
		})

		it('отклоняет 2 часа 1 минуту', () => {
			expect(codes(slot('10:00', '12:01'))).toEqual(['TOO_LONG'])
		})
	})

	describe('правило 5: брони не пересекаются', () => {
		const existing = [booking('a', '10:00', '11:00'), booking('b', '13:00', '14:00')]

		it('касание границ — не конфликт', () => {
			expect(codes(slot('11:00', '12:00'), existing)).toEqual([])
			expect(codes(slot('09:00', '10:00'), existing)).toEqual([])
			expect(codes(slot('11:00', '13:00'), existing)).toEqual([])
		})

		it.each([
			['частичное перекрытие слева', '09:30', '10:30'],
			['частичное перекрытие справа', '10:30', '11:30'],
			['внутри существующей', '10:15', '10:45'],
			['накрывает существующую', '09:30', '11:30'],
			['полное совпадение', '10:00', '11:00']
		])('%s — конфликт', (_, start, end) => {
			const [violation] = validateBooking(slot(start, end), { now: EARLY_MORNING, bookings: existing })
			expect(violation).toEqual({ code: 'OVERLAP', field: 'form', conflicts: [existing[0]] })
		})

		it('возвращает все конфликтующие брони', () => {
			const neighbours = [booking('a', '10:00', '11:00'), booking('c', '11:30', '12:00')]
			const [violation] = validateBooking(slot('10:30', '12:00'), { now: EARLY_MORNING, bookings: neighbours })
			expect(violation).toMatchObject({ code: 'OVERLAP', conflicts: neighbours })
		})

		it('не смешивает разные даты', () => {
			expect(codes(slot('10:00', '11:00', '2026-10-29'), existing)).toEqual([])
		})
	})

	describe('правило 6: нельзя бронировать прошедшее время', () => {
		it('отклоняет прошедшую дату и не проверяет остальное', () => {
			expect(validateBooking(slot('10:00', '11:00', YESTERDAY), { now: EARLY_MORNING, bookings: [] })).toEqual([
				{ code: 'DATE_IN_PAST', field: 'date' }
			])
		})

		it('для сегодня отклоняет уже наступившее время начала', () => {
			const now = new Date(`${TODAY}T12:10:00`)
			expect(codes(slot('12:00', '13:00', TODAY), [], now)).toEqual(['START_IN_PAST'])
		})

		it('для сегодня принимает слот, начинающийся в текущую минуту и позже', () => {
			const now = new Date(`${TODAY}T12:00:45`)
			expect(codes(slot('12:00', '13:00', TODAY), [], now)).toEqual([])
			expect(codes(slot('12:30', '13:00', TODAY), [], now)).toEqual([])
		})

		it('будущую дату не ограничивает текущим временем', () => {
			const lateEvening = new Date(`${TODAY}T23:30:00`)
			expect(codes(slot('09:00', '10:00', TOMORROW), [], lateEvening)).toEqual([])
		})
	})

	describe('правило 7: редактируемая бронь не конфликтует сама с собой', () => {
		const existing = [booking('a', '10:00', '11:00'), booking('b', '11:00', '12:00')]

		it('сдвиг внутри собственного интервала допустим', () => {
			expect(codes(slot('10:00', '10:30'), existing, EARLY_MORNING, 'a')).toEqual([])
			expect(codes(slot('09:30', '11:00'), existing, EARLY_MORNING, 'a')).toEqual([])
		})

		it('но с другими бронями конфликт остаётся', () => {
			expect(codes(slot('10:00', '11:30'), existing, EARLY_MORNING, 'a')).toEqual(['OVERLAP'])
		})
	})

	it('собирает все нарушения сразу, чтобы показать их у нужных полей', () => {
		const now = new Date(`${TODAY}T10:00:00`)
		expect(codes(slot('08:00', '08:10', TODAY), [], now)).toEqual([
			'OUTSIDE_WORKING_HOURS',
			'OUTSIDE_WORKING_HOURS',
			'TOO_SHORT',
			'START_IN_PAST'
		])
	})
})

describe('rangesOverlap', () => {
	it('считает интервалы полуоткрытыми [start, end)', () => {
		expect(rangesOverlap(600, 660, 660, 720)).toBe(false)
		expect(rangesOverlap(600, 661, 660, 720)).toBe(true)
	})
})

describe('findConflicts', () => {
	it('исключает бронь с excludeId', () => {
		const existing = [booking('a', '10:00', '11:00')]
		expect(findConflicts(slot('10:00', '11:00'), existing, 'a')).toEqual([])
		expect(findConflicts(slot('10:00', '11:00'), existing)).toEqual(existing)
	})
})

describe('isBookingStarted', () => {
	const now = new Date(`${TODAY}T12:00:00`)

	it.each([
		['вчерашняя', slot('17:00', '18:00', YESTERDAY), true],
		['сегодняшняя, уже началась', slot('11:30', '12:30', TODAY), true],
		['сегодняшняя, начинается сейчас', slot('12:00', '13:00', TODAY), true],
		['сегодняшняя, впереди', slot('12:30', '13:00', TODAY), false],
		['завтрашняя', slot('09:00', '10:00', TOMORROW), false]
	])('%s → %s', (_, value, expected) => {
		expect(isBookingStarted(value, now)).toBe(expected)
	})
})

describe('isDateBookable', () => {
	it('разрешает сегодня и будущие даты', () => {
		freezeTime(`${TODAY}T12:00:00`)
		const now = new Date()
		expect(isDateBookable(YESTERDAY, now)).toBe(false)
		expect(isDateBookable(TODAY, now)).toBe(true)
		expect(isDateBookable(TOMORROW, now)).toBe(true)
	})
})
