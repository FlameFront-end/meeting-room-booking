import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'

export const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Infinity },
			mutations: { retry: false }
		}
	})

type Options = Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient }

/** render + провайдеры приложения + userEvent, привязанный к этому рендеру. */
export const renderWithProviders = (
	ui: ReactElement,
	{ queryClient = createTestQueryClient(), ...options }: Options = {}
) => {
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)

	return {
		user: userEvent.setup(),
		queryClient,
		...render(ui, { wrapper: Wrapper, ...options })
	}
}
