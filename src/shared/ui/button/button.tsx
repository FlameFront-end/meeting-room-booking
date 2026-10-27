import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Spinner } from '../spinner/spinner'

import styles from './button.module.scss'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid'
type ButtonSize = 'sm' | 'md'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant
	size?: ButtonSize
	/** Показывает спиннер и блокирует повторное нажатие, но оставляет кнопку в фокусе. */
	loading?: boolean
	icon?: ReactNode
	/** Только иконка: квадратная кнопка. Доступное имя тогда задаётся через aria-label. */
	iconOnly?: boolean
}

export const Button = ({
	variant = 'secondary',
	size = 'md',
	loading = false,
	icon,
	iconOnly = false,
	disabled,
	className,
	children,
	type = 'button',
	...rest
}: ButtonProps) => (
	<button
		{...rest}
		type={type}
		className={clsx(styles.button, styles[variant], styles[size], iconOnly && styles.iconOnly, className)}
		disabled={disabled ?? false}
		aria-disabled={loading || undefined}
		aria-busy={loading || undefined}
		data-loading={loading || undefined}
		onClick={loading ? undefined : rest.onClick}
	>
		{loading ? <Spinner size='sm' decorative /> : icon}
		{children === undefined ? null : <span>{children}</span>}
	</button>
)
