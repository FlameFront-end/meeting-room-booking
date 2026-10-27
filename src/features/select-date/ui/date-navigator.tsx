'use client'

import { addDays, formatIsoDate, type IsoDate } from '@/shared/lib/date'
import { Button, DatePicker, Icon } from '@/shared/ui'

import styles from './date-navigator.module.scss'

type DateNavigatorProps = {
	value: IsoDate
	today: IsoDate
	onChange: (next: IsoDate) => void
}

/** Навигация как в календарях: «Сегодня», стрелки по дням и заголовок-дата с выпадающим месяцем. */
export const DateNavigator = ({ value, today, onChange }: DateNavigatorProps) => {
	const isToday = value === today
	const label = formatIsoDate(value)

	return (
		<nav className={styles.navigator} aria-label='Выбор даты'>
			<Button size='sm' variant='secondary' disabled={isToday} onClick={() => onChange(today)}>
				Сегодня
			</Button>
			<div className={styles.arrows}>
				<Button
					size='sm'
					variant='ghost'
					iconOnly
					icon={<Icon name='chevron-left' size={16} />}
					aria-label='Предыдущий день'
					onClick={() => onChange(addDays(value, -1))}
				/>
				<Button
					size='sm'
					variant='ghost'
					iconOnly
					icon={<Icon name='chevron-right' size={16} />}
					aria-label='Следующий день'
					onClick={() => onChange(addDays(value, 1))}
				/>
			</div>
			<DatePicker
				variant='heading'
				className={styles.picker}
				value={value}
				today={today}
				aria-label={`${label}${isToday ? ', сегодня' : ''}. Выбрать дату`}
				onChange={onChange}
			>
				{/* Полная дата не помещается на узком экране — там показываем короткую */}
				<span className={styles.dateLong}>{label}</span>
				<span className={styles.dateShort}>{formatIsoDate(value, { weekday: 'short', month: 'short' })}</span>
				{isToday ? <span className={styles.today}>сегодня</span> : null}
			</DatePicker>
			{/* Смену даты стрелками объявляем скринридеру */}
			<p className={styles.srOnly} aria-live='polite'>
				{label}
			</p>
		</nav>
	)
}
