import type { SVGProps } from 'react'

/**
 * Небольшой набор иконок (контур 24×24, цвет — currentColor).
 * Иконки всегда декоративные: смысл передаёт текст или aria-label у кнопки.
 */
const PATHS = {
	plus: 'M12 5v14M5 12h14',
	'chevron-left': 'm15 18-6-6 6-6',
	'chevron-right': 'm9 18 6-6-6-6',
	'chevron-down': 'm6 9 6 6 6-6',
	calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
	clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
	check: 'M20 6 9 17l-5-5',
	close: 'M18 6 6 18M6 6l12 12',
	pencil: 'M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
	trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
	alert: 'M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
	info: 'M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'
} as const

export type IconName = keyof typeof PATHS

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { name: IconName; size?: number }

export const Icon = ({ name, size = 18, ...rest }: IconProps) => (
	<svg
		width={size}
		height={size}
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth={2}
		strokeLinecap='round'
		strokeLinejoin='round'
		aria-hidden='true'
		focusable='false'
		{...rest}
	>
		<path d={PATHS[name]} />
	</svg>
)
