import { MINUTES_IN_HOUR } from '@/shared/lib/time'

/** Календарная дата в формате YYYY-MM-DD, без времени и таймзоны. */
export type IsoDate = string

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_IN_DAY = 24 * 60 * 60 * 1000

const parseParts = (value: string): [number, number, number] | null => {
	const match = ISO_DATE_PATTERN.exec(value)
	if (!match) return null
	const [, year = '', month = '', day = ''] = match
	return [Number(year), Number(month), Number(day)]
}

/** Проверяет формат и существование даты: "2026-02-30" — невалидна. */
export const isIsoDate = (value: string): value is IsoDate => {
	const parts = parseParts(value)
	if (!parts) return false
	const [year, month, day] = parts
	const date = new Date(Date.UTC(year, month - 1, day))
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Локальная календарная дата момента времени (в таймзоне пользователя). */
export const toIsoDate = (date: Date): IsoDate =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Минуты от локальной полуночи для момента времени. */
export const minutesSinceMidnight = (date: Date): number => date.getHours() * MINUTES_IN_HOUR + date.getMinutes()

const isoToUtcMs = (value: IsoDate): number => {
	const parts = parseParts(value)
	if (!parts || !isIsoDate(value)) {
		throw new RangeError(`Ожидалась дата в формате YYYY-MM-DD, получено "${value}"`)
	}
	const [year, month, day] = parts
	return Date.UTC(year, month - 1, day)
}

/** Сдвиг даты на N дней. Считается в UTC, поэтому переходы на летнее время не ломают арифметику. */
export const addDays = (value: IsoDate, days: number): IsoDate => {
	const shifted = new Date(isoToUtcMs(value) + days * MS_IN_DAY)
	return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

/** -1 | 0 | 1. Формат YYYY-MM-DD сравнивается лексикографически. */
export const compareIsoDates = (a: IsoDate, b: IsoDate): number => (a < b ? -1 : a > b ? 1 : 0)

/** "2026-10-27" → "вторник, 27 октября". */
export const formatIsoDate = (value: IsoDate, options: Intl.DateTimeFormatOptions = {}, locale = 'ru-RU'): string =>
	new Intl.DateTimeFormat(locale, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		...options,
		timeZone: 'UTC'
	}).format(new Date(isoToUtcMs(value)))

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate()

/** Сдвиг на N месяцев; день прижимается к концу месяца: 31 января + 1 месяц → 28/29 февраля. */
export const addMonths = (value: IsoDate, months: number): IsoDate => {
	const parts = parseParts(value)
	if (!parts || !isIsoDate(value)) throw new RangeError(`Ожидалась дата в формате YYYY-MM-DD, получено "${value}"`)
	const [year, month, day] = parts
	const total = year * 12 + (month - 1) + months
	const nextYear = Math.floor(total / 12)
	const nextMonth = (total % 12) + 1
	return `${nextYear}-${pad(nextMonth)}-${pad(Math.min(day, daysInMonth(nextYear, nextMonth)))}`
}

/** Первое число месяца, в котором лежит дата. */
export const startOfMonth = (value: IsoDate): IsoDate => `${value.slice(0, 8)}01`

/** День недели с понедельника: 0 — пн, 6 — вс. */
export const weekdayIndex = (value: IsoDate): number => (new Date(isoToUtcMs(value)).getUTCDay() + 6) % 7

/** Недели месяца для календаря: с понедельника, вместе с хвостами соседних месяцев. */
export const getCalendarWeeks = (month: IsoDate): IsoDate[][] => {
	const first = startOfMonth(month)
	const last = addDays(addMonths(first, 1), -1)
	const weeks: IsoDate[][] = []
	let cursor = addDays(first, -weekdayIndex(first))
	while (compareIsoDates(cursor, last) <= 0) {
		weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)))
		cursor = addDays(cursor, 7)
	}
	return weeks
}
