import { env } from '@/shared/config'

import { createHttpClient } from './http-client'

export { ApiError, apiErrorKindFromStatus, isApiError, isRetryableError, type ApiErrorKind } from './api-error'
export { createHttpClient, type HttpClient } from './http-client'

/** Клиент по умолчанию. Чтобы переключиться на реальный бэкенд, достаточно NEXT_PUBLIC_API_BASE_URL. */
export const httpClient = createHttpClient({ baseUrl: env.apiBaseUrl })
