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

export const describeViolation = (violation: BookingViolation): string => {
	switch (violation.code) {
		case 'DATE_IN_PAST':
			return 'Нельзя бронировать на прошедшую дату'
		case 'START_IN_PAST':
			return 'Это время уже прошло'
		case 'OUTSIDE_WORKING_HOURS':
			return `Бронировать можно только в рабочее время: ${WORKING_HOURS.start}–${WORKING_HOURS.end}`
		case 'START_NOT_BEFORE_END':
			return 'Окончание должно быть позже начала'
		case 'TOO_SHORT':
			return `Минимальная длительность — ${formatDuration(BOOKING_DURATION_MINUTES.min)}`
		case 'TOO_LONG':
			return `Максимальная длительность — ${formatDuration(BOOKING_DURATION_MINUTES.max)}`
		case 'OVERLAP': {
			const ranges = violation.conflicts.map(formatBookingRange).join(', ')
			return `Время пересекается с другой бронью: ${ranges}`
		}
	}
}
