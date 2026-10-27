import { describeViolation, type BookingViolation } from './violations'

describe('describeViolation', () => {
	it.each<[BookingViolation, string]>([
		[{ code: 'DATE_IN_PAST', field: 'date' }, 'Нельзя бронировать на прошедшую дату'],
		[{ code: 'START_IN_PAST', field: 'start' }, 'Это время уже прошло'],
		[{ code: 'OUTSIDE_WORKING_HOURS', field: 'start' }, 'Бронировать можно только в рабочее время: 09:00–18:00'],
		[{ code: 'START_NOT_BEFORE_END', field: 'end' }, 'Окончание должно быть позже начала'],
		[{ code: 'TOO_SHORT', field: 'end' }, 'Минимальная длительность — 30 мин'],
		[{ code: 'TOO_LONG', field: 'end' }, 'Максимальная длительность — 2 ч']
	])('%j', (violation, message) => {
		expect(describeViolation(violation)).toBe(message)
	})

	it('перечисляет конфликтующие интервалы', () => {
		expect(
			describeViolation({
				code: 'OVERLAP',
				field: 'form',
				conflicts: [
					{ id: 'a', date: '2026-10-28', start: '10:00', end: '11:00' },
					{ id: 'b', date: '2026-10-28', start: '12:00', end: '12:30' }
				]
			})
		).toBe('Время пересекается с другой бронью: 10:00–11:00, 12:00–12:30')
	})
})
