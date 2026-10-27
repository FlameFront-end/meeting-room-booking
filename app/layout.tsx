import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'

import { AppProviders } from '@/core'

import '@/core/styles/globals.scss'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
	title: 'Бронирование переговорной',
	description: 'Бронирование переговорной комнаты в течение рабочего дня'
}

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#ffffff' },
		{ media: '(prefers-color-scheme: dark)', color: '#09090b' }
	]
}

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang='ru' className={inter.variable}>
		<body>
			<AppProviders>{children}</AppProviders>
		</body>
	</html>
)

export default RootLayout
