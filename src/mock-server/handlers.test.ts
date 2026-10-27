import { bookingsApi, getConflictsFromError, type Booking } from '@/entities/booking'
import { ApiError } from '@/shared/api'
import { mockApi } from '@/test/mock-api'
import { freezeTime } from '@/test/time'

/**
 * Контрактные тесты: настоящий bookingsApi (fetch + разбор ответов) против mock-сервера.
 * Проверяют, что сервер соблюдает бизнес-правила и отдаёт ошибки в оговорённом формате.
 */

const TODAY = '2026-10-27'
const TOMORROW = '2026-10-28'

const seed = (bookings: Booking[]) => mockApi.store.reset(bookings)

const captureApiError = async (promise: Promise<unknown>): Promise<ApiError> => {
	try {
		await promise
	} catch (error) {
		if (error instanceof ApiError) return error
		throw error
	}
	throw new Error('Ожидалась ошибка ApiError')
}

beforeEach(() => {
	freezeTime(`${TODAY}T12:00:00`)
})

describe('GET /api/bookings', () => {
	it('возвращает брони только за дату, отсортированные по началу', async () => {
		seed([
			{ id: 'b', date: TOMORROW, start: '14:00', end: '15:00' },
			{ id: 'a', date: TOMORROW, start: '10:00', end: '11:00', title: 'Ретро' },
			{ id: 'c', date: '2026-10-29', start: '10:00', end: '11:00' }
		])

		const list = await bookingsApi.list(TOMORROW)
		expect(list.map(booking => booking.id)).toEqual(['a', 'b'])
	})

	it('сценарий failList → 500', async () => {
		mockApi.scenario.set({ failList: true })
		const error = await captureApiError(bookingsApi.list(TOMORROW))
		expect(error.kind).toBe('server')
	})
})

describe('POST /api/bookings', () => {
	it('создаёт бронь и не хранит пустое название', async () => {
		const created = await bookingsApi.create({ date: TOMORROW, start: '10:00', end: '11:00', title: '   ' })
		expect(created).toEqual({ id: 'booking-1', date: TOMORROW, start: '10:00', end: '11:00' })
		expect(await bookingsApi.list(TOMORROW)).toEqual([created])
	})

	it('422 с полным списком нарушений бизнес-правил', async () => {
		const error = await captureApiError(bookingsApi.create({ date: TOMORROW, start: '08:00', end: '08:10' }))
		expect(error).toMatchObject({ kind: 'validation', status: 422, code: 'BOOKING_VALIDATION_FAILED' })
		expect(error.details).toEqual({
			violations: [
				{ code: 'OUTSIDE_WORKING_HOURS', field: 'start' },
				{ code: 'OUTSIDE_WORKING_HOURS', field: 'end' },
				{ code: 'TOO_SHORT', field: 'end' }
			]
		})
	})

	it('422 для прошедшего времени сегодня', async () => {
		const error = await captureApiError(bookingsApi.create({ date: TODAY, start: '11:00', end: '12:30' }))
		expect(error.details).toEqual({ violations: [{ code: 'START_IN_PAST', field: 'start' }] })
	})

	it('400 для тела не по схеме', async () => {
		const error = await captureApiError(bookingsApi.create({ date: '28.10.2026', start: '10:00', end: '11:00' }))
		expect(error).toMatchObject({ kind: 'bad_request', code: 'INVALID_REQUEST' })
	})

	it('409 при пересечении, в details — конфликтующие брони', async () => {
		const existing: Booking = { id: 'a', date: TOMORROW, start: '10:00', end: '11:00' }
		seed([existing])

		const error = await captureApiError(bookingsApi.create({ date: TOMORROW, start: '10:30', end: '11:30' }))
		expect(error).toMatchObject({ kind: 'conflict', status: 409, code: 'BOOKING_CONFLICT' })
		expect(getConflictsFromError(error)).toEqual([existing])
	})

	it('касание границ — не конфликт', async () => {
		seed([{ id: 'a', date: TOMORROW, start: '10:00', end: '11:00' }])
		await expect(bookingsApi.create({ date: TOMORROW, start: '11:00', end: '12:00' })).resolves.toMatchObject({
			start: '11:00'
		})
	})

	it('гонка (conflict: once): слот занимают между проверкой в UI и записью', async () => {
		mockApi.scenario.set({ conflict: 'once' })

		const error = await captureApiError(bookingsApi.create({ date: TOMORROW, start: '15:00', end: '16:00' }))
		const [rival] = getConflictsFromError(error)
		expect(rival).toMatchObject({ start: '15:00', end: '16:00', title: 'Бронь другого сотрудника' })

		// «Чужая» бронь действительно появилась на сервере — после refetch UI её увидит
		expect(await bookingsApi.list(TOMORROW)).toEqual([rival])
		// once — только один раз
		expect(mockApi.scenario.get().conflict).toBe('off')
	})
})

describe('PATCH /api/bookings/:id', () => {
	it('бронь не конфликтует сама с собой', async () => {
		seed([{ id: 'a', date: TOMORROW, start: '10:00', end: '11:00', title: 'Ретро' }])

		await expect(bookingsApi.update('a', { start: '10:30', end: '11:30' })).resolves.toEqual({
			id: 'a',
			date: TOMORROW,
			start: '10:30',
			end: '11:30',
			title: 'Ретро'
		})
	})

	it('пустое название удаляет его', async () => {
		seed([{ id: 'a', date: TOMORROW, start: '10:00', end: '11:00', title: 'Ретро' }])
		const updated = await bookingsApi.update('a', { title: '' })
		expect(updated).not.toHaveProperty('title')
	})

	it('409 при пересечении с другой бронью', async () => {
		seed([
			{ id: 'a', date: TOMORROW, start: '10:00', end: '11:00' },
			{ id: 'b', date: TOMORROW, start: '11:00', end: '12:00' }
		])
		const error = await captureApiError(bookingsApi.update('a', { end: '11:30' }))
		expect(getConflictsFromError(error).map(booking => booking.id)).toEqual(['b'])
	})

	it('422 BOOKING_LOCKED для уже начавшейся брони', async () => {
		seed([{ id: 'a', date: TODAY, start: '11:30', end: '12:30' }])
		const error = await captureApiError(bookingsApi.update('a', { title: 'Новое' }))
		expect(error).toMatchObject({ kind: 'validation', code: 'BOOKING_LOCKED' })
	})

	it('404 для несуществующей брони', async () => {
		const error = await captureApiError(bookingsApi.update('missing', { title: 'x' }))
		expect(error).toMatchObject({ kind: 'not_found', code: 'BOOKING_NOT_FOUND' })
	})
})

describe('DELETE /api/bookings/:id', () => {
	it('удаляет бронь', async () => {
		seed([{ id: 'a', date: TOMORROW, start: '10:00', end: '11:00' }])
		await bookingsApi.remove('a')
		expect(await bookingsApi.list(TOMORROW)).toEqual([])
	})

	it('404 для уже удалённой брони', async () => {
		const error = await captureApiError(bookingsApi.remove('missing'))
		expect(error.kind).toBe('not_found')
	})

	it('422 BOOKING_LOCKED для прошедшей брони', async () => {
		seed([{ id: 'a', date: '2026-10-26', start: '10:00', end: '11:00' }])
		const error = await captureApiError(bookingsApi.remove('a'))
		expect(error.code).toBe('BOOKING_LOCKED')
	})
})
