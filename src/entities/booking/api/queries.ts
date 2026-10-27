import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { IsoDate } from '@/shared/lib/date'

import type { BookingInput, BookingPatch } from '../model/schema'

import { bookingsApi } from './bookings-api'

export const bookingKeys = {
	all: ['bookings'] as const,
	lists: () => [...bookingKeys.all, 'list'] as const,
	list: (date: IsoDate) => [...bookingKeys.lists(), date] as const
}

export const bookingsQueryOptions = (date: IsoDate) =>
	queryOptions({
		queryKey: bookingKeys.list(date),
		queryFn: ({ signal }) => bookingsApi.list(date, signal)
	})

export const useBookingsQuery = (date: IsoDate) => useQuery(bookingsQueryOptions(date))

/*
 * Мутации инвалидируют список в onSettled — и при успехе, и при ошибке.
 * Это и есть «обновить список броней» после 409: сервер знает о брони, которой у нас ещё нет.
 */

export const useCreateBookingMutation = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (input: BookingInput) => bookingsApi.create(input),
		onSettled: (_data, _error, input) => queryClient.invalidateQueries({ queryKey: bookingKeys.list(input.date) })
	})
}

export type UpdateBookingVariables = {
	id: string
	patch: BookingPatch
	/** Дата брони до изменения: если дату поменяли, обновить нужно оба дня. */
	previousDate: IsoDate
}

export const useUpdateBookingMutation = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, patch }: UpdateBookingVariables) => bookingsApi.update(id, patch),
		onSettled: async (_data, _error, { patch, previousDate }) => {
			const dates = new Set([previousDate, patch.date ?? previousDate])
			await Promise.all(
				[...dates].map(date => queryClient.invalidateQueries({ queryKey: bookingKeys.list(date) }))
			)
		}
	})
}

export type DeleteBookingVariables = { id: string; date: IsoDate }

export const useDeleteBookingMutation = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id }: DeleteBookingVariables) => bookingsApi.remove(id),
		onSettled: (_data, _error, { date }) => queryClient.invalidateQueries({ queryKey: bookingKeys.list(date) })
	})
}
