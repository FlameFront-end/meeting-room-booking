import { Suspense } from 'react'

import { BookingDayScreen } from '@/screens/booking-day'

// Экран читает ?date= через useSearchParams — Next требует для этого Suspense-границу
const HomePage = () => (
	<Suspense>
		<BookingDayScreen />
	</Suspense>
)

export default HomePage
