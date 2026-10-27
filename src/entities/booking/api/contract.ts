import { z } from 'zod'

import { isApiError } from '@/shared/api'

import { bookingSchema, type Booking } from '../model/schema'
import type { BookingViolation } from '../model/violations'

/**
 * Контракт API бронирований.
 *
 * GET    /api/bookings?date=YYYY-MM-DD → 200 Booking[]
 * POST   /api/bookings                 → 201 Booking
 * PATCH  /api/bookings/:id             → 200 Booking
 * DELETE /api/bookings/:id             → 204
 *
 * Ошибки: { error: { code, message, details? } }
 *   400 INVALID_REQUEST             — тело/параметры не прошли схему
 *   404 BOOKING_NOT_FOUND
 *   409 BOOKING_CONFLICT            — details: { conflicts: Booking[] }
 *   422 BOOKING_VALIDATION_FAILED   — details: { violations: BookingViolation[] }
 *   422 BOOKING_LOCKED              — бронь уже началась, менять нельзя
 */
export const BOOKINGS_ENDPOINT = '/api/bookings'

export const BOOKING_ERROR_CODES = {
	invalidRequest: 'INVALID_REQUEST',
	notFound: 'BOOKING_NOT_FOUND',
	conflict: 'BOOKING_CONFLICT',
	validationFailed: 'BOOKING_VALIDATION_FAILED',
	locked: 'BOOKING_LOCKED'
} as const

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[keyof typeof BOOKING_ERROR_CODES]

export type BookingConflictDetails = { conflicts: Booking[] }
export type BookingValidationDetails = { violations: BookingViolation[] }

const conflictDetailsSchema = z.object({ conflicts: z.array(bookingSchema) })

/** Брони, из-за которых сервер вернул 409. Пустой массив, если ошибка другая или details не пришли. */
export const getConflictsFromError = (error: unknown): Booking[] => {
	if (!isApiError(error) || error.kind !== 'conflict') return []
	const parsed = conflictDetailsSchema.safeParse(error.details)
	return parsed.success ? parsed.data.conflicts : []
}

export const isBookingConflictError = (error: unknown): boolean => isApiError(error) && error.kind === 'conflict'
