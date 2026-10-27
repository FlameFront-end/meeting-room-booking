import { createNodeMockServer } from '@/mock-server/node'

/**
 * Один mock-сервер на весь прогон тестов. Те же обработчики, что и в браузере,
 * поэтому тесты проверяют приложение против того же «бэкенда», что видит пользователь.
 * Между тестами состояние сбрасывается в setup.ts.
 */
export const mockApi = createNodeMockServer()
