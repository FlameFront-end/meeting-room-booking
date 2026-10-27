'use client'

import { useId } from 'react'

import { addDays, formatIsoDate, isIsoDate, type IsoDate } from '@/shared/lib/date'
import { Button } from '@/shared/ui'

import styles from './date-navigator.module.scss'

type DateNavigatorProps = {
	value: IsoDate
	today: IsoDate
	onChange: (next: IsoDate) => void
}

export const DateNavigator = ({ value, today, onChange }: DateNavigatorProps) => {
	const inputId = useId()
	const isToday = value === today

	return (
		<nav className={styles.navigator} aria-label='Выбор даты'>
			<div className={styles.controls}>
				<Button
					variant='ghost'
					size='sm'
					aria-label='Предыдущий день'
					onClick={() => onChange(addDays(value, -1))}
				>
					←
				</Button>
				<label htmlFor={inputId} className={styles.srOnly}>
					Дата
				</label>
				<input
					id={inputId}
					className={styles.input}
					type='date'
					value={value}
					required
					onChange={event => {
						if (isIsoDate(event.target.value)) onChange(event.target.value)
					}}
				/>
				<Button
					variant='ghost'
					size='sm'
					aria-label='Следующий день'
					onClick={() => onChange(addDays(value, 1))}
				>
					→
				</Button>
				<Button size='sm' disabled={isToday} onClick={() => onChange(today)}>
					Сегодня
				</Button>
			</div>
			<p className={styles.caption} aria-live='polite'>
				{formatIsoDate(value)}
				{isToday ? ' · сегодня' : null}
			</p>
		</nav>
	)
}
