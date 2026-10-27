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

// Текст сервера общий, а здесь важно объяснить, что случилось между открытием формы и отправкой
const CONFLICT_MESSAGE = 'Пока вы заполняли форму, это время забронировали. Выберите другое.'

export const toSubmitError = (error: unknown): SubmitError => {
	if (isApiError(error) && error.kind === 'conflict') {
		return {
			type: 'conflict',
			message: CONFLICT_MESSAGE,
			conflicts: getConflictsFromError(error)
		}
	}

	const violations = getViolationsFromError(error)
	if (violations.length > 0) return { type: 'violations', message: 'Исправьте отмеченные поля.', violations }

	if (isBookingErrorCode(error, BOOKING_ERROR_CODES.notFound)) {
		return { type: 'gone', message: 'Эту бронь уже удалили.' }
	}
	if (isBookingErrorCode(error, BOOKING_ERROR_CODES.locked)) {
		return { type: 'gone', message: 'Встреча уже началась, её нельзя изменить.' }
	}

	return {
		type: 'failure',
		message: isApiError(error) ? error.message : 'Попробуйте ещё раз.'
	}
}
