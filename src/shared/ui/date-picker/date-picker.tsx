'use client'

import clsx from 'clsx'
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'

import { formatIsoDate, type IsoDate } from '@/shared/lib/date'

import { Icon } from '../icon/icon'
import { useAnchoredPopover } from '../popover/use-anchored-popover'

import { Calendar } from './calendar'
import styles from './date-picker.module.scss'

type DatePickerProps = {
	value: IsoDate
	onChange: (value: IsoDate) => void
	onBlur?: () => void
	/** Дни раньше min видны, но выбрать их нельзя. */
	min?: IsoDate | undefined
	today: IsoDate
	id?: string
	ref?: Ref<HTMLButtonElement>
	disabled?: boolean
	/** Вид кнопки: поле формы или заголовок с датой (без рамки). */
	variant?: 'field' | 'heading'
	/** Содержимое кнопки; по умолчанию — дата вида «ср, 28 октября». */
	children?: ReactNode
	className?: string | undefined
	/** Начальный фокус при открытии модального окна (см. Dialog). */
	'data-autofocus'?: boolean
	'aria-labelledby'?: string
	'aria-label'?: string
	'aria-describedby'?: string | undefined
	'aria-invalid'?: boolean
}

export const formatShortDate = (value: IsoDate) => formatIsoDate(value, { weekday: 'short' })

/**
 * Выбор даты: кнопка и всплывающий календарь по паттерну WAI-ARIA «date picker dialog».
 * Esc закрывает календарь и возвращает фокус на кнопку, не закрывая модальное окно вокруг.
 */
export const DatePicker = ({
	value,
	onChange,
	onBlur,
	min,
	today,
	id,
	ref,
	disabled = false,
	variant = 'field',
	children,
	className,
	...aria
}: DatePickerProps) => {
	const popoverId = useId()
	const rootRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const popoverRef = useRef<HTMLDivElement>(null)
	const [isOpen, setIsOpen] = useState(false)

	const close = ({ restoreFocus }: { restoreFocus: boolean }) => {
		setIsOpen(false)
		if (restoreFocus) triggerRef.current?.focus()
	}

	// Календарь — в top layer поверх модалки, а не внутри её прокрутки
	useAnchoredPopover(isOpen, triggerRef, popoverRef)

	useEffect(() => {
		if (!isOpen) return
		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
		}
		document.addEventListener('pointerdown', onPointerDown)
		return () => document.removeEventListener('pointerdown', onPointerDown)
	}, [isOpen])

	return (
		<div
			ref={rootRef}
			className={clsx(styles.root, className)}
			onKeyDown={event => {
				if (event.key !== 'Escape' || !isOpen) return
				// Esc закрывает только календарь, а не модальное окно вокруг
				event.preventDefault()
				event.stopPropagation()
				close({ restoreFocus: true })
			}}
		>
			<button
				ref={node => {
					triggerRef.current = node
					if (typeof ref === 'function') ref(node)
					else if (ref) ref.current = node
				}}
				id={id}
				type='button'
				className={clsx(styles.trigger, styles[variant])}
				aria-haspopup='dialog'
				aria-expanded={isOpen}
				aria-controls={isOpen ? popoverId : undefined}
				aria-labelledby={aria['aria-labelledby']}
				aria-label={aria['aria-label']}
				aria-describedby={aria['aria-describedby']}
				// У роли button нет aria-invalid: ошибку объявляет aria-describedby, а это — для стилей
				data-invalid={aria['aria-invalid'] ? true : undefined}
				data-autofocus={aria['data-autofocus']}
				disabled={disabled}
				onClick={() => setIsOpen(open => !open)}
				onBlur={onBlur}
			>
				{variant === 'field' ? <Icon name='calendar' size={16} className={styles.icon} /> : null}
				<span className={styles.value}>{children ?? formatShortDate(value)}</span>
				{variant === 'heading' ? <Icon name='chevron-down' size={16} className={styles.icon} /> : null}
			</button>

			{isOpen ? (
				<div
					ref={popoverRef}
					id={popoverId}
					popover='manual'
					role='dialog'
					aria-modal='false'
					aria-label='Выбор даты'
					className={styles.popover}
					onBlur={event => {
						// Фокус ушёл за пределы календаря (Tab, клик мимо) — закрываем
						if (!rootRef.current?.contains(event.relatedTarget)) setIsOpen(false)
					}}
				>
					<Calendar
						value={value}
						today={today}
						min={min}
						autoFocus
						onSelect={day => {
							onChange(day)
							close({ restoreFocus: true })
						}}
					/>
				</div>
			) : null}
		</div>
	)
}
