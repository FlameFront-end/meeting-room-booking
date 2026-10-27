import { getRoomStatus } from './room-status'
import type { Booking } from './schema'

const TODAY = '2026-10-27'
const at = (time: string) => new Date(`${TODAY}T${time}:00`)
const booking = (id: string, start: string, end: string, date = TODAY): Booking => ({ id, date, start, end })

describe('getRoomStatus', () => {
	const bookings = [
		booking('a', '10:00', '11:00'),
		booking('b', '11:00', '12:00'),
		booking('c', '14:00', '15:00'),
		booking('other-day', '12:00', '13:00', '2026-10-28')
	]

	it('вне рабочего дня — закрыта', () => {
		expect(getRoomStatus(bookings, at('08:59'))).toEqual({ state: 'closed' })
		expect(getRoomStatus(bookings, at('18:00'))).toEqual({ state: 'closed' })
	})

	it('свободна до ближайшей встречи', () => {
		expect(getRoomStatus(bookings, at('09:15'))).toEqual({ state: 'free', until: '10:00' })
		expect(getRoomStatus(bookings, at('12:00'))).toEqual({ state: 'free', until: '14:00' })
	})

	it('свободна до конца дня, если встреч больше нет', () => {
		expect(getRoomStatus(bookings, at('15:00'))).toEqual({ state: 'free', until: null })
	})

	it('занята: встречи встык склеиваются', () => {
		expect(getRoomStatus(bookings, at('10:30'))).toEqual({ state: 'busy', until: '12:00', booking: bookings[0] })
	})
})
