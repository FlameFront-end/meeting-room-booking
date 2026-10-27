export const WORKING_HOURS = {
	start: '09:00',
	end: '18:00'
} as const

export const BOOKING_DURATION_MINUTES = {
	min: 30,
	max: 120
} as const

export const BOOKING_TITLE_MAX_LENGTH = 100

/** Шаг в выпадающих списках времени. Сервер шаг не проверяет — это решение UX, см. README. */
export const BOOKING_TIME_STEP_MINUTES = 15
