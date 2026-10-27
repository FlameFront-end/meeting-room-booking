export type ApiErrorKind =
	| 'network'
	| 'aborted'
	| 'bad_request'
	| 'validation'
	| 'not_found'
	| 'conflict'
	| 'server'
	| 'invalid_response'
	| 'unknown'

type ApiErrorOptions = {
	kind: ApiErrorKind
	status?: number | undefined
	code?: string | undefined
	details?: unknown
	cause?: unknown
}

const DEFAULT_MESSAGES: Record<ApiErrorKind, string> = {
	network: 'Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.',
	aborted: 'Запрос отменён.',
	bad_request: 'Некорректный запрос.',
	validation: 'Данные не прошли проверку на сервере.',
	not_found: 'Запись не найдена. Возможно, её уже удалили.',
	conflict: 'Конфликт данных: состояние на сервере изменилось.',
	server: 'Ошибка на сервере. Попробуйте позже.',
	invalid_response: 'Сервер вернул данные в неожиданном формате.',
	unknown: 'Что-то пошло не так.'
}

/**
 * Единый тип ошибки сетевого слоя. UI работает только с ним и решает,
 * что показать, по `kind` и `code`, а не по HTTP-статусам и сырым исключениям.
 */
export class ApiError extends Error {
	override readonly name = 'ApiError'
	readonly kind: ApiErrorKind
	readonly status: number | undefined
	readonly code: string | undefined
	readonly details: unknown

	constructor(message: string | undefined, { kind, status, code, details, cause }: ApiErrorOptions) {
		super(message ?? DEFAULT_MESSAGES[kind], { cause })
		this.kind = kind
		this.status = status
		this.code = code
		this.details = details
	}
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError

export const apiErrorKindFromStatus = (status: number): ApiErrorKind => {
	if (status === 400) return 'bad_request'
	if (status === 404) return 'not_found'
	if (status === 409) return 'conflict'
	if (status === 422) return 'validation'
	if (status >= 500) return 'server'
	return 'unknown'
}

/** Повторять имеет смысл только сетевые и серверные сбои. 4xx — это ответ, а не случайность. */
export const isRetryableError = (error: unknown): boolean =>
	isApiError(error) ? error.kind === 'network' || error.kind === 'server' : true
