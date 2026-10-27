'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'

import { MockApiGate } from './mock-api-gate'
import { createQueryClient } from './query-client'

export const AppProviders = ({ children }: { children: ReactNode }) => {
	// Один клиент на жизнь вкладки; useState защищает от пересоздания при ре-рендерах
	const [queryClient] = useState(createQueryClient)

	return (
		<QueryClientProvider client={queryClient}>
			<MockApiGate>{children}</MockApiGate>
			<Toaster position='top-center' richColors closeButton />
		</QueryClientProvider>
	)
}
