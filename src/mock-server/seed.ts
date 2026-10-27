import type { Booking } from '@/entities/booking'
import { addDays, toIsoDate } from '@/shared/lib/date'

/** Демо-данные относительно «сегодня»: чтобы при первом открытии было что посмотреть. */
export const createSeedBookings = (now: Date): Booking[] => {
	const today = toIsoDate(now)
	const tomorrow = addDays(today, 1)

	return [
		{ id: 'seed-1', date: today, start: '09:30', end: '10:00', title: 'Стендап команды' },
		{ id: 'seed-2', date: today, start: '13:00', end: '14:30', title: 'Планирование спринта' },
		{ id: 'seed-3', date: today, start: '16:00', end: '17:00', title: 'Собеседование' },
		{ id: 'seed-4', date: tomorrow, start: '10:00', end: '11:00', title: 'Ретро' },
		{ id: 'seed-5', date: tomorrow, start: '11:00', end: '12:00' }
	]
}
