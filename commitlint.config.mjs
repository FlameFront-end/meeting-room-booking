/** @type {import('@commitlint/types').UserConfig} */
const config = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		// Сообщения коммитов могут быть на русском, регистр не навязываем
		'subject-case': [0]
	}
}

export default config
