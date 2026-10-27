/**
 * Фиксирует «сейчас» в локальной таймзоне. Подменяется только Date:
 * таймеры остаются настоящими, поэтому waitFor/findBy и задержки MSW работают как обычно.
 */
export const freezeTime = (localDateTime: string) => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(localDateTime))
}
