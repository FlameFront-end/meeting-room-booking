import {
	BOOKING_ERROR_CODES,
	getConflictsFromError,
	getViolationsFromError,
	isBookingErrorCode,
	type Booking,
	type BookingViolation
} from '@/entities/booking'
import { isApiError } from '@/shared/api'

/**
 * Ошибка отправки формы в терминах интерфейса: что показать и можно ли исправить её в самой форме.
 *  - conflict   — 409, слот заняли; пользователь выбирает другое время
 *  - violations — 422, сервер нашёл нарушения правил; показываем у полей
 *  - gone       — бронь удалили или она уже началась: повторная отправка не поможет
 *  - failure    — сеть или сервер: данные на месте, можно отправить ещё раз
 */
export type SubmitError =
	| { type: 'conflict'; message: string; conflicts: Booking[] }
	| { type: 'violations'; message: string; violations: BookingViolation[] }
	| { type: 'gone'; message: string }
	| { type: 'failure'; message: string }

const CONFLICT_FALLBACK = 'Это время только что заняли. Список броней обновлён — выберите другое время.'

export const toSubmitError = (error: unknown): SubmitError => {
	if (isApiError(error) && error.kind === 'conflict') {
		return {
			type: 'conflict',
			message: error.message || CONFLICT_FALLBACK,
			conflicts: getConflictsFromError(error)
		}
	}

	const violations = getViolationsFromError(error)
	if (violations.length > 0) return { type: 'violations', message: 'Проверьте выделенные поля', violations }

	if (isBookingErrorCode(error, BOOKING_ERROR_CODES.notFound)) {
		return { type: 'gone', message: 'Бронь не найдена — похоже, её уже удалили. Список броней обновлён.' }
	}
	if (isBookingErrorCode(error, BOOKING_ERROR_CODES.locked)) {
		return { type: 'gone', message: 'Бронь уже началась — изменить её нельзя.' }
	}

	return {
		type: 'failure',
		message: isApiError(error) ? error.message : 'Не удалось сохранить бронь. Попробуйте ещё раз.'
	}
}
