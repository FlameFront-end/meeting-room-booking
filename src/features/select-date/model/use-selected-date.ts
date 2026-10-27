import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

import { isIsoDate, type IsoDate } from '@/shared/lib/date'

export const DATE_SEARCH_PARAM = 'date'

/**
 * Выбранная дата хранится в URL (?date=YYYY-MM-DD): ссылкой можно поделиться,
 * работают «назад/вперёд», а перезагрузка не сбрасывает выбор.
 * Нет параметра или он невалиден — показываем сегодня.
 */
export const useSelectedDate = (today: IsoDate): [IsoDate, (next: IsoDate) => void] => {
	const searchParams = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()

	const raw = searchParams.get(DATE_SEARCH_PARAM)
	const date = raw && isIsoDate(raw) ? raw : today

	const setDate = useCallback(
		(next: IsoDate) => {
			const params = new URLSearchParams(searchParams.toString())
			if (next === today) params.delete(DATE_SEARCH_PARAM)
			else params.set(DATE_SEARCH_PARAM, next)

			const query = params.toString()
			router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
		},
		[pathname, router, searchParams, today]
	)

	return [date, setDate]
}
