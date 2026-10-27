'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'

import {
	BookingCard,
	formatBookingRange,
	getFreeWindows,
	isBookingStarted,
	useBookingsQuery,
	WORKING_HOURS,
	type Booking,
	type FreeWindow
} from '@/entities/booking'
import { compareIsoDates, minutesSinceMidnight, toIsoDate, type IsoDate } from '@/shared/lib/date'
import { MINUTES_IN_HOUR, minutesToTime, timeToMinutes } from '@/shared/lib/time'
import { Alert, Button } from '@/shared/ui'

import styles from './day-schedule.module.scss'

type DayScheduleProps = {
	date: IsoDate
	now: Date
	/** id броней, которые нужно подсветить (например, конфликт после 409). */
	highlightedIds?: ReadonlySet<string>
	/** Открыть бронь (редактирование). Для начавшихся броней не вызывается — они только для чтения. */
	onOpenBooking?: (booking: Booking) => void
	/** Клик по свободному времени. Не передан — свободное время не кликабельно. */
	onPickFreeWindow?: (window: FreeWindow) => void
}

type ScheduleItem = { type: 'booking'; booking: Booking } | { type: 'free'; window: FreeWindow }

const DAY_START = timeToMinutes(WORKING_HOURS.start)
const DAY_END = timeToMinutes(WORKING_HOURS.end)
const HOURS = Array.from(
	{ length: (DAY_END - DAY_START) / MINUTES_IN_HOUR + 1 },
	(_, index) => DAY_START + index * MINUTES_IN_HOUR
)
/** Клик мышью по свободному времени округляется до получаса. */
const PICK_STEP = 30

/** Положение интервала в сетке: высота часа задаётся в CSS, здесь — только минуты. */
const placement = (start: string, end: string) =>
	({
		'--offset': timeToMinutes(start) - DAY_START,
		'--length': timeToMinutes(end) - timeToMinutes(start)
	}) as CSSProperties

const describeCount = (count: number) => {
	const mod10 = count % 10
	const mod100 = count % 100
	if (mod10 === 1 && mod100 !== 11) return `${count} бронь`
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} брони`
	return `${count} броней`
}

/** Сколько минут рабочего дня уже прошло: для прошлых дат — весь день, для будущих — ничего. */
const pastMinutes = (date: IsoDate, now: Date) => {
	const order = compareIsoDates(date, toIsoDate(now))
	if (order !== 0) return order < 0 ? DAY_END - DAY_START : 0
	return Math.min(Math.max(minutesSinceMidnight(now) - DAY_START, 0), DAY_END - DAY_START)
}

const HourGrid = ({
	children,
	past = 0,
	nowOffset
}: {
	children?: ReactNode
	past?: number
	nowOffset?: number | null
}) => (
	<div className={styles.grid}>
		<ol className={styles.hours} aria-hidden='true'>
			{HOURS.map(minutes => (
				<li key={minutes} style={{ '--offset': minutes - DAY_START } as CSSProperties}>
					{minutesToTime(minutes)}
				</li>
			))}
		</ol>
		<div className={styles.canvas} style={{ '--hours': HOURS.length - 1 } as CSSProperties}>
			{past > 0 ? (
				<div className={styles.past} style={{ '--length': past } as CSSProperties} aria-hidden='true' />
			) : null}
			{children}
			{nowOffset === null || nowOffset === undefined ? null : (
				<div className={styles.now} style={{ '--offset': nowOffset } as CSSProperties} aria-hidden='true' />
			)}
		</div>
	</div>
)

export const DaySchedule = ({ date, now, highlightedIds, onOpenBooking, onPickFreeWindow }: DayScheduleProps) => {
	const { data: bookings, status, error, isFetching, refetch } = useBookingsQuery(date)

	if (status === 'pending') {
		return (
			<div role='status' className={styles.loading}>
				<span className={styles.srOnly}>Загружаем брони…</span>
				<HourGrid>
					<div className={styles.skeleton} style={placement('10:00', '11:00')} />
					<div className={styles.skeleton} style={placement('13:00', '14:30')} />
				</HourGrid>
			</div>
		)
	}

	if (status === 'error') {
		return (
			<Alert
				tone='danger'
				title='Не удалось загрузить расписание'
				action={
					<Button size='sm' variant='secondary' loading={isFetching} onClick={() => void refetch()}>
						Повторить
					</Button>
				}
			>
				{error.message}
			</Alert>
		)
	}

	const isToday = date === toIsoDate(now)
	const nowMinutes = minutesSinceMidnight(now)
	const nowOffset = isToday && nowMinutes >= DAY_START && nowMinutes <= DAY_END ? nowMinutes - DAY_START : null

	const freeWindows = onPickFreeWindow ? getFreeWindows(date, bookings, now) : []
	const items: ScheduleItem[] = [
		...bookings.map(booking => ({ type: 'booking' as const, booking })),
		...freeWindows.map(window => ({ type: 'free' as const, window }))
	].sort(
		(a, b) =>
			timeToMinutes(a.type === 'booking' ? a.booking.start : a.window.start) -
			timeToMinutes(b.type === 'booking' ? b.booking.start : b.window.start)
	)

	const pickFree = (window: FreeWindow) => (event: MouseEvent<HTMLButtonElement>) => {
		// С клавиатуры (detail === 0) — начало окна; мышью — время под курсором, округлённое до получаса
		if (event.detail === 0) {
			onPickFreeWindow?.(window)
			return
		}
		const rect = event.currentTarget.getBoundingClientRect()
		if (rect.height <= 0) {
			onPickFreeWindow?.(window)
			return
		}
		const start = timeToMinutes(window.start)
		const end = timeToMinutes(window.end)
		const pointer = start + ((event.clientY - rect.top) / rect.height) * (end - start)
		const snapped = Math.max(start, Math.floor(pointer / PICK_STEP) * PICK_STEP)
		onPickFreeWindow?.({ start: minutesToTime(Math.min(snapped, end - PICK_STEP)), end: window.end })
	}

	return (
		<section className={styles.schedule} aria-labelledby='day-schedule-title' aria-busy={isFetching}>
			{/* Сетка говорит сама за себя; заголовок и счётчик нужны скринридеру */}
			<div className={styles.srOnly}>
				<h2 id='day-schedule-title'>Расписание</h2>
				<p aria-live='polite'>
					{isFetching ? 'Обновляем…' : bookings.length === 0 ? 'Броней нет' : describeCount(bookings.length)}
				</p>
			</div>

			<HourGrid past={pastMinutes(date, now)} nowOffset={nowOffset}>
				<ol className={styles.items}>
					{items.map(item => {
						if (item.type === 'free') {
							const { window } = item
							return (
								<li
									key={`free-${window.start}`}
									className={styles.slot}
									style={placement(window.start, window.end)}
								>
									<button type='button' className={styles.free} onClick={pickFree(window)}>
										<span className={styles.freeLabel}>
											Свободно {window.start}–{window.end}
										</span>
									</button>
								</li>
							)
						}

						const { booking } = item
						const locked = isBookingStarted(booking, now)
						return (
							<li key={booking.id} className={styles.slot} style={placement(booking.start, booking.end)}>
								<BookingCard
									className={styles.event}
									booking={booking}
									past={locked}
									highlighted={highlightedIds?.has(booking.id) ?? false}
									action={
										onOpenBooking && !locked
											? {
													label: `Изменить бронь ${formatBookingRange(booking)}`,
													onClick: () => onOpenBooking(booking)
												}
											: undefined
									}
								/>
							</li>
						)
					})}
				</ol>
			</HourGrid>
		</section>
	)
}
