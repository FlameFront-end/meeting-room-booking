'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { formatBookingRange, useDeleteBookingMutation, type Booking } from '@/entities/booking'
import { formatIsoDate } from '@/shared/lib/date'
import { Alert, Button, Dialog } from '@/shared/ui'

import { toDeleteError, type DeleteFailure } from '../model/delete-error'

import styles from './delete-booking-button.module.scss'

const describe = (booking: Booking) =>
	`${formatIsoDate(booking.date)}, ${formatBookingRange(booking)}${booking.title ? ` — ${booking.title}` : ''}`

const ConfirmDeleteDialog = ({ booking, onClose }: { booking: Booking; onClose: () => void }) => {
	const mutation = useDeleteBookingMutation()
	const [error, setError] = useState<DeleteFailure | null>(null)

	const confirm = async () => {
		setError(null)
		try {
			// mutateAsync, а не mutate: после удаления карточка вместе с этим окном размонтируется,
			// а колбэки mutate у размонтированного компонента не вызываются — тост бы потерялся
			await mutation.mutateAsync({ id: booking.id, date: booking.date })
			toast.success('Бронь удалена', { description: describe(booking) })
			onClose()
		} catch (caught) {
			const next = toDeleteError(caught)
			if (next.type === 'gone') {
				toast.info('Бронь уже удалили', { description: 'Список броней обновлён.' })
				onClose()
				return
			}
			setError(next)
		}
	}

	return (
		<Dialog
			title='Удалить бронь?'
			description={describe(booking)}
			size='sm'
			dismissible={!mutation.isPending}
			onClose={onClose}
		>
			{error ? (
				<Alert tone='danger' title='Не удалось удалить'>
					{error.message}
				</Alert>
			) : null}
			<div className={styles.actions}>
				<Button variant='ghost' disabled={mutation.isPending} data-autofocus onClick={onClose}>
					{error?.type === 'locked' ? 'Закрыть' : 'Отмена'}
				</Button>
				{error?.type === 'locked' ? null : (
					<Button variant='danger' loading={mutation.isPending} onClick={() => void confirm()}>
						{error ? 'Повторить' : 'Удалить'}
					</Button>
				)}
			</div>
		</Dialog>
	)
}

/** Кнопка «Удалить» с подтверждением. Для начавшихся броней её не показывают — решает расписание. */
export const DeleteBookingButton = ({ booking }: { booking: Booking }) => {
	const [isConfirming, setIsConfirming] = useState(false)

	return (
		<>
			<Button
				size='sm'
				variant='danger'
				aria-label={`Удалить бронь ${formatBookingRange(booking)}`}
				onClick={() => setIsConfirming(true)}
			>
				Удалить
			</Button>
			{isConfirming ? <ConfirmDeleteDialog booking={booking} onClose={() => setIsConfirming(false)} /> : null}
		</>
	)
}
