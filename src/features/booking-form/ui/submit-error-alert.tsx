import { formatBookingRange } from '@/entities/booking'
import { Alert } from '@/shared/ui'

import type { SubmitError } from '../model/submit-error'

import styles from './booking-form.module.scss'

const TITLES: Record<SubmitError['type'], string> = {
	conflict: 'Время уже занято',
	violations: 'Не получилось сохранить',
	gone: 'Не получилось сохранить',
	failure: 'Не получилось сохранить'
}

export const SubmitErrorAlert = ({ error }: { error: SubmitError }) => (
	<Alert tone='danger' title={TITLES[error.type]}>
		<p>{error.message}</p>
		{error.type === 'conflict' && error.conflicts.length > 0 ? (
			<ul className={styles.conflicts}>
				{error.conflicts.map(booking => (
					<li key={booking.id}>
						{formatBookingRange(booking)} · {booking.title ?? 'Без названия'}
					</li>
				))}
			</ul>
		) : null}
	</Alert>
)
