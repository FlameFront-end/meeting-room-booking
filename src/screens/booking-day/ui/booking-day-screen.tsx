'use client'

import { useState } from 'react'

import { formatBookingRange, isDateBookable, type Booking } from '@/entities/booking'
import { BookingFormDialog, type BookingFormTarget } from '@/features/booking-form'
import { DeleteBookingButton } from '@/features/delete-booking'
import { DateNavigator, useSelectedDate } from '@/features/select-date'
import { toIsoDate } from '@/shared/lib/date'
import { useHydrated, useNow } from '@/shared/lib/react'
import { Button, Spinner } from '@/shared/ui'
import { DaySchedule } from '@/widgets/day-schedule'

import styles from './booking-day-screen.module.scss'

const NO_HIGHLIGHT: ReadonlySet<string> = new Set()

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
		<main className={styles.screen}>
			<header className={styles.header}>
				<h1 className={styles.title}>Переговорная</h1>
				<DateNavigator value={date} today={today} onChange={setDate} />
			</header>

			<div className={styles.toolbar}>
				<Button
					variant='primary'
					disabled={!canCreate}
					aria-describedby={canCreate ? undefined : 'create-unavailable'}
					onClick={() => openForm({ mode: 'create', date })}
				>
					Новая бронь
				</Button>
				{canCreate ? null : (
					<p id='create-unavailable' className={styles.hint}>
						Дата уже прошла — создать бронь нельзя.
					</p>
				)}
			</div>

			<DaySchedule
				date={date}
				now={now}
				highlightedIds={highlightedIds}
				renderActions={(booking, { locked }) =>
					locked ? null : (
						<>
							<Button
								size='sm'
								variant='ghost'
								aria-label={`Изменить бронь ${formatBookingRange(booking)}`}
								onClick={() => openForm({ mode: 'edit', booking })}
							>
								Изменить
							</Button>
							<DeleteBookingButton booking={booking} />
						</>
					)
				}
			/>

			{formTarget ? (
				<BookingFormDialog
					target={formTarget}
					now={now}
					onClose={() => setFormTarget(null)}
					onSaved={onSaved}
					onConflict={conflicts => setHighlightedIds(new Set(conflicts.map(conflict => conflict.id)))}
				/>
			) : null}
		</main>
	)
}

export const BookingDayScreen = () => {
	// «Сегодня» и «прошедшее время» зависят от часов пользователя — считаем только на клиенте
	const hydrated = useHydrated()
	return hydrated ? <BookingDay /> : <Spinner size='lg' center />
}
