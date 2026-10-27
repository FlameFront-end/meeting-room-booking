'use client'

import { useId, type ReactNode } from 'react'
import { toast } from 'sonner'

import { BOOKING_DURATION_MINUTES, formatBookingWhen, WORKING_HOURS, type Booking } from '@/entities/booking'
import { toIsoDate } from '@/shared/lib/date'
import { formatDuration } from '@/shared/lib/time'
import { Button, Dialog } from '@/shared/ui'

import type { BookingFormTarget } from '../model/form-schema'
import { useBookingForm } from '../model/use-booking-form'

import { BookingForm } from './booking-form'
import styles from './booking-form.module.scss'

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
	const formId = useId()
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
			footer={
				<>
					{extraAction ? (
						// Пока бронь сохраняется, удалять её нельзя
						<fieldset className={styles.extraAction} disabled={state.isPending}>
							{extraAction}
						</fieldset>
					) : null}
					<Button variant='secondary' disabled={state.isPending} onClick={onClose}>
						Отмена
					</Button>
					<Button type='submit' form={formId} variant='primary' loading={state.isPending}>
						{target.mode === 'create' ? 'Забронировать' : 'Сохранить'}
					</Button>
				</>
			}
		>
			<BookingForm id={formId} state={state} today={toIsoDate(now)} />
		</Dialog>
	)
}
