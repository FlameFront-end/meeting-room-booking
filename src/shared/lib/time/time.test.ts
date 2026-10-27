import { formatDuration, isTimeString, minutesToTime, timeToMinutes } from './time'

describe('time', () => {
	it.each(['00:00', '09:05', '23:59'])('isTimeString(%s) → true', value => {
		expect(isTimeString(value)).toBe(true)
	})

	it.each(['24:00', '9:00', '09:60', '0900', '', '09:00:00'])('isTimeString(%s) → false', value => {
		expect(isTimeString(value)).toBe(false)
	})

	it('переводит время в минуты и обратно', () => {
		expect(timeToMinutes('00:00')).toBe(0)
		expect(timeToMinutes('10:30')).toBe(630)
		expect(minutesToTime(630)).toBe('10:30')
		expect(minutesToTime(1439)).toBe('23:59')
	})

	it('бросает на некорректных значениях', () => {
		expect(() => timeToMinutes('25:00')).toThrow(RangeError)
		expect(() => minutesToTime(1440)).toThrow(RangeError)
		expect(() => minutesToTime(10.5)).toThrow(RangeError)
	})

	it.each([
		[30, '30 мин'],
		[60, '1 ч'],
		[90, '1 ч 30 мин'],
		[0, '0 мин']
	])('formatDuration(%i) → %s', (minutes, expected) => {
		expect(formatDuration(minutes)).toBe(expected)
	})
})
