/**
 * Управление поведением mock-сервера — чтобы руками и в тестах воспроизводить
 * состояния, которые сложно поймать «честно»: медленную сеть, падение API и гонку за слот.
 */
export type MockScenario = {
	/** Искусственная задержка ответа, мс. */
	latencyMs: number
	/**
	 * Имитация гонки: между проверкой в UI и записью слот занимает другой сотрудник.
	 * off — выключено, once — только для следующей записи, always — для каждой.
	 */
	conflict: 'off' | 'once' | 'always'
	/** GET /api/bookings отвечает 500. */
	failList: boolean
}

export const DEFAULT_SCENARIO: MockScenario = {
	latencyMs: 0,
	conflict: 'off',
	failList: false
}

export type ScenarioController = {
	get: () => MockScenario
	set: (patch: Partial<MockScenario>) => void
	reset: () => void
}

export const createScenarioController = (
	initial: MockScenario = DEFAULT_SCENARIO,
	onChange?: (scenario: MockScenario) => void
): ScenarioController => {
	let current = { ...initial }
	return {
		get: () => current,
		set: patch => {
			current = { ...current, ...patch }
			onChange?.(current)
		},
		reset: () => {
			current = { ...initial }
			onChange?.(current)
		}
	}
}

const CONFLICT_VALUES = new Set<MockScenario['conflict']>(['off', 'once', 'always'])

/**
 * Сценарий из query-параметров: ?mock-latency=1500&mock-conflict=once&mock-fail-list=1
 * Неизвестные и некорректные значения игнорируются.
 */
export const parseScenarioFromSearch = (search: string, base: MockScenario): MockScenario => {
	const params = new URLSearchParams(search)
	const next = { ...base }

	const latency = Number(params.get('mock-latency'))
	if (params.has('mock-latency') && Number.isFinite(latency) && latency >= 0) next.latencyMs = latency

	const conflict = params.get('mock-conflict') as MockScenario['conflict'] | null
	if (conflict && CONFLICT_VALUES.has(conflict)) next.conflict = conflict

	if (params.has('mock-fail-list')) next.failList = params.get('mock-fail-list') === '1'

	return next
}
