import { z } from 'zod'

import { ApiError, apiErrorKindFromStatus } from './api-error'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

type QueryParams = Record<string, string | number | boolean | undefined>

type BaseOptions = {
	query?: QueryParams | undefined
	signal?: AbortSignal | undefined
}

type ReadOptions<T> = BaseOptions & { schema: z.ZodType<T> }
type WriteOptions<T> = ReadOptions<T> & { body: unknown }

export type HttpClient = {
	get: <T>(path: string, options: ReadOptions<T>) => Promise<T>
	post: <T>(path: string, options: WriteOptions<T>) => Promise<T>
	patch: <T>(path: string, options: WriteOptions<T>) => Promise<T>
	delete: (path: string, options?: BaseOptions) => Promise<void>
}

type FetchFn = (input: string, init: RequestInit) => Promise<Response>

type HttpClientConfig = {
	baseUrl?: string
	/** Подмена транспорта в тестах. По умолчанию — глобальный fetch, читается лениво (важно для MSW). */
	fetchFn?: FetchFn
}

/** Формат ошибок, который отдаёт API: { error: { code, message, details? } } */
const errorEnvelopeSchema = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
		details: z.unknown().optional()
	})
})

const buildUrl = (baseUrl: string, path: string, query?: QueryParams): string => {
	const params = new URLSearchParams()
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value !== undefined) params.set(key, String(value))
	}
	const search = params.toString()
	return `${baseUrl.replace(/\/$/, '')}${path}${search ? `?${search}` : ''}`
}

const readJson = async (response: Response): Promise<unknown> => {
	const text = await response.text()
	if (!text) return undefined
	try {
		return JSON.parse(text) as unknown
	} catch {
		return undefined
	}
}

const toApiError = async (response: Response): Promise<ApiError> => {
	const kind = apiErrorKindFromStatus(response.status)
	const envelope = errorEnvelopeSchema.safeParse(await readJson(response))
	if (!envelope.success) {
		return new ApiError(undefined, { kind, status: response.status })
	}
	const { code, message, details } = envelope.data.error
	return new ApiError(message, { kind, status: response.status, code, details })
}

export const createHttpClient = ({
	baseUrl = '',
	fetchFn = (input, init) => globalThis.fetch(input, init)
}: HttpClientConfig = {}): HttpClient => {
	const send = async (method: HttpMethod, path: string, options: BaseOptions & { body?: unknown }) => {
		const { query, signal, body } = options
		const hasBody = body !== undefined

		let response: Response
		try {
			response = await fetchFn(buildUrl(baseUrl, path, query), {
				method,
				headers: hasBody
					? { Accept: 'application/json', 'Content-Type': 'application/json' }
					: { Accept: 'application/json' },
				body: hasBody ? JSON.stringify(body) : null,
				signal: signal ?? null
			})
		} catch (cause) {
			throw new ApiError(undefined, { kind: signal?.aborted ? 'aborted' : 'network', cause })
		}

		if (!response.ok) throw await toApiError(response)
		return response
	}

	const parse = async <T>(response: Response, schema: z.ZodType<T>): Promise<T> => {
		const result = schema.safeParse(await readJson(response))
		if (!result.success) {
			throw new ApiError(undefined, {
				kind: 'invalid_response',
				status: response.status,
				details: result.error.issues
			})
		}
		return result.data
	}

	return {
		get: async (path, { schema, ...options }) => parse(await send('GET', path, options), schema),
		post: async (path, { schema, ...options }) => parse(await send('POST', path, options), schema),
		patch: async (path, { schema, ...options }) => parse(await send('PATCH', path, options), schema),
		delete: async (path, options = {}) => {
			await send('DELETE', path, options)
		}
	}
}
