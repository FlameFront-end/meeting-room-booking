import '@testing-library/jest-dom/vitest'

import { mockApi } from './mock-api'

// jsdom не реализует модальный <dialog>. Для тестов достаточно открытия и закрытия:
// фокус-ловушку и top layer даёт браузер, их проверяют e2e.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
	this.open = true
}
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
	this.open = false
}

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
