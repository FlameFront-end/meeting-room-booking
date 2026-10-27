import clsx from 'clsx'

import { formatBookingRange, WORKING_HOURS, type Booking, type BookingSlot } from '@/entities/booking'
import { isTimeString, timeToMinutes } from '@/shared/lib/time'

import styles from './booking-form.module.scss'

type BusySlotsProps = {
	bookings: readonly Booking[]
	status: 'pending' | 'error' | 'success' | 'idle'
	conflictIds: ReadonlySet<string>
	/** Выбранный в форме интервал — показываем на шкале поверх занятого времени. */
	selected: BookingSlot
}

const DAY_START = timeToMinutes(WORKING_HOURS.start)
const DAY_LENGTH = timeToMinutes(WORKING_HOURS.end) - DAY_START
const TICKS = ['09:00', '12:00', '15:00', '18:00']

/** Положение интервала на шкале рабочего дня, в процентах. */
const position = (start: string, end: string) => {
	const clamp = (value: number) => Math.min(Math.max(value, 0), 100)
	const left = clamp(((timeToMinutes(start) - DAY_START) / DAY_LENGTH) * 100)
	const right = clamp(((timeToMinutes(end) - DAY_START) / DAY_LENGTH) * 100)
	return { left: `${left}%`, width: `${Math.max(right - left, 0)}%` }
}

const summary = (status: BusySlotsProps['status'], hasConflict: boolean) => {
	if (status === 'pending') return { text: 'Проверяем…', tone: styles.summaryMuted }
	if (status === 'error') {
		return { text: 'Не удалось проверить, свободно ли', tone: styles.summaryMuted }
	}
	// О пересечении подробно говорит предупреждение над шкалой — здесь не дублируем
	return hasConflict ? null : { text: 'Время свободно', tone: styles.summaryFree }
}

/**
 * Занятость дня в форме: шкала 09–18 с занятыми отрезками и выбранным слотом и итог одной строкой.
 * Шкала — для зрячих (aria-hidden); для скринридера тот же список броней текстом.
 */
export const BusySlots = ({ bookings, status, conflictIds, selected }: BusySlotsProps) => {
	if (status === 'idle') return null
	const hasSelection =
		isTimeString(selected.start) &&
		isTimeString(selected.end) &&
		timeToMinutes(selected.end) > timeToMinutes(selected.start)
	const result = summary(status, conflictIds.size > 0)

	return (
		<section className={styles.busy} aria-labelledby='busy-slots-title'>
			<h3 id='busy-slots-title' className={styles.srOnly}>
				Занято в этот день
			</h3>

			<div className={styles.scale} aria-hidden='true'>
				<div className={styles.track}>
					{bookings.map(booking => (
						<span
							key={booking.id}
							className={clsx(styles.segment, conflictIds.has(booking.id) && styles.segmentConflict)}
							style={position(booking.start, booking.end)}
							title={`${formatBookingRange(booking)} ${booking.title ?? ''}`}
						/>
					))}
					{hasSelection ? (
						<span className={styles.segmentSelected} style={position(selected.start, selected.end)} />
					) : null}
				</div>
				<div className={styles.ticks}>
					{TICKS.map(tick => (
						<span key={tick}>{tick}</span>
					))}
				</div>
			</div>

			<p className={clsx(styles.summary, result?.tone)} aria-live='polite'>
				{result ? (
					<span key={result.text} className={styles.summaryText}>
						{result.text}
					</span>
				) : null}
			</p>

			{status === 'success' ? (
				<ul className={styles.srOnly}>
					{bookings.length === 0 ? <li>Весь день свободен</li> : null}
					{bookings.map(booking => (
						<li key={booking.id}>
							{formatBookingRange(booking)} · {booking.title ?? 'Без названия'}
							{conflictIds.has(booking.id) ? ', пересекается' : null}
						</li>
					))}
				</ul>
			) : null}
		</section>
	)
}
