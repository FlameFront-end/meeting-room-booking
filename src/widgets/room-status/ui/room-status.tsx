'use client'

import clsx from 'clsx'

import { getRoomStatus, useBookingsQuery, type RoomStatus as Status } from '@/entities/booking'
import { toIsoDate } from '@/shared/lib/date'

import styles from './room-status.module.scss'

const describe = (status: Status): string => {
	switch (status.state) {
		case 'closed':
			return 'Сейчас закрыта'
		case 'busy':
			return `Занята до ${status.until}${status.booking.title ? ` · ${status.booking.title}` : ''}`
		case 'free':
			return status.until ? `Свободна до ${status.until}` : 'Свободна до конца дня'
	}
}

/** Статус переговорной прямо сейчас — как табличка у двери. Не зависит от выбранной в расписании даты. */
export const RoomStatus = ({ now }: { now: Date }) => {
	const { data } = useBookingsQuery(toIsoDate(now))
	if (!data) return <p className={styles.status}>&nbsp;</p>

	const status = getRoomStatus(data, now)
	return (
		<p className={styles.status} aria-live='polite'>
			<span className={clsx(styles.dot, styles[status.state])} aria-hidden='true' />
			{describe(status)}
		</p>
	)
}
