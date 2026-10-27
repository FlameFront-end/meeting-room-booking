/** Время суток в формате HH:mm, 24-часовой формат. */
export type TimeString = string

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export const MINUTES_IN_HOUR = 60
export const MINUTES_IN_DAY = 24 * MINUTES_IN_HOUR

export const isTimeString = (value: string): value is TimeString => TIME_PATTERN.test(value)

/** "10:30" → 630. Вся арифметика по времени ведётся в минутах от полуночи: без Date и таймзон. */
export const timeToMinutes = (time: TimeString): number => {
	const match = TIME_PATTERN.exec(time)
	if (!match) {
		throw new RangeError(`Ожидалось время в формате HH:mm, получено "${time}"`)
	}
	const [, hours = '0', minutes = '0'] = match
	return Number(hours) * MINUTES_IN_HOUR + Number(minutes)
}

/** 630 → "10:30". */
export const minutesToTime = (totalMinutes: number): TimeString => {
	if (!Number.isInteger(totalMinutes) || totalMinutes < 0 || totalMinutes >= MINUTES_IN_DAY) {
		throw new RangeError(
			`Минуты должны быть целым числом в диапазоне [0, ${MINUTES_IN_DAY}), получено ${totalMinutes}`
		)
	}
	const hours = Math.floor(totalMinutes / MINUTES_IN_HOUR)
	const minutes = totalMinutes % MINUTES_IN_HOUR
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** 90 → "1 ч 30 мин", 30 → "30 мин", 120 → "2 ч". */
export const formatDuration = (totalMinutes: number): string => {
	const hours = Math.floor(totalMinutes / MINUTES_IN_HOUR)
	const minutes = totalMinutes % MINUTES_IN_HOUR
	const parts = [hours > 0 ? `${hours} ч` : null, minutes > 0 ? `${minutes} мин` : null].filter(Boolean)
	return parts.length > 0 ? parts.join(' ') : '0 мин'
}
