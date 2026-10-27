'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { formatBookingRange, formatBookingWhen, useDeleteBookingMutation, type Booking } from '@/entities/booking'
import { Alert, Button, Dialog, Icon } from '@/shared/ui'

import { toDeleteError, type DeleteFailure } from '../model/delete-error'

import styles from './delete-booking-button.module.scss'

const describe = (booking: Booking) => `${formatBookingWhen(booking)}${booking.title ? ` · ${booking.title}` : ''}`

type ConfirmDeleteDialogProps = { booking: Booking; onClose: () => void; onDeleted?: (() => void) | undefined }

const ConfirmDeleteDialog = ({ booking, onClose, onDeleted }: ConfirmDeleteDialogProps) => {
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
			onDeleted?.()
		} catch (caught) {
			const next = toDeleteError(caught)
			if (next.type === 'gone') {
				toast.info('Эту бронь уже удалили')
				onClose()
				onDeleted?.()
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
				<Alert tone='danger' title='Не получилось удалить'>
					{error.message}
				</Alert>
			) : null}
			<div className={styles.actions}>
				<Button variant='ghost' disabled={mutation.isPending} data-autofocus onClick={onClose}>
					{error?.type === 'locked' ? 'Закрыть' : 'Отмена'}
				</Button>
				{error?.type === 'locked' ? null : (
					<Button variant='dangerSolid' loading={mutation.isPending} onClick={() => void confirm()}>
						{error ? 'Повторить' : 'Удалить'}
					</Button>
				)}
			</div>
		</Dialog>
	)
}

type DeleteBookingButtonProps = {
	booking: Booking
	/** Бронь удалена (или её уже не было) — например, закрыть форму редактирования. */
	onDeleted?: () => void
}

/** Кнопка «Удалить» с подтверждением. */
export const DeleteBookingButton = ({ booking, onDeleted }: DeleteBookingButtonProps) => {
	const [isConfirming, setIsConfirming] = useState(false)

	return (
		<>
			<Button
				variant='danger'
				icon={<Icon name='trash' size={16} />}
				aria-label={`Удалить бронь ${formatBookingRange(booking)}`}
				onClick={() => setIsConfirming(true)}
			>
				Удалить
			</Button>
			{isConfirming ? (
				<ConfirmDeleteDialog booking={booking} onDeleted={onDeleted} onClose={() => setIsConfirming(false)} />
			) : null}
		</>
	)
}
