import { BOOKING_ERROR_CODES, isBookingErrorCode } from '@/entities/booking'
import { isApiError } from '@/shared/api'

/**
 * Результат неудачного удаления:
 *  - gone   — брони уже нет (404): цель пользователя достигнута, окно закрываем
 *  - locked — бронь уже началась: удалить нельзя, объясняем
 *  - failure — сеть или сервер: можно повторить
 */
export type DeleteFailure = { type: 'locked'; message: string } | { type: 'failure'; message: string }
export type DeleteError = { type: 'gone' } | DeleteFailure

export const toDeleteError = (error: unknown): DeleteError => {
	if (isBookingErrorCode(error, BOOKING_ERROR_CODES.notFound)) return { type: 'gone' }
	if (isBookingErrorCode(error, BOOKING_ERROR_CODES.locked)) {
		return { type: 'locked', message: 'Встреча уже началась, её нельзя удалить.' }
	}
	return { type: 'failure', message: isApiError(error) ? error.message : 'Попробуйте ещё раз.' }
}
