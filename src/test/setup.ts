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
// matchMedia в jsdom нет: считаем, что устройство с мышью. Устаревшие addListener/removeListener
// коду не нужны, поэтому объект неполный — отсюда приведение через unknown
window.matchMedia = (query: string) =>
	({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		dispatchEvent: () => false
	}) as unknown as MediaQueryList
// jsdom прячет [popover] своей таблицей стилей, но методов Popover API у него нет.
// Полифил переключает видимость inline-стилем — как будто элемент открыт в top layer
HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
	this.style.display = 'block'
}
HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
	this.style.removeProperty('display')
}
// Прокрутка к активному пункту списка — в jsdom её нет, а для тестов она не важна
Element.prototype.scrollIntoView = () => undefined

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
