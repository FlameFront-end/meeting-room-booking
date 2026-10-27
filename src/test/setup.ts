import '@testing-library/jest-dom/vitest'

import { mockApi } from './mock-api'

beforeAll(() => {
	// Любой запрос мимо обработчиков — ошибка теста, а не тихий поход в сеть
	mockApi.server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
	mockApi.reset()
	vi.useRealTimers()
})

afterAll(() => {
	mockApi.server.close()
})
