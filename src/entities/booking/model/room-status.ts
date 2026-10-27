import { minutesSinceMidnight, toIsoDate } from '@/shared/lib/date'
import { minutesToTime, timeToMinutes, type TimeString } from '@/shared/lib/time'

import { WORKING_HOURS } from './constants'
import type { Booking } from './schema'

/**
 * Состояние переговорной прямо сейчас — как на табличке у двери.
 *  - closed — вне рабочего дня
 *  - busy   — идёт встреча; until — когда комната освободится (встречи встык склеиваются)
 *  - free   — свободна; until — до начала ближайшей встречи, null — до конца дня
 */
export type RoomStatus =
	| { state: 'closed' }
	| { state: 'busy'; until: TimeString; booking: Booking }
	| { state: 'free'; until: TimeString | null }

const WORKDAY_START = timeToMinutes(WORKING_HOURS.start)
const WORKDAY_END = timeToMinutes(WORKING_HOURS.end)

export const getRoomStatus = (bookings: readonly Booking[], now: Date): RoomStatus => {
	const minutes = minutesSinceMidnight(now)
	if (minutes < WORKDAY_START || minutes >= WORKDAY_END) return { state: 'closed' }

	const today = toIsoDate(now)
	const sorted = bookings
		.filter(booking => booking.date === today)
		.toSorted((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))

	const currentIndex = sorted.findIndex(
		booking => timeToMinutes(booking.start) <= minutes && minutes < timeToMinutes(booking.end)
	)
	const current = sorted[currentIndex]

	if (current) {
		let until = timeToMinutes(current.end)
		for (const next of sorted.slice(currentIndex + 1)) {
			if (timeToMinutes(next.start) !== until) break
			until = timeToMinutes(next.end)
		}
		return { state: 'busy', until: minutesToTime(until), booking: current }
	}

	const next = sorted.find(booking => timeToMinutes(booking.start) > minutes)
	return { state: 'free', until: next ? next.start : null }
}
