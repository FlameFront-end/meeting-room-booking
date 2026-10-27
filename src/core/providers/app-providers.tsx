'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Toaster } from 'sonner'

import { MockApiGate } from './mock-api-gate'
import { createQueryClient } from './query-client'

// Тосты в палитре интерфейса: нейтральная поверхность и рамка, цветная только иконка (см. globals.scss)
const TOASTER_THEME = {
	'--normal-bg': 'var(--color-surface)',
	'--normal-border': 'var(--color-border)',
	'--normal-text': 'var(--color-text)',
	'--border-radius': 'var(--radius-md)',
	fontFamily: 'var(--font-sans)'
} as CSSProperties

export const AppProviders = ({ children }: { children: ReactNode }) => {
	// Один клиент на жизнь вкладки; useState защищает от пересоздания при ре-рендерах
	const [queryClient] = useState(createQueryClient)

	return (
		<QueryClientProvider client={queryClient}>
			<MockApiGate>{children}</MockApiGate>
			<Toaster position='bottom-right' theme='system' gap={8} style={TOASTER_THEME} />
		</QueryClientProvider>
	)
}
