import { ApiError } from '@/shared/api'

import { toSubmitError } from './submit-error'

const conflict = { id: 'x', date: '2026-10-28', start: '10:00', end: '11:00' }

describe('toSubmitError', () => {
	it('409 — конфликт с перечнем броней', () => {
		const error = new ApiError('Занято', {
			kind: 'conflict',
			code: 'BOOKING_CONFLICT',
			details: { conflicts: [conflict] }
		})
		expect(toSubmitError(error)).toEqual({
			type: 'conflict',
			message: 'Пока вы заполняли форму, это время забронировали. Выберите другое.',
			conflicts: [conflict]
		})
	})

	it('422 — нарушения правил для полей', () => {
		const error = new ApiError(undefined, {
			kind: 'validation',
			code: 'BOOKING_VALIDATION_FAILED',
			details: { violations: [{ code: 'START_IN_PAST', field: 'start' }] }
		})
		expect(toSubmitError(error)).toMatchObject({
			type: 'violations',
			violations: [{ code: 'START_IN_PAST', field: 'start' }]
		})
	})

	it.each([
		['BOOKING_NOT_FOUND', 'not_found', /удалили/],
		['BOOKING_LOCKED', 'validation', /уже началась/]
	] as const)('%s — повторять бесполезно', (code, kind, message) => {
		const result = toSubmitError(new ApiError(undefined, { kind, code }))
		expect(result.type).toBe('gone')
		expect(result.message).toMatch(message)
	})

	it('сеть и прочее — можно повторить', () => {
		expect(toSubmitError(new ApiError(undefined, { kind: 'network' }))).toMatchObject({ type: 'failure' })
		expect(toSubmitError(new Error('boom'))).toMatchObject({ type: 'failure' })
	})
})
