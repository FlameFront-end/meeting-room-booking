import { ApiError } from '@/shared/api'

import { toDeleteError } from './delete-error'

describe('toDeleteError', () => {
	it('разделяет «уже удалена», «уже началась» и сбой', () => {
		expect(toDeleteError(new ApiError(undefined, { kind: 'not_found', code: 'BOOKING_NOT_FOUND' }))).toEqual({
			type: 'gone'
		})
		expect(toDeleteError(new ApiError(undefined, { kind: 'validation', code: 'BOOKING_LOCKED' }))).toMatchObject({
			type: 'locked'
		})
		expect(toDeleteError(new ApiError('Нет сети', { kind: 'network' }))).toEqual({
			type: 'failure',
			message: 'Нет сети'
		})
	})
})
