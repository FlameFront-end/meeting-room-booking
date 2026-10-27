import { setupServer } from 'msw/node'

import type { Booking } from '@/entities/booking'

import { createBookingHandlers } from './handlers'
import { createScenarioController } from './scenario'
import { createBookingsStore } from './store'

/** Mock-сервер для Node (Vitest): тот же код обработчиков, что и в браузере, но память вместо localStorage. */
export const createNodeMockServer = (initial: () => Booking[] = () => []) => {
	let sequence = 0
	const store = createBookingsStore({ initial, createId: () => `booking-${++sequence}` })
	const scenario = createScenarioController()
	const server = setupServer(...createBookingHandlers({ store, scenario }))

	return {
		server,
		store,
		scenario,
		reset: () => {
			sequence = 0
			store.reset()
			scenario.reset()
			server.resetHandlers()
		}
	}
}

export type NodeMockServer = ReturnType<typeof createNodeMockServer>
