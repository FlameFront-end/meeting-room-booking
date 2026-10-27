'use client'

import { DateNavigator, useSelectedDate } from '@/features/select-date'
import { toIsoDate } from '@/shared/lib/date'
import { useHydrated, useNow } from '@/shared/lib/react'
import { Spinner } from '@/shared/ui'
import { DaySchedule } from '@/widgets/day-schedule'

import styles from './booking-day-screen.module.scss'

/** Экран дня: собирает фичи и виджеты, сам бизнес-логики не содержит. */
const BookingDay = () => {
	const now = useNow()
	const today = toIsoDate(now)
	const [date, setDate] = useSelectedDate(today)

	return (
		<main className={styles.screen}>
			<header className={styles.header}>
				<h1 className={styles.title}>Переговорная</h1>
				<DateNavigator value={date} today={today} onChange={setDate} />
			</header>
			<DaySchedule date={date} now={now} />
		</main>
	)
}

export const BookingDayScreen = () => {
	// «Сегодня» и «прошедшее время» зависят от часов пользователя — считаем только на клиенте
	const hydrated = useHydrated()
	return hydrated ? <BookingDay /> : <Spinner size='lg' center />
}
