import { formatBookingRange } from '@/entities/booking'
import { Alert } from '@/shared/ui'

import type { SubmitError } from '../model/submit-error'

import styles from './booking-form.module.scss'

const TITLES: Record<SubmitError['type'], string> = {
	conflict: 'Это время уже занято',
	violations: 'Сервер отклонил бронь',
	gone: 'Сохранить не получилось',
	failure: 'Не удалось сохранить бронь'
}

export const SubmitErrorAlert = ({ error }: { error: SubmitError }) => (
	<Alert tone='danger' title={TITLES[error.type]}>
		<p>{error.message}</p>
		{error.type === 'conflict' && error.conflicts.length > 0 ? (
			<ul className={styles.conflicts}>
				{error.conflicts.map(booking => (
					<li key={booking.id}>
						{formatBookingRange(booking)} — {booking.title ?? 'Без названия'}
					</li>
				))}
			</ul>
		) : null}
		{error.type === 'failure' ? <p>Введённые данные сохранены — можно отправить ещё раз.</p> : null}
	</Alert>
)
