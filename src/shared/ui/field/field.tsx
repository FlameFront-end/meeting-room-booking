import clsx from 'clsx'
import { useId, type ReactNode } from 'react'

import { Icon } from '../icon/icon'

import styles from './field.module.scss'

/** Атрибуты, которые нужно повесить на сам контрол, чтобы подпись, подсказка и ошибка были с ним связаны. */
export type FieldControlProps = {
	id: string
	'aria-invalid': boolean
	'aria-describedby': string | undefined
}

type FieldProps = {
	label: ReactNode
	hint?: ReactNode
	error?: string | undefined
	className?: string
	/**
	 * Контрол поля. Нативные input/select связываются с подписью через id,
	 * а собственные (Select, DatePicker) — через aria-labelledby={labelId}.
	 */
	children: (control: FieldControlProps, meta: { labelId: string }) => ReactNode
}

/** Поле формы: подпись, контрол, подсказка и ошибка. Ошибка объявляется скринридером при появлении. */
export const Field = ({ label, hint, error, className, children }: FieldProps) => {
	const id = useId()
	const labelId = `${id}-label`
	const hintId = `${id}-hint`
	const errorId = `${id}-error`
	const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

	return (
		<div className={clsx(styles.field, error && styles.invalid, className)}>
			<label id={labelId} htmlFor={id} className={styles.label}>
				{label}
			</label>
			{children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy }, { labelId })}
			{hint ? (
				<p id={hintId} className={styles.hint}>
					{hint}
				</p>
			) : null}
			<p id={errorId} className={styles.error} aria-live='polite'>
				{error ? (
					// key перезапускает анимацию, когда меняется текст ошибки
					<span key={error} className={styles.errorText}>
						<Icon name='alert' size={14} className={styles.errorIcon} />
						{error}
					</span>
				) : null}
			</p>
		</div>
	)
}
