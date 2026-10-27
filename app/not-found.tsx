import Link from 'next/link'

const NotFoundPage = () => (
	<main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem', display: 'grid', gap: '1rem' }}>
		<h1>Страница не найдена</h1>
		<p>
			<Link href='/'>Вернуться к бронированию</Link>
		</p>
	</main>
)

export default NotFoundPage
