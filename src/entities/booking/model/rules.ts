import { compareIsoDates, minutesSinceMidnight, toIsoDate } from '@/shared/lib/date'
import { timeToMinutes } from '@/shared/lib/time'

import { BOOKING_DURATION_MINUTES, WORKING_HOURS } from './constants'
import type { Booking, BookingSlot } from './schema'
import type { BookingViolation } from './violations'

/**
 * Бизнес-правила бронирования. Чистые функции без React и сети:
 * одна и та же логика работает в форме (подсказки до отправки) и в mock-сервере (финальная проверка).
 *
 * «Сейчас» всегда передаётся параметром — так правила детерминированы и тестируются без моков времени.
 * Дата и время трактуются в локальной таймзоне пользователя (см. README → «Решения»).
 */

export type BookingValidationContext = {
	now: Date
	/** Брони на ту же дату (или шире — лишние отфильтруются по дате). */
	bookings: readonly Booking[]
	/** id редактируемой брони: она не должна конфликтовать сама с собой. */
	excludeId?: string | undefined
}

const WORKDAY_START = timeToMinutes(WORKING_HOURS.start)
const WORKDAY_END = timeToMinutes(WORKING_HOURS.end)

/** Полуинтервалы [start, end): касание границ — не пересечение. 10:00–11:00 и 11:00–12:00 совместимы. */
export const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
	aStart < bEnd && bStart < aEnd

export const findConflicts = (slot: BookingSlot, bookings: readonly Booking[], excludeId?: string): Booking[] => {
	const start = timeToMinutes(slot.start)
	const end = timeToMinutes(slot.end)

	return bookings.filter(
		booking =>
			booking.id !== excludeId &&
			booking.date === slot.date &&
			rangesOverlap(start, end, timeToMinutes(booking.start), timeToMinutes(booking.end))
	)
}

/** Бронь уже началась или прошла — её нельзя менять или удалять. */
export const isBookingStarted = (booking: BookingSlot, now: Date): boolean => {
	const dateOrder = compareIsoDates(booking.date, toIsoDate(now))
	if (dateOrder !== 0) return dateOrder < 0
	return timeToMinutes(booking.start) <= minutesSinceMidnight(now)
}

/** Можно ли создавать брони на эту дату. */
export const isDateBookable = (date: string, now: Date): boolean => compareIsoDates(date, toIsoDate(now)) >= 0

/**
 * Проверяет слот по всем бизнес-правилам и возвращает все нарушения (пустой массив — всё ок).
 * Ожидает данные, уже прошедшие bookingInputSchema (форматы даты и времени валидны).
 */
export const validateBooking = (slot: BookingSlot, context: BookingValidationContext): BookingViolation[] => {
	const { now, bookings, excludeId } = context
	const today = toIsoDate(now)

	if (compareIsoDates(slot.date, today) < 0) {
		return [{ code: 'DATE_IN_PAST', field: 'date' }]
	}

	const start = timeToMinutes(slot.start)
	const end = timeToMinutes(slot.end)
	const violations: BookingViolation[] = []

	if (start < WORKDAY_START || start >= WORKDAY_END) {
		violations.push({ code: 'OUTSIDE_WORKING_HOURS', field: 'start' })
	}
	if (end <= WORKDAY_START || end > WORKDAY_END) {
		violations.push({ code: 'OUTSIDE_WORKING_HOURS', field: 'end' })
	}

	if (start >= end) {
		violations.push({ code: 'START_NOT_BEFORE_END', field: 'end' })
	} else {
		const duration = end - start
		if (duration < BOOKING_DURATION_MINUTES.min) violations.push({ code: 'TOO_SHORT', field: 'end' })
		if (duration > BOOKING_DURATION_MINUTES.max) violations.push({ code: 'TOO_LONG', field: 'end' })
	}

	if (slot.date === today && start < minutesSinceMidnight(now)) {
		violations.push({ code: 'START_IN_PAST', field: 'start' })
	}

	// Пересечения считаем только для корректного интервала: для «перевёрнутого» они бессмысленны
	if (start < end) {
		const conflicts = findConflicts(slot, bookings, excludeId)
		if (conflicts.length > 0) violations.push({ code: 'OVERLAP', field: 'form', conflicts })
	}

	return violations
}
