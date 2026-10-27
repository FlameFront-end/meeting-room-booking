import clsx from 'clsx'

import styles from './spinner.module.scss'

type SpinnerProps = {
	size?: 'sm' | 'md' | 'lg'
	/** Текст для скринридеров и подпись под крупным спиннером. */
	label?: string
	/** Внутри кнопки и других элементов, которые сами сообщают о загрузке. */
	decorative?: boolean
	center?: boolean
}

export const Spinner = ({ size = 'md', label = 'Загрузка…', decorative = false, center = false }: SpinnerProps) => {
	const circle = <span className={clsx(styles.circle, styles[size])} aria-hidden='true' />

	if (decorative) return circle

	return (
		<span role='status' className={clsx(styles.wrapper, center && styles.center)}>
			{circle}
			<span className={size === 'lg' ? styles.caption : styles.srOnly}>{label}</span>
		</span>
	)
}
