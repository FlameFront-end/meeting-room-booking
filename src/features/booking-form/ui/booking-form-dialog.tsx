'use client'

import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { BOOKING_DURATION_MINUTES, formatBookingWhen, WORKING_HOURS, type Booking } from '@/entities/booking'
import { toIsoDate } from '@/shared/lib/date'
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
	/** Дополнительное действие слева в подвале формы — например, «Удалить» при редактировании. */
	extraAction?: ReactNode
}

// Коротко, чтобы помещалось в одну строку и на мобиле
const RULES_HINT = `С ${WORKING_HOURS.start} до ${WORKING_HOURS.end}, от ${formatDuration(
	BOOKING_DURATION_MINUTES.min
)} до ${formatDuration(BOOKING_DURATION_MINUTES.max)}`

/** Создание и редактирование брони в модальном окне. */
export const BookingFormDialog = ({
	target,
	now,
	onClose,
	onSaved,
	onConflict,
	extraAction
}: BookingFormDialogProps) => {
	const state = useBookingForm({
		target,
		now,
		onConflict,
		onSaved: booking => {
			toast.success(target.mode === 'create' ? 'Бронь создана' : 'Бронь обновлена', {
				description: formatBookingWhen(booking)
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
			<BookingForm
				state={state}
				mode={target.mode}
				today={toIsoDate(now)}
				extraAction={extraAction}
				onCancel={onClose}
			/>
		</Dialog>
	)
}
