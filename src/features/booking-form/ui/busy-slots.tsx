import clsx from 'clsx'

import { formatBookingRange, type Booking } from '@/entities/booking'

import styles from './booking-form.module.scss'

type BusySlotsProps = {
	bookings: readonly Booking[]
	status: 'pending' | 'error' | 'success' | 'idle'
	conflictIds: ReadonlySet<string>
}

/** Занятое время на выбранную дату — чтобы выбирать слот, не закрывая форму. */
export const BusySlots = ({ bookings, status, conflictIds }: BusySlotsProps) => {
	if (status === 'idle') return null

	return (
		<section className={styles.busy} aria-labelledby='busy-slots-title' aria-busy={status === 'pending'}>
			<h3 id='busy-slots-title' className={styles.busyTitle}>
				Занято в этот день
			</h3>
			{status === 'pending' ? <p className={styles.muted}>Загружаем…</p> : null}
			{status === 'error' ? (
				<p className={styles.muted}>Не удалось загрузить занятое время — сервер всё равно проверит слот.</p>
			) : null}
			{status === 'success' && bookings.length === 0 ? (
				<p className={styles.muted}>Ничего — переговорная свободна весь день.</p>
			) : null}
			{status === 'success' && bookings.length > 0 ? (
				<ul className={styles.busyList}>
					{bookings.map(booking => {
						const conflicting = conflictIds.has(booking.id)
						return (
							<li key={booking.id} className={clsx(styles.busyItem, conflicting && styles.conflicting)}>
								<span className={styles.busyRange}>{formatBookingRange(booking)}</span>
								<span className={styles.busyName}>{booking.title ?? 'Без названия'}</span>
								{conflicting ? (
									<span className={styles.srOnly}>, пересекается с выбранным временем</span>
								) : null}
							</li>
						)
					})}
				</ul>
			) : null}
		</section>
	)
}
