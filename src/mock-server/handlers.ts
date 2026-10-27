import { delay, http, HttpResponse } from 'msw'

import {
	BOOKING_ERROR_CODES,
	bookingInputSchema,
	bookingPatchSchema,
	BOOKINGS_ENDPOINT,
	describeViolation,
	isBookingStarted,
	isoDateSchema,
	validateBooking,
	type Booking,
	type BookingErrorCode,
	type BookingInput,
	type BookingViolation
} from '@/entities/booking'

import type { ScenarioController } from './scenario'
import type { BookingsStore } from './store'

type HandlersDeps = {
	store: BookingsStore
	scenario: ScenarioController
	/** Источник «сейчас». Сервер, а не клиент, решает, что время уже прошло. */
	now?: () => Date
}

// Совпадает с любым origin: обработчики не зависят от baseUrl клиента
const COLLECTION = `*${BOOKINGS_ENDPOINT}`
const ITEM = `*${BOOKINGS_ENDPOINT}/:id`

const RIVAL_TITLE = 'Бронь другого сотрудника'

const errorResponse = (status: number, code: BookingErrorCode, message: string, details?: unknown) =>
	HttpResponse.json({ error: details === undefined ? { code, message } : { code, message, details } }, { status })

/** Пустое название не храним: «без названия» — это отсутствие поля, а не пустая строка. */
const withTitle = <T extends object>(base: T, title: string | undefined): T & { title?: string } =>
	title?.trim() ? { ...base, title: title.trim() } : base

const readJson = async (request: Request): Promise<unknown> => {
	try {
		return (await request.json()) as unknown
	} catch {
		return undefined
	}
}

export const createBookingHandlers = ({ store, scenario, now = () => new Date() }: HandlersDeps) => {
	const simulateLatency = async () => {
		const { latencyMs } = scenario.get()
		if (latencyMs > 0) await delay(latencyMs)
	}

	/** Гонка: пока клиент думал, слот занял кто-то другой. Возвращает «чужую» бронь или null. */
	const takeSlotByRival = (slot: BookingInput): Booking | null => {
		const { conflict } = scenario.get()
		if (conflict === 'off') return null
		if (conflict === 'once') scenario.set({ conflict: 'off' })
		return store.create({ date: slot.date, start: slot.start, end: slot.end, title: RIVAL_TITLE })
	}

	/** Общая проверка для создания и редактирования. null — можно записывать. */
	const checkSlot = (slot: BookingInput, excludeId?: string): Response | null => {
		const violations = validateBooking(slot, { now: now(), bookings: store.listByDate(slot.date), excludeId })

		const ruleViolations = violations.filter(violation => violation.code !== 'OVERLAP')
		const [firstRuleViolation] = ruleViolations
		if (firstRuleViolation) {
			return errorResponse(422, BOOKING_ERROR_CODES.validationFailed, describeViolation(firstRuleViolation), {
				violations: ruleViolations satisfies BookingViolation[]
			})
		}

		const overlap = violations.find(violation => violation.code === 'OVERLAP')
		const conflicts = overlap?.code === 'OVERLAP' ? overlap.conflicts : []
		const rival = conflicts.length === 0 ? takeSlotByRival(slot) : null
		const allConflicts = rival ? [rival] : conflicts

		if (allConflicts.length > 0) {
			return errorResponse(409, BOOKING_ERROR_CODES.conflict, 'Это время уже занято.', {
				conflicts: allConflicts
			})
		}

		return null
	}

	return [
		http.get(COLLECTION, async ({ request }) => {
			await simulateLatency()
			if (scenario.get().failList) {
				return HttpResponse.json(
					{ error: { code: 'INTERNAL_ERROR', message: 'Сервис бронирования временно недоступен.' } },
					{ status: 500 }
				)
			}

			const date = isoDateSchema.safeParse(new URL(request.url).searchParams.get('date'))
			if (!date.success) {
				return errorResponse(400, BOOKING_ERROR_CODES.invalidRequest, 'Параметр date обязателен: YYYY-MM-DD')
			}

			return HttpResponse.json(store.listByDate(date.data))
		}),

		http.post(COLLECTION, async ({ request }) => {
			await simulateLatency()
			const input = bookingInputSchema.safeParse(await readJson(request))
			if (!input.success) {
				return errorResponse(400, BOOKING_ERROR_CODES.invalidRequest, 'Некорректные данные брони', {
					issues: input.error.issues
				})
			}

			const { title, ...slot } = input.data
			const rejection = checkSlot(slot)
			if (rejection) return rejection

			return HttpResponse.json(store.create(withTitle(slot, title)), { status: 201 })
		}),

		http.patch<{ id: string }>(ITEM, async ({ request, params }) => {
			await simulateLatency()
			const existing = store.getById(params.id)
			if (!existing) return errorResponse(404, BOOKING_ERROR_CODES.notFound, 'Бронь не найдена.')
			if (isBookingStarted(existing, now())) {
				return errorResponse(422, BOOKING_ERROR_CODES.locked, 'Встреча уже началась, её нельзя изменить.')
			}

			const patch = bookingPatchSchema.safeParse(await readJson(request))
			if (!patch.success) {
				return errorResponse(400, BOOKING_ERROR_CODES.invalidRequest, 'Некорректные данные брони', {
					issues: patch.error.issues
				})
			}

			const { date = existing.date, start = existing.start, end = existing.end } = patch.data
			const title = 'title' in patch.data ? patch.data.title : existing.title
			const next: Booking = withTitle({ id: existing.id, date, start, end }, title)
			const rejection = checkSlot(next, existing.id)
			if (rejection) return rejection

			return HttpResponse.json(store.replace(next))
		}),

		http.delete<{ id: string }>(ITEM, async ({ params }) => {
			await simulateLatency()
			const existing = store.getById(params.id)
			if (!existing) return errorResponse(404, BOOKING_ERROR_CODES.notFound, 'Бронь не найдена.')
			if (isBookingStarted(existing, now())) {
				return errorResponse(422, BOOKING_ERROR_CODES.locked, 'Встреча уже началась, её нельзя удалить.')
			}

			store.remove(existing.id)
			return new HttpResponse(null, { status: 204 })
		})
	]
}
