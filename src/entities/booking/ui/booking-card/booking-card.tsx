import clsx from 'clsx'
import type { CSSProperties } from 'react'

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
	/** Клик по карточке (например, открыть редактирование); label — доступное имя этого действия. */
	action?: { label: string; onClick: () => void } | undefined
	className?: string | undefined
	style?: CSSProperties | undefined
}

/** Короткие брони не вмещают две строки — показываем время и название в одну. */
const COMPACT_MAX_MINUTES = 45

export const BookingCard = ({
	booking,
	past = false,
	highlighted = false,
	action,
	className,
	style
}: BookingCardProps) => {
	const duration = timeToMinutes(booking.end) - timeToMinutes(booking.start)
	const trimmedTitle = booking.title?.trim()
	const title = trimmedTitle || 'Без названия'

	return (
		<article
			className={clsx(
				styles.card,
				duration <= COMPACT_MAX_MINUTES && styles.compact,
				past && styles.past,
				highlighted && styles.highlighted,
				action && styles.interactive,
				className
			)}
			style={style}
			aria-label={`${formatBookingRange(booking)}, ${title}`}
		>
			<p className={clsx(styles.title, !trimmedTitle && styles.untitled)}>{title}</p>
			<p className={styles.meta}>
				<span className={styles.range}>{formatBookingRange(booking)}</span>
				<span className={styles.duration}>{formatDuration(duration)}</span>
				{/* Конфликт и «прошла» отмечаются текстом, а не только цветом */}
				{highlighted ? <span className={styles.conflict}>Пересекается</span> : null}
				{past && !highlighted ? <span className={styles.status}>Прошла</span> : null}
			</p>
			{action ? (
				<button type='button' className={styles.stretched} aria-label={action.label} onClick={action.onClick} />
			) : null}
		</article>
	)
}
