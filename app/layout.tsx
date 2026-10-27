import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { AppProviders } from '@/core'

import '@/core/styles/globals.scss'

export const metadata: Metadata = {
	title: 'Бронирование переговорной',
	description: 'Бронирование переговорной комнаты в течение рабочего дня'
}

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
		{ media: '(prefers-color-scheme: dark)', color: '#121418' }
	]
}

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang='ru'>
		<body>
			<AppProviders>{children}</AppProviders>
		</body>
	</html>
)

export default RootLayout
