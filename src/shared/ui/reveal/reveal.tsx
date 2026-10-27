'use client'

import { useState, type ReactNode } from 'react'

import styles from './reveal.module.scss'

/**
 * Плавно раскрывает и сворачивает блок по высоте — для сообщений, которые появляются в форме
 * (предупреждения, ошибки): соседние поля не прыгают, а съезжают.
 *
 * Пока блок сворачивается, показывается последнее содержимое: иначе оно исчезло бы раньше анимации.
 * Высота анимируется через grid-template-rows 0fr → 1fr — так работает и с высотой «auto».
 */
export const Reveal = ({ children }: { children: ReactNode }) => {
	const isOpen = children !== null && children !== undefined && children !== false
	const [lastChildren, setLastChildren] = useState<ReactNode>(children)

	if (isOpen && lastChildren !== children) setLastChildren(children)

	return (
		<div
			className={styles.reveal}
			data-open={isOpen || undefined}
			// Сворачиваемое содержимое ещё видно глазу, но уже не существует для клавиатуры и скринридера
			inert={!isOpen}
			aria-hidden={!isOpen || undefined}
			onTransitionEnd={event => {
				// transitionend приходит на каждое свойство; содержимое убираем, когда схлопнулась высота
				if (!isOpen && event.target === event.currentTarget && event.propertyName === 'grid-template-rows') {
					setLastChildren(null)
				}
			}}
		>
			<div className={styles.inner}>{isOpen ? children : lastChildren}</div>
		</div>
	)
}
