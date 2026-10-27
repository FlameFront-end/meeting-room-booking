'use client'

import clsx from 'clsx'
import { useEffect, useId, useRef, type ReactNode } from 'react'

import { Icon } from '../icon/icon'

import styles from './dialog.module.scss'

type DialogProps = {
	title: ReactNode
	description?: ReactNode
	onClose: () => void
	/**
	 * Можно ли закрыть окно Esc, кликом по фону и крестиком.
	 * Выключается на время запроса, чтобы результат не потерялся вместе с окном.
	 */
	dismissible?: boolean
	size?: 'sm' | 'md'
	children: ReactNode
}

/**
 * Модальное окно на нативном <dialog>: showModal() даёт top layer, делает фон inert
 * (фокус не уходит за окно) и закрытие по Esc. Окно открыто, пока смонтировано:
 * родитель управляет им условным рендером, поэтому каждое открытие начинается с чистого состояния.
 * Начальный фокус — на элементе с data-autofocus. При закрытии фокус возвращается на элемент, с которого окно открыли.
 */
export const Dialog = ({ title, description, onClose, dismissible = true, size = 'md', children }: DialogProps) => {
	const ref = useRef<HTMLDialogElement>(null)
	const titleId = useId()
	const descriptionId = useId()

	useEffect(() => {
		const dialog = ref.current
		if (!dialog) return
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
		dialog.showModal()
		// По умолчанию браузер фокусирует первый интерактивный элемент — крестик. Полезнее первое поле,
		// но не на тач-устройствах: фокус в поле сразу открывает экранную клавиатуру поверх формы
		if (!window.matchMedia('(pointer: coarse)').matches) {
			dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
		}

		return () => {
			dialog.close()
			// Кнопка-источник могла исчезнуть (например, бронь удалили) — тогда фокус останется на body
			if (opener?.isConnected) opener.focus()
		}
	}, [])

	const requestClose = () => {
		if (dismissible) onClose()
	}

	return (
		// Клик по фону — дополнительный способ закрыть окно мышью; с клавиатуры работает Esc (событие cancel)
		<dialog
			ref={ref}
			className={clsx(styles.dialog, styles[size])}
			aria-labelledby={titleId}
			aria-describedby={description ? descriptionId : undefined}
			onCancel={event => {
				event.preventDefault()
				requestClose()
			}}
			onClick={event => {
				if (event.target === event.currentTarget) requestClose()
			}}
		>
			<div className={styles.body}>
				<header className={styles.header}>
					<div className={styles.heading}>
						<h2 id={titleId} className={styles.title}>
							{title}
						</h2>
						{description ? (
							<p id={descriptionId} className={styles.description}>
								{description}
							</p>
						) : null}
					</div>
					<button
						type='button'
						className={styles.close}
						aria-label='Закрыть'
						disabled={!dismissible}
						onClick={requestClose}
					>
						<Icon name='close' size={18} />
					</button>
				</header>
				{children}
			</div>
		</dialog>
	)
}
