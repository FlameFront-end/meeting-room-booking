import clsx from 'clsx'
import { useId, type ReactNode } from 'react'

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
	children: (control: FieldControlProps) => ReactNode
}

/** Поле формы: подпись, контрол, подсказка и ошибка. Ошибка объявляется скринридером при появлении. */
export const Field = ({ label, hint, error, className, children }: FieldProps) => {
	const id = useId()
	const hintId = `${id}-hint`
	const errorId = `${id}-error`
	const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

	return (
		<div className={clsx(styles.field, error && styles.invalid, className)}>
			<label htmlFor={id} className={styles.label}>
				{label}
			</label>
			{children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
			{hint ? (
				<p id={hintId} className={styles.hint}>
					{hint}
				</p>
			) : null}
			<p id={errorId} className={styles.error} aria-live='polite'>
				{error}
			</p>
		</div>
	)
}
