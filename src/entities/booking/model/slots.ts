import { compareIsoDates, minutesSinceMidnight, toIsoDate, type IsoDate } from '@/shared/lib/date'
import { MINUTES_IN_HOUR, minutesToTime, timeToMinutes, type TimeString } from '@/shared/lib/time'

import { BOOKING_DURATION_MINUTES, BOOKING_TIME_STEP_MINUTES, WORKING_HOURS } from './constants'
import { validateBooking } from './rules'
import type { Booking, BookingSlot } from './schema'

/**
 * Варианты времени для формы и подбор свободного слота.
 * Как и правила, это чистые функции: «сейчас» и брони приходят параметрами.
 */

export type TimeOption = {
	value: TimeString
	/** Время уже прошло — выбрать нельзя, но показать вариант полезно, чтобы шкала не «прыгала». */
	disabled: boolean
}

export type TimeOptionsKind = 'start' | 'end'

const WORKDAY_START = timeToMinutes(WORKING_HOURS.start)
const WORKDAY_END = timeToMinutes(WORKING_HOURS.end)
const DEFAULT_DURATION = MINUTES_IN_HOUR

const range = (from: number, to: number, step: number): number[] =>
	Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step)

/** Минута, раньше которой на эту дату начинать нельзя: для прошлых дат — весь день, для будущих — ничего. */
const pastBoundary = (date: IsoDate, now: Date): number => {
	const order = compareIsoDates(date, toIsoDate(now))
	if (order < 0) return Number.POSITIVE_INFINITY
	return order === 0 ? minutesSinceMidnight(now) : Number.NEGATIVE_INFINITY
}

/**
 * Варианты начала (09:00…17:30) или окончания (09:30…18:00) с шагом BOOKING_TIME_STEP_MINUTES.
 * `current` добавляется, если не попадает в сетку: бронь могли создать с другим шагом,
 * и при редактировании её время должно отображаться как есть.
 */
export const getTimeOptions = (
	kind: TimeOptionsKind,
	{ date, now, current }: { date: IsoDate; now: Date; current?: TimeString | undefined }
): TimeOption[] => {
	const boundary = pastBoundary(date, now)
	const minutes =
		kind === 'start'
			? range(WORKDAY_START, WORKDAY_END - BOOKING_DURATION_MINUTES.min, BOOKING_TIME_STEP_MINUTES)
			: range(WORKDAY_START + BOOKING_DURATION_MINUTES.min, WORKDAY_END, BOOKING_TIME_STEP_MINUTES)

	if (current !== undefined) {
		const currentMinutes = timeToMinutes(current)
		if (!minutes.includes(currentMinutes)) minutes.push(currentMinutes)
		minutes.sort((a, b) => a - b)
	}

	// Окончание недоступно, если между «сейчас» и ним не помещается минимальная бронь
	const threshold = kind === 'start' ? boundary : boundary + BOOKING_DURATION_MINUTES.min
	return minutes.map(value => ({ value: minutesToTime(value), disabled: value < threshold }))
}

/**
 * Ближайший свободный слот на дату: сначала часовой, затем минимальной длительности.
 * null — на эту дату свободного времени не осталось.
 */
export const suggestFreeSlot = (date: IsoDate, bookings: readonly Booking[], now: Date): BookingSlot | null => {
	const starts = getTimeOptions('start', { date, now }).filter(option => !option.disabled)

	for (const duration of [DEFAULT_DURATION, BOOKING_DURATION_MINUTES.min]) {
		for (const { value: start } of starts) {
			const endMinutes = timeToMinutes(start) + duration
			if (endMinutes > WORKDAY_END) break
			const slot = { date, start, end: minutesToTime(endMinutes) }
			if (validateBooking(slot, { now, bookings }).length === 0) return slot
		}
	}

	return null
}

/**
 * Окончание после смены начала: сохраняем выбранную длительность, как в календарях.
 * Если прежняя длительность была некорректной — ставим час. За пределы рабочего дня не выходим.
 */
export const shiftEndWithStart = (previous: Pick<BookingSlot, 'start' | 'end'>, nextStart: TimeString): TimeString => {
	const previousDuration = timeToMinutes(previous.end) - timeToMinutes(previous.start)
	const duration =
		previousDuration >= BOOKING_DURATION_MINUTES.min && previousDuration <= BOOKING_DURATION_MINUTES.max
			? previousDuration
			: DEFAULT_DURATION
	return minutesToTime(Math.min(timeToMinutes(nextStart) + duration, WORKDAY_END))
}
