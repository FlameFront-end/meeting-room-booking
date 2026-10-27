import { z } from 'zod'

import { ApiError, isRetryableError } from './api-error'
import { createHttpClient } from './http-client'

const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const itemSchema = z.object({ id: z.string() })

const setup = (respond: () => Promise<Response>) => {
	const fetchFn = vi.fn((_input: string, _init: RequestInit) => respond())
	return { fetchFn, http: createHttpClient({ baseUrl: 'https://api.test/', fetchFn }) }
}

const captureError = async (promise: Promise<unknown>): Promise<ApiError> => {
	try {
		await promise
	} catch (error) {
		if (error instanceof ApiError) return error
		throw error
	}
	throw new Error('Ожидалась ошибка ApiError')
}

describe('createHttpClient', () => {
	it('собирает URL, отправляет JSON и валидирует ответ схемой', async () => {
		const { http, fetchFn } = setup(() => Promise.resolve(jsonResponse({ id: '1' }, 201)))

		await expect(
			http.post('/items', { schema: itemSchema, body: { a: 1 }, query: { date: '2026-10-27', skip: undefined } })
		).resolves.toEqual({ id: '1' })

		const [url, init] = fetchFn.mock.calls[0]!
		expect(url).toBe('https://api.test/items?date=2026-10-27')
		expect(init.method).toBe('POST')
		expect(init.body).toBe('{"a":1}')
		expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
	})

	it('превращает конверт ошибки в ApiError с kind, code и details', async () => {
		const { http } = setup(() =>
			Promise.resolve(
				jsonResponse(
					{ error: { code: 'BOOKING_CONFLICT', message: 'Занято', details: { conflicts: [] } } },
					409
				)
			)
		)

		const error = await captureError(http.get('/items', { schema: itemSchema }))
		expect(error).toMatchObject({
			kind: 'conflict',
			status: 409,
			code: 'BOOKING_CONFLICT',
			message: 'Занято',
			details: { conflicts: [] }
		})
	})

	it('даёт понятное сообщение, если тело ошибки не по контракту', async () => {
		const { http } = setup(() => Promise.resolve(new Response('Bad Gateway', { status: 502 })))

		const error = await captureError(http.get('/items', { schema: itemSchema }))
		expect(error.kind).toBe('server')
		expect(error.message).toBe('Сервер не отвечает. Попробуйте чуть позже.')
	})

	it('сетевой сбой → kind: network', async () => {
		const { http } = setup(() => Promise.reject(new TypeError('Failed to fetch')))

		const error = await captureError(http.get('/items', { schema: itemSchema }))
		expect(error.kind).toBe('network')
		expect(isRetryableError(error)).toBe(true)
	})

	it('отмена запроса → kind: aborted', async () => {
		const controller = new AbortController()
		controller.abort()
		const { http } = setup(() => Promise.reject(new DOMException('Aborted', 'AbortError')))

		const error = await captureError(http.get('/items', { schema: itemSchema, signal: controller.signal }))
		expect(error.kind).toBe('aborted')
	})

	it('ответ не по схеме → kind: invalid_response', async () => {
		const { http } = setup(() => Promise.resolve(jsonResponse({ id: 42 })))

		const error = await captureError(http.get('/items', { schema: itemSchema }))
		expect(error.kind).toBe('invalid_response')
		expect(isRetryableError(error)).toBe(false)
	})

	it('DELETE с ответом 204 завершается без тела', async () => {
		const { http, fetchFn } = setup(() => Promise.resolve(new Response(null, { status: 204 })))

		await expect(http.delete('/items/1')).resolves.toBeUndefined()
		expect(fetchFn.mock.calls[0]![1].body).toBeNull()
	})
})
