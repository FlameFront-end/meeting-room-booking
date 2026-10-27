import { httpClient, type HttpClient } from '@/shared/api'
import type { IsoDate } from '@/shared/lib/date'

import { bookingListSchema, bookingSchema, type Booking, type BookingInput, type BookingPatch } from '../model/schema'

import { BOOKINGS_ENDPOINT } from './contract'

/**
 * Порт для работы с бронями. UI зависит только от этого типа:
 * замена mock-сервера на реальный бэкенд не трогает ни компоненты, ни хуки.
 */
export type BookingsApi = {
	list: (date: IsoDate, signal?: AbortSignal) => Promise<Booking[]>
	create: (input: BookingInput) => Promise<Booking>
	update: (id: string, patch: BookingPatch) => Promise<Booking>
	remove: (id: string) => Promise<void>
}

const bookingPath = (id: string) => `${BOOKINGS_ENDPOINT}/${encodeURIComponent(id)}`

export const createBookingsApi = (http: HttpClient): BookingsApi => ({
	list: (date, signal) => http.get(BOOKINGS_ENDPOINT, { schema: bookingListSchema, query: { date }, signal }),
	create: input => http.post(BOOKINGS_ENDPOINT, { schema: bookingSchema, body: input }),
	update: (id, patch) => http.patch(bookingPath(id), { schema: bookingSchema, body: patch }),
	remove: id => http.delete(bookingPath(id))
})

export const bookingsApi = createBookingsApi(httpClient)
