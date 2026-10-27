'use client'

import { toast } from 'sonner'

import { BOOKING_DURATION_MINUTES, formatBookingRange, WORKING_HOURS, type Booking } from '@/entities/booking'
import { formatIsoDate, toIsoDate } from '@/shared/lib/date'
import { formatDuration } from '@/shared/lib/time'
import { Dialog } from '@/shared/ui'

import type { BookingFormTarget } from '../model/form-schema'
import { useBookingForm } from '../model/use-booking-form'

import { BookingForm } from './booking-form'

type BookingFormDialogProps = {
	target: BookingFormTarget
	now: Date
	onClose: () => void
	onSaved: (booking: Booking) => void
	onConflict?: (conflicts: Booking[]) => void
}

const RULES_HINT = `Рабочий день ${WORKING_HOURS.start}–${WORKING_HOURS.end}, длительность от ${formatDuration(
	BOOKING_DURATION_MINUTES.min
)} до ${formatDuration(BOOKING_DURATION_MINUTES.max)}`

/** Создание и редактирование брони в модальном окне. */
export const BookingFormDialog = ({ target, now, onClose, onSaved, onConflict }: BookingFormDialogProps) => {
	const state = useBookingForm({
		target,
		now,
		onConflict,
		onSaved: booking => {
			toast.success(target.mode === 'create' ? 'Бронь создана' : 'Изменения сохранены', {
				description: `${formatIsoDate(booking.date)}, ${formatBookingRange(booking)}`
			})
			onSaved(booking)
		}
	})

	return (
		<Dialog
			title={target.mode === 'create' ? 'Новая бронь' : 'Изменить бронь'}
			description={RULES_HINT}
			dismissible={!state.isPending}
			onClose={onClose}
		>
			<BookingForm state={state} mode={target.mode} minDate={toIsoDate(now)} onCancel={onClose} />
		</Dialog>
	)
}
