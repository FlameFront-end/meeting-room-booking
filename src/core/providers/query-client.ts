import { QueryClient } from '@tanstack/react-query'

import { isRetryableError } from '@/shared/api'

const MAX_RETRIES = 2

export const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				// Брони меняют и другие люди: при возврате во вкладку данные стоит освежить
				refetchOnWindowFocus: true,
				retry: (failureCount, error) => failureCount < MAX_RETRIES && isRetryableError(error)
			},
			mutations: {
				// Запись не повторяем автоматически: повторный POST может создать дубль
				retry: false
			}
		}
	})
