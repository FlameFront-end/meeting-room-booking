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
 * `from` — начинать поиск не раньше этого времени (например, с начала выбранного свободного окна).
 * null — на эту дату свободного времени не осталось.
 */
export const suggestFreeSlot = (
	date: IsoDate,
	bookings: readonly Booking[],
	now: Date,
	from?: TimeString
): BookingSlot | null => {
	const fromMinutes = from === undefined ? 0 : timeToMinutes(from)
	const starts = getTimeOptions('start', { date, now }).filter(
		option => !option.disabled && timeToMinutes(option.value) >= fromMinutes
	)

	const durations = [DEFAULT_DURATION, BOOKING_DURATION_MINUTES.min]
	// Без `from` важнее длительность (лучше час позже, чем полчаса сейчас),
	// с `from` — начало: пользователь выбрал конкретное окно
	const candidates =
		from === undefined
			? durations.flatMap(duration => starts.map(({ value }) => [value, duration] as const))
			: starts.flatMap(({ value }) => durations.map(duration => [value, duration] as const))

	for (const [start, duration] of candidates) {
		const endMinutes = timeToMinutes(start) + duration
		if (endMinutes > WORKDAY_END) continue
		const slot = { date, start, end: minutesToTime(endMinutes) }
		if (validateBooking(slot, { now, bookings }).length === 0) return slot
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

export type FreeWindow = Pick<BookingSlot, 'start' | 'end'>

/**
 * Свободные окна рабочего дня, в которые ещё можно что-то забронировать (не короче минимальной брони).
 * Для сегодня окно начинается не раньше текущего времени, округлённого вверх до шага сетки.
 */
export const getFreeWindows = (date: IsoDate, bookings: readonly Booking[], now: Date): FreeWindow[] => {
	const boundary = pastBoundary(date, now)
	if (boundary === Number.POSITIVE_INFINITY) return []

	const roundedNow = Math.ceil(boundary / BOOKING_TIME_STEP_MINUTES) * BOOKING_TIME_STEP_MINUTES
	let cursor = Math.max(WORKDAY_START, roundedNow)
	const windows: [number, number][] = []

	const busy = bookings
		.filter(booking => booking.date === date)
		.map(booking => [timeToMinutes(booking.start), timeToMinutes(booking.end)] as const)
		.sort(([a], [b]) => a - b)

	for (const [start, end] of busy) {
		if (start > cursor) windows.push([cursor, Math.min(start, WORKDAY_END)])
		cursor = Math.max(cursor, end)
	}
	if (cursor < WORKDAY_END) windows.push([cursor, WORKDAY_END])

	return windows
		.filter(([start, end]) => end - start >= BOOKING_DURATION_MINUTES.min)
		.map(([start, end]) => ({ start: minutesToTime(start), end: minutesToTime(end) }))
}
