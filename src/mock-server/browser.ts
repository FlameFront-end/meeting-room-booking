import { setupWorker } from 'msw/browser'

import { createBookingHandlers } from './handlers'
import { createScenarioController, DEFAULT_SCENARIO, parseScenarioFromSearch, type MockScenario } from './scenario'
import { createSeedBookings } from './seed'
import { createBookingsStore } from './store'

const SCENARIO_STORAGE_KEY = 'meeting-room-booking:mock-scenario:v1'

/** Небольшая задержка по умолчанию, чтобы состояния загрузки и отправки были видны глазами. */
const BROWSER_DEFAULT_SCENARIO: MockScenario = { ...DEFAULT_SCENARIO, latencyMs: 400 }

const readStoredScenario = (): MockScenario => {
	try {
		const raw = window.sessionStorage.getItem(SCENARIO_STORAGE_KEY)
		return raw
			? { ...BROWSER_DEFAULT_SCENARIO, ...(JSON.parse(raw) as Partial<MockScenario>) }
			: BROWSER_DEFAULT_SCENARIO
	} catch {
		return BROWSER_DEFAULT_SCENARIO
	}
}

export type MockServerDevtools = {
	scenario: () => MockScenario
	setScenario: (patch: Partial<MockScenario>) => void
	/** Вернуть демо-данные и сценарий по умолчанию. */
	reset: () => void
}

declare global {
	// Глобальная переменная для ручного QA из консоли браузера: mockServer.setScenario({ conflict: 'once' })
	var mockServer: MockServerDevtools | undefined
}

/**
 * Поднимает mock-API в Service Worker. Данные живут в localStorage браузера,
 * поэтому демо на Vercel работает без бэкенда и переживает перезагрузку.
 */
export const startMockServer = async (): Promise<void> => {
	const store = createBookingsStore({
		initial: () => createSeedBookings(new Date()),
		storage: window.localStorage
	})

	const scenario = createScenarioController(
		parseScenarioFromSearch(window.location.search, readStoredScenario()),
		next => {
			try {
				window.sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(next))
			} catch {
				// sessionStorage может быть недоступен (приватный режим) — сценарий просто не сохранится
			}
		}
	)

	const worker = setupWorker(...createBookingHandlers({ store, scenario }))
	await worker.start({
		onUnhandledRequest: 'bypass',
		quiet: process.env.NODE_ENV === 'production'
	})

	globalThis.mockServer = {
		scenario: scenario.get,
		setScenario: scenario.set,
		reset: () => {
			store.reset()
			scenario.reset()
		}
	}
}
