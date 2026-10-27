import { useEffect, useState } from 'react'

const MINUTE_MS = 60_000

/**
 * Текущее время, обновляемое на границе каждой минуты.
 * Нужно, чтобы «прошедшие» слоты на сегодня становились недоступными без перезагрузки страницы.
 */
export const useNow = (): Date => {
	const [now, setNow] = useState(() => new Date())

	useEffect(() => {
		let intervalId: ReturnType<typeof setInterval> | undefined
		const tick = () => setNow(new Date())
		const msToNextMinute = MINUTE_MS - (Date.now() % MINUTE_MS)

		const timeoutId = setTimeout(() => {
			tick()
			intervalId = setInterval(tick, MINUTE_MS)
		}, msToNextMinute)

		// Вкладка могла «уснуть» в фоне — при возврате сразу пересчитываем время
		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') tick()
		}
		document.addEventListener('visibilitychange', onVisibilityChange)

		return () => {
			clearTimeout(timeoutId)
			clearInterval(intervalId)
			document.removeEventListener('visibilitychange', onVisibilityChange)
		}
	}, [])

	return now
}
