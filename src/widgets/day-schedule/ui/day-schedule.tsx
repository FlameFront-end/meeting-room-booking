'use client'

import type { ReactNode } from 'react'

import { BookingCard, isBookingStarted, useBookingsQuery, WORKING_HOURS, type Booking } from '@/entities/booking'
import type { IsoDate } from '@/shared/lib/date'
import { Alert, Button, Spinner } from '@/shared/ui'

import styles from './day-schedule.module.scss'

type DayScheduleProps = {
	date: IsoDate
	now: Date
	/** id броней, которые нужно подсветить (например, конфликт после 409). */
	highlightedIds?: ReadonlySet<string>
	/** Действия над бронью приходят сверху: виджет не знает, какие фичи доступны. */
	renderActions?: (booking: Booking, context: { locked: boolean }) => ReactNode
}

export const DaySchedule = ({ date, now, highlightedIds, renderActions }: DayScheduleProps) => {
	const { data: bookings, status, error, isFetching, refetch } = useBookingsQuery(date)

	if (status === 'pending') {
		return <Spinner label='Загружаем брони…' size='lg' center />
	}

	if (status === 'error') {
		return (
			<Alert
				tone='danger'
				title='Не удалось загрузить брони'
				action={
					<Button size='sm' loading={isFetching} onClick={() => void refetch()}>
						Повторить
					</Button>
				}
			>
				{error.message}
			</Alert>
		)
	}

	return (
		<section className={styles.schedule} aria-labelledby='day-schedule-title' aria-busy={isFetching}>
			<header className={styles.header}>
				<h2 id='day-schedule-title' className={styles.title}>
					Брони
				</h2>
				<span className={styles.meta} aria-live='polite'>
					{isFetching
						? 'Обновляем…'
						: `${bookings.length} шт. · рабочий день ${WORKING_HOURS.start}–${WORKING_HOURS.end}`}
				</span>
			</header>

			{bookings.length === 0 ? (
				<p className={styles.empty}>На эту дату броней нет — переговорная свободна весь день.</p>
			) : (
				<ul className={styles.list}>
					{bookings.map(booking => {
						const locked = isBookingStarted(booking, now)
						return (
							<li key={booking.id}>
								<BookingCard
									booking={booking}
									past={locked}
									highlighted={highlightedIds?.has(booking.id) ?? false}
									actions={renderActions?.(booking, { locked })}
								/>
							</li>
						)
					})}
				</ul>
			)}
		</section>
	)
}
