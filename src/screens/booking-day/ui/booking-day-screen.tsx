'use client'

import { useState } from 'react'

import { BOOKING_DURATION_MINUTES, isDateBookable, WORKING_HOURS, type Booking } from '@/entities/booking'
import { BookingFormDialog, type BookingFormTarget } from '@/features/booking-form'
import { DeleteBookingButton } from '@/features/delete-booking'
import { DateNavigator, useSelectedDate } from '@/features/select-date'
import { toIsoDate } from '@/shared/lib/date'
import { useHydrated, useNow } from '@/shared/lib/react'
import { formatDuration } from '@/shared/lib/time'
import { Button, Calendar, Icon, Spinner } from '@/shared/ui'
import { DaySchedule } from '@/widgets/day-schedule'
import { RoomStatus } from '@/widgets/room-status'

import styles from './booking-day-screen.module.scss'

const NO_HIGHLIGHT: ReadonlySet<string> = new Set()

const RULES = [
	`С ${WORKING_HOURS.start} до ${WORKING_HOURS.end}`,
	`От ${formatDuration(BOOKING_DURATION_MINUTES.min)} до ${formatDuration(BOOKING_DURATION_MINUTES.max)}`,
	'Встречи можно ставить встык'
]

/** Экран дня: собирает фичи и виджеты, сам бизнес-логики не содержит. */
const BookingDay = () => {
	const now = useNow()
	const today = toIsoDate(now)
	const [date, setDate] = useSelectedDate(today)
	const [formTarget, setFormTarget] = useState<BookingFormTarget | null>(null)
	// Брони, из-за которых сервер вернул 409, — подсвечиваем в расписании до следующего открытия формы
	const [highlightedIds, setHighlightedIds] = useState(NO_HIGHLIGHT)
	const canCreate = isDateBookable(date, now)

	const openForm = (target: BookingFormTarget) => {
		setHighlightedIds(NO_HIGHLIGHT)
		setFormTarget(target)
	}

	const onSaved = (booking: Booking) => {
		setFormTarget(null)
		// Дату могли поменять в форме — показываем день, где бронь теперь находится
		if (booking.date !== date) setDate(booking.date)
	}

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<div className={styles.room}>
					<h1 className={styles.title}>Переговорная</h1>
					<RoomStatus now={now} />
				</div>
				<Button
					variant='primary'
					icon={<Icon name='plus' size={16} />}
					disabled={!canCreate}
					aria-describedby={canCreate ? undefined : 'create-unavailable'}
					onClick={() => openForm({ mode: 'create', date })}
				>
					Новая бронь
				</Button>
			</header>

			<div className={styles.layout}>
				<aside className={styles.sidebar} aria-label='Календарь и правила'>
					<Calendar value={date} today={today} onSelect={setDate} />
					<section className={styles.rules} aria-labelledby='rules-title'>
						<h2 id='rules-title' className={styles.rulesTitle}>
							Как бронировать
						</h2>
						<ul>
							{RULES.map(rule => (
								<li key={rule}>{rule}</li>
							))}
						</ul>
					</section>
				</aside>

				<main className={styles.main}>
					<DateNavigator value={date} today={today} onChange={setDate} />
					{canCreate ? null : (
						<p id='create-unavailable' className={styles.hint}>
							Этот день уже прошёл
						</p>
					)}
					<DaySchedule
						date={date}
						now={now}
						highlightedIds={highlightedIds}
						onOpenBooking={booking => openForm({ mode: 'edit', booking })}
						onPickFreeWindow={window => openForm({ mode: 'create', date, from: window.start })}
					/>
				</main>
			</div>

			{formTarget ? (
				<BookingFormDialog
					target={formTarget}
					now={now}
					onClose={() => setFormTarget(null)}
					onSaved={onSaved}
					onConflict={conflicts => setHighlightedIds(new Set(conflicts.map(conflict => conflict.id)))}
					extraAction={
						formTarget.mode === 'edit' ? (
							<DeleteBookingButton booking={formTarget.booking} onDeleted={() => setFormTarget(null)} />
						) : null
					}
				/>
			) : null}
		</div>
	)
}

export const BookingDayScreen = () => {
	// «Сегодня» и «прошедшее время» зависят от часов пользователя — считаем только на клиенте
	const hydrated = useHydrated()
	return hydrated ? <BookingDay /> : <Spinner size='lg' center />
}
