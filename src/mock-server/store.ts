import { bookingListSchema, type Booking, type BookingInput } from '@/entities/booking'
import type { IsoDate } from '@/shared/lib/date'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type BookingsStore = {
	listByDate: (date: IsoDate) => Booking[]
	getById: (id: string) => Booking | undefined
	create: (input: BookingInput) => Booking
	replace: (booking: Booking) => Booking
	remove: (id: string) => boolean
	reset: (bookings?: Booking[]) => void
}

type CreateBookingsStoreOptions = {
	initial: () => Booking[]
	/** Если передан — данные переживают перезагрузку страницы (демо на Vercel без бэкенда). */
	storage?: StorageLike | undefined
	storageKey?: string
	createId?: () => string
}

const byStart = (a: Booking, b: Booking) => a.start.localeCompare(b.start)

/** In-memory «база» mock-сервера. В браузере синхронизируется с localStorage. */
export const createBookingsStore = ({
	initial,
	storage,
	storageKey = 'meeting-room-booking:bookings:v1',
	createId = () => crypto.randomUUID()
}: CreateBookingsStoreOptions): BookingsStore => {
	const load = (): Map<string, Booking> => {
		const raw = storage?.getItem(storageKey)
		if (raw) {
			try {
				const parsed = bookingListSchema.safeParse(JSON.parse(raw))
				if (parsed.success) return new Map(parsed.data.map(booking => [booking.id, booking]))
			} catch {
				// повреждённые данные — просто начинаем заново
			}
		}
		return new Map(initial().map(booking => [booking.id, booking]))
	}

	let bookings = load()

	const persist = () => {
		storage?.setItem(storageKey, JSON.stringify([...bookings.values()]))
	}

	persist()

	return {
		listByDate: date => [...bookings.values()].filter(booking => booking.date === date).sort(byStart),
		getById: id => bookings.get(id),
		create: input => {
			const booking: Booking = { ...input, id: createId() }
			bookings.set(booking.id, booking)
			persist()
			return booking
		},
		replace: booking => {
			bookings.set(booking.id, booking)
			persist()
			return booking
		},
		remove: id => {
			const removed = bookings.delete(id)
			if (removed) persist()
			return removed
		},
		reset: next => {
			bookings = new Map((next ?? initial()).map(booking => [booking.id, booking]))
			persist()
		}
	}
}
