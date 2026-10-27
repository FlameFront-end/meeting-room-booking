import { useLayoutEffect, type RefObject } from 'react'

type Options = {
	/** Ширина как у якоря (выпадающий список). */
	matchWidth?: boolean
	gap?: number
}

/**
 * Показывает элемент с атрибутом popover возле якоря.
 *
 * Popover API выносит элемент в top layer — поверх модального <dialog> и без обрезки
 * overflow у предков: раскрытый список не растягивает прокрутку модалки.
 * Позиция фиксированная и считается от якоря: снизу, а если места мало — сверху;
 * по горизонтали прижимается к краям окна. Пересчитывается при прокрутке и ресайзе.
 */
export const useAnchoredPopover = (
	isOpen: boolean,
	anchorRef: RefObject<HTMLElement | null>,
	popoverRef: RefObject<HTMLElement | null>,
	{ matchWidth = false, gap = 4 }: Options = {}
) => {
	useLayoutEffect(() => {
		const popover = popoverRef.current
		const anchor = anchorRef.current
		if (!isOpen || !popover || !anchor) return

		const place = () => {
			const rect = anchor.getBoundingClientRect()
			if (matchWidth) popover.style.width = `${rect.width}px`
			const { offsetWidth: width, offsetHeight: height } = popover

			const spaceBelow = window.innerHeight - rect.bottom - gap
			const top = spaceBelow >= height || spaceBelow >= rect.top ? rect.bottom + gap : rect.top - gap - height
			const left = Math.min(Math.max(gap, rect.left), window.innerWidth - width - gap)

			popover.style.top = `${Math.max(gap, top)}px`
			popover.style.left = `${Math.max(gap, left)}px`
		}

		popover.showPopover()
		place()
		window.addEventListener('resize', place)
		// capture: прокручиваться может не окно, а модалка вокруг якоря
		window.addEventListener('scroll', place, true)

		return () => {
			window.removeEventListener('resize', place)
			window.removeEventListener('scroll', place, true)
			if (popover.isConnected) popover.hidePopover()
		}
	}, [isOpen, anchorRef, popoverRef, matchWidth, gap])
}
