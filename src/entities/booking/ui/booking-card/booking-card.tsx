import clsx from 'clsx'
import type { ReactNode } from 'react'

import { formatDuration, timeToMinutes } from '@/shared/lib/time'

import type { Booking } from '../../model/schema'
import { formatBookingRange } from '../../model/violations'

import styles from './booking-card.module.scss'

type BookingCardProps = {
	booking: Booking
	/** Бронь уже началась или прошла: показываем приглушённо. */
	past?: boolean
	/** Подсветка, например конфликтующей брони после 409. */
	highlighted?: boolean
	/** Слот для действий (редактировать, удалить) — их приносит слой features. */
	actions?: ReactNode
}

export const BookingCard = ({ booking, past = false, highlighted = false, actions }: BookingCardProps) => {
	const duration = timeToMinutes(booking.end) - timeToMinutes(booking.start)
	const trimmedTitle = booking.title?.trim()
	const title = trimmedTitle || 'Без названия'

	return (
		<article
			className={clsx(styles.card, past && styles.past, highlighted && styles.highlighted)}
			aria-label={`${formatBookingRange(booking)}, ${title}`}
		>
			<div className={styles.time}>
				<span className={styles.range}>{formatBookingRange(booking)}</span>
				<span className={styles.duration}>{formatDuration(duration)}</span>
			</div>
			<p className={clsx(styles.title, !trimmedTitle && styles.untitled)}>{title}</p>
			{past ? <span className={styles.badge}>Прошла</span> : null}
			{actions ? <div className={styles.actions}>{actions}</div> : null}
		</article>
	)
}
