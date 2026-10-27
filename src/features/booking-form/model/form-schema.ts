import type { z } from 'zod'

import { bookingInputSchema, type Booking, type BookingSlot } from '@/entities/booking'
import type { IsoDate } from '@/shared/lib/date'
import type { TimeString } from '@/shared/lib/time'

/**
 * Схема формы — та же, что у тела запроса, но название всегда строка (пустая — «без названия»).
 * Форматы проверяет Zod, бизнес-правила — validateBooking: они зависят от «сейчас» и чужих броней.
 */
export const bookingFormSchema = bookingInputSchema.required({ title: true })

export type BookingFormInput = z.input<typeof bookingFormSchema>
export type BookingFormValues = z.output<typeof bookingFormSchema>

/** Что открыто в форме: новая бронь на дату или редактирование существующей. */
export type BookingFormTarget =
	/** `from` — начать подбор слота с этого времени (клик по свободному окну в расписании). */
	{ mode: 'create'; date: IsoDate; from?: TimeString | undefined } | { mode: 'edit'; booking: Booking }

export const isSameSlot = (a: BookingSlot, b: BookingSlot): boolean =>
	a.date === b.date && a.start === b.start && a.end === b.end
