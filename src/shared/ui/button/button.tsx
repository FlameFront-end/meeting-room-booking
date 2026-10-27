import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Spinner } from '../spinner/spinner'

import styles from './button.module.scss'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant
	size?: ButtonSize
	/** Показывает спиннер и блокирует повторное нажатие, но оставляет кнопку в фокусе. */
	loading?: boolean
	icon?: ReactNode
}

export const Button = ({
	variant = 'secondary',
	size = 'md',
	loading = false,
	icon,
	disabled,
	className,
	children,
	type = 'button',
	...rest
}: ButtonProps) => (
	<button
		{...rest}
		type={type}
		className={clsx(styles.button, styles[variant], styles[size], className)}
		disabled={disabled ?? false}
		aria-disabled={loading || undefined}
		aria-busy={loading || undefined}
		data-loading={loading || undefined}
		onClick={loading ? undefined : rest.onClick}
	>
		{loading ? <Spinner size='sm' decorative /> : icon}
		<span>{children}</span>
	</button>
)
