import clsx from 'clsx'
import type { ReactNode } from 'react'

import styles from './alert.module.scss'

type AlertTone = 'info' | 'success' | 'warning' | 'danger'

type AlertProps = {
	tone?: AlertTone
	title?: ReactNode
	children?: ReactNode
	/** Кнопка действия: «Повторить», «Обновить» и т.п. */
	action?: ReactNode
	className?: string
}

/**
 * Ошибки объявляются скринридером сразу (role="alert"),
 * остальные сообщения — вежливо, не прерывая пользователя (role="status").
 */
export const Alert = ({ tone = 'info', title, children, action, className }: AlertProps) => (
	<div role={tone === 'danger' ? 'alert' : 'status'} className={clsx(styles.alert, styles[tone], className)}>
		<div className={styles.content}>
			{title ? <p className={styles.title}>{title}</p> : null}
			{children ? <div className={styles.body}>{children}</div> : null}
		</div>
		{action ? <div className={styles.action}>{action}</div> : null}
	</div>
)
