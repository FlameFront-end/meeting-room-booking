'use client'

import clsx from 'clsx'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import {
	addDays,
	addMonths,
	compareIsoDates,
	formatIsoDate,
	getCalendarWeeks,
	startOfMonth,
	weekdayIndex,
	type IsoDate
} from '@/shared/lib/date'

import { Icon } from '../icon/icon'

import styles from './calendar.module.scss'

type CalendarProps = {
	value: IsoDate
	today: IsoDate
	onSelect: (day: IsoDate) => void
	/** Дни раньше min видны, но выбрать их нельзя. */
	min?: IsoDate | undefined
	/** Сразу поставить фокус на выбранный день (календарь во всплывающем окне). */
	autoFocus?: boolean
	className?: string | undefined
}

const WEEKDAYS = [
	['Пн', 'понедельник'],
	['Вт', 'вторник'],
	['Ср', 'среда'],
	['Чт', 'четверг'],
	['Пт', 'пятница'],
	['Сб', 'суббота'],
	['Вс', 'воскресенье']
] as const

const formatMonth = (value: IsoDate) => formatIsoDate(value, { weekday: undefined, day: undefined, year: 'numeric' })
const formatFull = (value: IsoDate) => formatIsoDate(value, { year: 'numeric' })

/**
 * Месяц по паттерну WAI-ARIA «grid» с блуждающим tabindex: Tab попадает в сетку один раз,
 * дальше стрелки (±1 день / ±неделя), Home/End — начало и конец недели, PageUp/PageDown — месяц
 * (с Shift — год), Enter — выбрать.
 */
export const Calendar = ({ value, today, onSelect, min, autoFocus = false, className }: CalendarProps) => {
	const titleId = useId()
	const gridRef = useRef<HTMLTableElement>(null)
	const [focused, setFocused] = useState(value)
	const [syncedValue, setSyncedValue] = useState(value)
	// Фокус переводим только по действию с клавиатуры (или при открытии), а не при каждом рендере
	const shouldFocus = useRef(autoFocus)

	// Дату сменили снаружи (стрелками в шапке) — календарь показывает её месяц
	if (syncedValue !== value) {
		setSyncedValue(value)
		setFocused(value)
	}

	const month = startOfMonth(focused)
	const isDisabledDay = (day: IsoDate) => min !== undefined && compareIsoDates(day, min) < 0

	useEffect(() => {
		if (!shouldFocus.current) return
		shouldFocus.current = false
		gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus()
	}, [focused])

	const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
		const moves: Record<string, () => IsoDate> = {
			ArrowLeft: () => addDays(focused, -1),
			ArrowRight: () => addDays(focused, 1),
			ArrowUp: () => addDays(focused, -7),
			ArrowDown: () => addDays(focused, 7),
			Home: () => addDays(focused, -weekdayIndex(focused)),
			End: () => addDays(focused, 6 - weekdayIndex(focused)),
			PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
			PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1)
		}
		const move = moves[event.key]
		if (!move) return
		event.preventDefault()
		shouldFocus.current = true
		setFocused(move())
	}

	return (
		<div className={clsx(styles.calendar, className)}>
			<div className={styles.header}>
				<h2 id={titleId} className={styles.month} aria-live='polite'>
					{formatMonth(month)}
				</h2>
				<div className={styles.navs}>
					<button
						type='button'
						className={styles.nav}
						aria-label='Предыдущий месяц'
						onClick={() => setFocused(addMonths(focused, -1))}
					>
						<Icon name='chevron-left' size={16} />
					</button>
					<button
						type='button'
						className={styles.nav}
						aria-label='Следующий месяц'
						onClick={() => setFocused(addMonths(focused, 1))}
					>
						<Icon name='chevron-right' size={16} />
					</button>
				</div>
			</div>

			<table
				ref={gridRef}
				role='grid'
				aria-labelledby={titleId}
				className={styles.grid}
				onKeyDown={onGridKeyDown}
			>
				<thead>
					<tr>
						{WEEKDAYS.map(([short, full]) => (
							<th key={short} scope='col' abbr={full} className={styles.weekday}>
								{short}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{getCalendarWeeks(month).map(week => (
						<tr key={week[0]}>
							{week.map(day => {
								const isSelected = day === value
								return (
									<td key={day} aria-selected={isSelected}>
										<button
											type='button'
											data-date={day}
											tabIndex={day === focused ? 0 : -1}
											aria-label={formatFull(day)}
											aria-current={day === today ? 'date' : undefined}
											aria-disabled={isDisabledDay(day) || undefined}
											className={clsx(
												styles.day,
												startOfMonth(day) !== month && styles.outside,
												day === today && styles.today,
												isSelected && styles.selected
											)}
											onClick={() => {
												if (!isDisabledDay(day)) onSelect(day)
											}}
										>
											{Number(day.slice(8))}
										</button>
									</td>
								)
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
