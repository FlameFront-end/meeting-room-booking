'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { env } from '@/shared/config'
import { Alert, Spinner } from '@/shared/ui'

type GateState = { status: 'pending' } | { status: 'ready' } | { status: 'failed'; error: unknown }

/**
 * Не рендерит приложение, пока mock-API не готов: иначе первые запросы
 * успеют уйти мимо Service Worker. При env.apiMocking=false — прозрачен.
 */
export const MockApiGate = ({ children }: { children: ReactNode }) => {
	const [state, setState] = useState<GateState>(() => (env.apiMocking ? { status: 'pending' } : { status: 'ready' }))

	useEffect(() => {
		if (!env.apiMocking) return
		let cancelled = false

		import('@/mock-server/browser')
			.then(({ startMockServer }) => startMockServer())
			.then(() => {
				if (!cancelled) setState({ status: 'ready' })
			})
			.catch((error: unknown) => {
				console.error('[mock-api] не удалось запустить', error)
				if (!cancelled) setState({ status: 'failed', error })
			})

		return () => {
			cancelled = true
		}
	}, [])

	if (state.status === 'ready') return children

	if (state.status === 'failed') {
		return (
			<Alert tone='danger' title='Не удалось запустить демо-API'>
				Mock-сервер работает через Service Worker. Он недоступен в приватном режиме некоторых браузеров и на
				страницах без HTTPS. Попробуйте обычное окно или другой браузер.
			</Alert>
		)
	}

	return <Spinner label='Запускаем демо-API…' size='lg' center />
}
