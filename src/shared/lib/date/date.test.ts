import {
	addDays,
	addMonths,
	compareIsoDates,
	formatIsoDate,
	getCalendarWeeks,
	isIsoDate,
	minutesSinceMidnight,
	startOfMonth,
	toIsoDate,
	weekdayIndex
} from './date'

describe('date', () => {
	it.each(['2026-10-27', '2028-02-29'])('isIsoDate(%s) → true', value => {
		expect(isIsoDate(value)).toBe(true)
	})

	it.each(['2026-02-29', '2026-13-01', '2026-10-32', '27.10.2026', '2026-1-1', ''])(
		'isIsoDate(%s) → false',
		value => {
			expect(isIsoDate(value)).toBe(false)
		}
	)

	it('toIsoDate берёт локальную календарную дату', () => {
		expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
	})

	it('minutesSinceMidnight считает локальное время', () => {
		expect(minutesSinceMidnight(new Date(2026, 0, 5, 10, 30, 59))).toBe(630)
	})

	it('addDays переходит через границы месяца и года', () => {
		expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
	})

	it('addDays не ломается на переходе на летнее время', () => {
		// В Европе переход в последнее воскресенье марта; арифметика идёт в UTC
		expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
	})

	it('compareIsoDates', () => {
		expect(compareIsoDates('2026-10-27', '2026-10-28')).toBe(-1)
		expect(compareIsoDates('2026-10-28', '2026-10-28')).toBe(0)
		expect(compareIsoDates('2026-11-01', '2026-10-28')).toBe(1)
	})

	it('formatIsoDate форматирует по-русски независимо от таймзоны', () => {
		expect(formatIsoDate('2026-10-27')).toBe('вторник, 27 октября')
	})

	it('бросает на невалидной дате', () => {
		expect(() => addDays('2026-02-30', 1)).toThrow(RangeError)
	})
})

describe('календарь', () => {
	it('addMonths прижимает день к концу месяца и переходит через год', () => {
		expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
		expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
		expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
		expect(addMonths('2026-01-15', -1)).toBe('2025-12-15')
	})

	it('weekdayIndex считает с понедельника', () => {
		expect(weekdayIndex('2026-10-26')).toBe(0)
		expect(weekdayIndex('2026-11-01')).toBe(6)
	})

	it('getCalendarWeeks: полные недели с понедельника', () => {
		const weeks = getCalendarWeeks('2026-10-27')
		expect(weeks).toHaveLength(5)
		expect(weeks[0]?.[0]).toBe('2026-09-28')
		expect(weeks.at(-1)?.at(-1)).toBe('2026-11-01')
		expect(startOfMonth('2026-10-27')).toBe('2026-10-01')
	})
})
