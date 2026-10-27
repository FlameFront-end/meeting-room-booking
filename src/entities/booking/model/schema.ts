import { z } from 'zod'

import { isIsoDate } from '@/shared/lib/date'
import { isTimeString } from '@/shared/lib/time'

import { BOOKING_TITLE_MAX_LENGTH } from './constants'

/**
 * Схемы — единственный источник правды о форме данных брони.
 * Типы выводятся из них, а сами схемы проверяют ответы сервера и тела запросов в mock-сервере.
 * Бизнес-правила (рабочие часы, длительность, пересечения) живут отдельно — в rules.ts.
 */

export const isoDateSchema = z.string().refine(isIsoDate, { message: 'Дата должна быть в формате YYYY-MM-DD' })

export const timeSchema = z.string().refine(isTimeString, { message: 'Время должно быть в формате HH:mm' })

const titleSchema = z
	.string()
	.trim()
	.max(BOOKING_TITLE_MAX_LENGTH, { message: `Название — не длиннее ${BOOKING_TITLE_MAX_LENGTH} символов` })

export const bookingSchema = z.object({
	id: z.string().min(1),
	date: isoDateSchema,
	start: timeSchema,
	end: timeSchema,
	title: z.string().optional()
})

export const bookingListSchema = z.array(bookingSchema)

export const bookingInputSchema = z.object({
	date: isoDateSchema,
	start: timeSchema,
	end: timeSchema,
	title: titleSchema.optional()
})

export const bookingPatchSchema = bookingInputSchema.partial()

export type Booking = z.infer<typeof bookingSchema>
export type BookingInput = z.infer<typeof bookingInputSchema>
export type BookingPatch = z.infer<typeof bookingPatchSchema>

/** Интервал, по которому проверяются бизнес-правила. */
export type BookingSlot = Pick<Booking, 'date' | 'start' | 'end'>
