import { useSyncExternalStore } from 'react'

const noop = () => undefined
const subscribe = () => noop

/**
 * false на сервере и при гидрации, true — после неё.
 * Всё, что зависит от часов и таймзоны пользователя («сегодня», «прошедшие слоты»),
 * рендерим только на клиенте: таймзона сервера может отличаться.
 */
export const useHydrated = (): boolean =>
	useSyncExternalStore(
		subscribe,
		() => true,
		() => false
	)
