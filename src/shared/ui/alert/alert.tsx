import clsx from 'clsx'
import { useId, type ReactNode } from 'react'

import { Icon, type IconName } from '../icon/icon'

import styles from './alert.module.scss'

type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const ICONS: Record<AlertTone, IconName> = { info: 'info', success: 'check', warning: 'alert', danger: 'alert' }

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
export const Alert = ({ tone = 'info', title, children, action, className }: AlertProps) => {
	const titleId = useId()

	return (
		<div
			role={tone === 'danger' ? 'alert' : 'status'}
			// Заголовок — доступное имя сообщения: скринридер объявит «Это время занято», а не безымянный статус
			aria-labelledby={title ? titleId : undefined}
			className={clsx(styles.alert, styles[tone], className)}
		>
			<Icon name={ICONS[tone]} className={styles.icon} size={20} />
			<div className={styles.content}>
				{title ? (
					<p id={titleId} className={styles.title}>
						{title}
					</p>
				) : null}
				{children ? <div className={styles.body}>{children}</div> : null}
			</div>
			{action ? <div className={styles.action}>{action}</div> : null}
		</div>
	)
}
