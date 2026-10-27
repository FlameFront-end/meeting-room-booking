import { formatIsoDate } from '@/shared/lib/date'
import { formatDuration } from '@/shared/lib/time'

import { BOOKING_DURATION_MINUTES, WORKING_HOURS } from './constants'
import type { Booking } from './schema'

export type BookingViolation =
	| { code: 'DATE_IN_PAST'; field: 'date' }
	| { code: 'START_IN_PAST'; field: 'start' }
	| { code: 'OUTSIDE_WORKING_HOURS'; field: 'start' | 'end' }
	| { code: 'START_NOT_BEFORE_END'; field: 'end' }
	| { code: 'TOO_SHORT'; field: 'end' }
	| { code: 'TOO_LONG'; field: 'end' }
	| { code: 'OVERLAP'; field: 'form'; conflicts: Booking[] }

export type BookingViolationCode = BookingViolation['code']
export type BookingViolationField = BookingViolation['field']

export const formatBookingRange = (booking: Pick<Booking, 'start' | 'end'>): string => `${booking.start}–${booking.end}`

/** «Вт, 27 октября · 14:30–15:30» — когда бронь, одной строкой: для тостов и подтверждений. */
export const formatBookingWhen = (booking: Pick<Booking, 'date' | 'start' | 'end'>): string => {
	const day = formatIsoDate(booking.date, { weekday: 'short' })
	return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${formatBookingRange(booking)}`
}

export const describeViolation = (violation: BookingViolation): string => {
	switch (violation.code) {
		case 'DATE_IN_PAST':
			return 'Эта дата уже прошла'
		case 'START_IN_PAST':
			return 'Это время уже прошло'
		case 'OUTSIDE_WORKING_HOURS':
			return `Только с ${WORKING_HOURS.start} до ${WORKING_HOURS.end}`
		case 'START_NOT_BEFORE_END':
			return 'Окончание раньше начала'
		case 'TOO_SHORT':
			return `Минимум ${formatDuration(BOOKING_DURATION_MINUTES.min)}`
		case 'TOO_LONG':
			return `Максимум ${formatDuration(BOOKING_DURATION_MINUTES.max)}`
		case 'OVERLAP': {
			const ranges = violation.conflicts.map(formatBookingRange).join(', ')
			return `Пересекается с ${ranges}`
		}
	}
}
