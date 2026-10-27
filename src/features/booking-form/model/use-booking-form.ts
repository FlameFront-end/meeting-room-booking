import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type ChangeEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import {
	bookingsQueryOptions,
	describeViolation,
	getConflictsFromError,
	getTimeOptions,
	shiftEndWithStart,
	suggestFreeSlot,
	useCreateBookingMutation,
	useUpdateBookingMutation,
	validateBooking,
	WORKING_HOURS,
	type Booking,
	type BookingSlot
} from '@/entities/booking'
import { isIsoDate } from '@/shared/lib/date'
import { isTimeString } from '@/shared/lib/time'

import {
	bookingFormSchema,
	isSameSlot,
	type BookingFormInput,
	type BookingFormTarget,
	type BookingFormValues
} from './form-schema'
import { toSubmitError } from './submit-error'

export type BookingFormField = keyof BookingFormInput
export type BookingFormErrors = Partial<Record<BookingFormField, string>>

type UseBookingFormOptions = {
	target: BookingFormTarget
	now: Date
	onSaved: (booking: Booking) => void
	/** Сервер ответил 409: наружу уходят конфликтующие брони, чтобы подсветить их в расписании. */
	onConflict?: ((conflicts: Booking[]) => void) | undefined
}

const FIELDS: readonly BookingFormField[] = ['date', 'start', 'end', 'title']

const getDefaults = (
	target: BookingFormTarget,
	bookings: readonly Booking[],
	now: Date
): { values: BookingFormInput; hasFreeSlot: boolean } => {
	if (target.mode === 'edit') {
		const { date, start, end, title = '' } = target.booking
		return { values: { date, start, end, title }, hasFreeSlot: true }
	}

	const slot = suggestFreeSlot(target.date, bookings, now)
	if (slot) return { values: { ...slot, title: '' }, hasFreeSlot: true }

	// Свободного времени нет — показываем начало дня, а правила объяснят, почему его не забронировать
	const start = WORKING_HOURS.start
	return {
		values: { date: target.date, start, end: shiftEndWithStart({ start, end: start }, start), title: '' },
		hasFreeSlot: false
	}
}

/**
 * Состояние формы брони. Компонент только рисует то, что вернул хук.
 *
 * Ошибки у полей собираются из трёх источников (первое сообщение на поле побеждает):
 *  1. формат (Zod через react-hook-form);
 *  2. нарушения из ответа 422 — пока пользователь не поменял отправленный слот;
 *  3. живая проверка бизнес-правил validateBooking по актуальному списку броней.
 *
 * 409 не сбрасывает форму: введённые данные остаются, список броней обновляется
 * (инвалидация в мутации), а конфликтующие брони подсвечиваются.
 */
export const useBookingForm = ({ target, now, onSaved, onConflict }: UseBookingFormOptions) => {
	const queryClient = useQueryClient()
	const excludeId = target.mode === 'edit' ? target.booking.id : undefined
	const initialDate = target.mode === 'edit' ? target.booking.date : target.date

	const [defaults] = useState(() =>
		getDefaults(target, queryClient.getQueryData(bookingsQueryOptions(initialDate).queryKey) ?? [], now)
	)

	const form = useForm<BookingFormInput, unknown, BookingFormValues>({
		defaultValues: defaults.values,
		resolver: zodResolver(bookingFormSchema),
		mode: 'onTouched'
	})
	const [date, start, end] = useWatch({ control: form.control, name: ['date', 'start', 'end'] })
	const slot: BookingSlot = { date, start, end }
	const isSlotComplete = isIsoDate(date) && isTimeString(start) && isTimeString(end)

	// Занятость берём из того же кэша, что и расписание: после 409 оба обновятся одной инвалидацией
	const bookingsQuery = useQuery({ ...bookingsQueryOptions(date), enabled: isIsoDate(date) })
	const otherBookings = (bookingsQuery.data ?? []).filter(booking => booking.id !== excludeId)
	const liveViolations = isSlotComplete ? validateBooking(slot, { now, bookings: otherBookings }) : []

	const createMutation = useCreateBookingMutation()
	const updateMutation = useUpdateBookingMutation()
	const mutation = target.mode === 'create' ? createMutation : updateMutation
	const inFlight = useRef(false)
	const [submittedSlot, setSubmittedSlot] = useState<BookingSlot | null>(null)

	const submitError = mutation.error ? toSubmitError(mutation.error) : null
	// Конфликт и нарушения относятся к отправленному слоту: выбрал другое время — сообщение устарело
	const isSubmitErrorStale =
		(submitError?.type === 'conflict' || submitError?.type === 'violations') &&
		(submittedSlot === null || !isSameSlot(submittedSlot, slot))
	const visibleSubmitError = isSubmitErrorStale ? null : submitError

	const errors: BookingFormErrors = {}
	for (const field of FIELDS) {
		const message = form.formState.errors[field]?.message
		if (message) errors[field] = message
	}
	const serverViolations = visibleSubmitError?.type === 'violations' ? visibleSubmitError.violations : []
	for (const violation of [...serverViolations, ...liveViolations]) {
		if (violation.field !== 'form') errors[violation.field] ??= describeViolation(violation)
	}

	const liveOverlap = liveViolations.find(violation => violation.code === 'OVERLAP')
	const serverConflicts = visibleSubmitError?.type === 'conflict' ? visibleSubmitError.conflicts : []
	// Если сервер уже сообщил о конфликте, живое предупреждение о том же не дублируем
	const overlap = serverConflicts.length > 0 ? [] : (liveOverlap?.conflicts ?? [])
	const conflictIds = new Set([...overlap, ...serverConflicts].map(booking => booking.id))

	const onValid = (values: BookingFormValues) => {
		// Двойной клик или Enter успевают раньше, чем форма перерисуется в состоянии отправки
		if (inFlight.current) return

		const [firstViolation] = liveViolations
		if (firstViolation) {
			form.setFocus(firstViolation.field === 'form' ? 'start' : firstViolation.field)
			return
		}

		inFlight.current = true
		setSubmittedSlot({ date: values.date, start: values.start, end: values.end })
		const callbacks = {
			onSuccess: onSaved,
			onError: (error: unknown) => {
				const conflicts = getConflictsFromError(error)
				if (conflicts.length > 0) onConflict?.(conflicts)
			},
			onSettled: () => {
				inFlight.current = false
			}
		}

		if (target.mode === 'create') {
			createMutation.mutate(values, callbacks)
		} else {
			updateMutation.mutate(
				{ id: target.booking.id, patch: values, previousDate: target.booking.date },
				callbacks
			)
		}
	}
	// handleSubmit только оборачивает onValid; ref читается при отправке формы, а не во время рендера
	// eslint-disable-next-line react-hooks/refs
	const submit = form.handleSubmit(onValid)

	const startField = form.register('start')
	const onStartChange = (event: ChangeEvent<HTMLSelectElement>) => {
		// Сдвигаем окончание вслед за началом, сохраняя длительность — как в календарях
		form.setValue('end', shiftEndWithStart(form.getValues(), event.target.value))
		return startField.onChange(event)
	}

	return {
		fields: {
			date: form.register('date'),
			start: { ...startField, onChange: onStartChange },
			end: form.register('end'),
			title: form.register('title')
		},
		slot,
		errors,
		/** Пересечения, найденные на клиенте до отправки. */
		overlap,
		conflictIds,
		submitError: visibleSubmitError,
		busy: { bookings: otherBookings, status: isIsoDate(date) ? bookingsQuery.status : ('idle' as const) },
		startOptions: getTimeOptions('start', { date, now, current: isTimeString(start) ? start : undefined }),
		endOptions: getTimeOptions('end', { date, now, current: isTimeString(end) ? end : undefined }),
		hasFreeSlot: defaults.hasFreeSlot,
		isPending: mutation.isPending,
		submit
	}
}

export type BookingFormState = ReturnType<typeof useBookingForm>
