/**
 * Публичная конфигурация приложения. Next.js подставляет NEXT_PUBLIC_* на этапе сборки,
 * поэтому обращаться к ним нужно только напрямую через process.env.NEXT_PUBLIC_*.
 */
export const env = {
	/** Пусто — запросы идут на тот же origin: /api/... */
	apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
	/** Mock-сервер в браузере. По умолчанию включён: реального бэкенда у демо нет. */
	apiMocking: (process.env.NEXT_PUBLIC_API_MOCKING ?? 'enabled') === 'enabled'
} as const
