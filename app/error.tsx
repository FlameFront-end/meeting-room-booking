'use client'

import { useEffect } from 'react'

import { Alert, Button } from '@/shared/ui'

type ErrorPageProps = {
	error: Error & { digest?: string }
	reset: () => void
}

/** Последний рубеж: непредвиденная ошибка рендера не должна оставлять пользователя с белым экраном. */
const ErrorPage = ({ error, reset }: ErrorPageProps) => {
	useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
			<Alert
				tone='danger'
				title='Что-то пошло не так'
				action={
					<Button variant='primary' onClick={reset}>
						Попробовать снова
					</Button>
				}
			>
				Страница столкнулась с непредвиденной ошибкой. Введённые данные на сервер не отправлялись.
			</Alert>
		</main>
	)
}

export default ErrorPage
