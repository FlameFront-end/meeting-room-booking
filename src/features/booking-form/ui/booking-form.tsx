import { formatBookingRange, type Booking } from '@/entities/booking'
import { formatDuration, isTimeString, timeToMinutes } from '@/shared/lib/time'
import { Alert, Button, Field } from '@/shared/ui'

import type { BookingFormState } from '../model/use-booking-form'

import styles from './booking-form.module.scss'
import { BusySlots } from './busy-slots'
import { SubmitErrorAlert } from './submit-error-alert'

type BookingFormProps = {
	state: BookingFormState
	mode: 'create' | 'edit'
	/** Минимальная дата в календаре — сегодня. */
	minDate: string
	onCancel: () => void
}

const describeDuration = (start: string, end: string): string | undefined => {
	if (!isTimeString(start) || !isTimeString(end)) return undefined
	const minutes = timeToMinutes(end) - timeToMinutes(start)
	return minutes > 0 ? `Длительность: ${formatDuration(minutes)}` : undefined
}

const describeOverlap = (conflicts: readonly Booking[]) =>
	conflicts.map(booking => `${formatBookingRange(booking)} (${booking.title ?? 'без названия'})`).join(', ')

export const BookingForm = ({ state, mode, minDate, onCancel }: BookingFormProps) => {
	const { fields, slot, errors, overlap, conflictIds, submitError, busy, startOptions, endOptions } = state

	return (
		<form
			className={styles.form}
			noValidate
			aria-busy={state.isPending}
			onSubmit={event => void state.submit(event)}
		>
			{submitError ? <SubmitErrorAlert error={submitError} /> : null}
			{!state.hasFreeSlot ? <Alert tone='info'>На эту дату свободного времени не осталось.</Alert> : null}

			{/* Пока идёт отправка, поля заблокированы, а кнопка отправки — вне fieldset и не теряет фокус */}
			<fieldset className={styles.fields} disabled={state.isPending}>
				<Field label='Дата' error={errors.date}>
					{control => (
						<input {...control} {...fields.date} type='date' min={minDate} required data-autofocus />
					)}
				</Field>

				<div className={styles.times}>
					<Field label='Начало' error={errors.start}>
						{control => (
							<select {...control} {...fields.start}>
								{startOptions.map(option => (
									<option key={option.value} value={option.value} disabled={option.disabled}>
										{option.value}
									</option>
								))}
							</select>
						)}
					</Field>
					<Field label='Окончание' error={errors.end} hint={describeDuration(slot.start, slot.end)}>
						{control => (
							<select {...control} {...fields.end}>
								{endOptions.map(option => (
									<option key={option.value} value={option.value} disabled={option.disabled}>
										{option.value}
									</option>
								))}
							</select>
						)}
					</Field>
				</div>

				<Field label='Название' hint='Необязательно' error={errors.title}>
					{control => (
						<input
							{...control}
							{...fields.title}
							type='text'
							autoComplete='off'
							placeholder='Например, планирование спринта'
						/>
					)}
				</Field>
			</fieldset>

			{overlap.length > 0 ? (
				<Alert tone='warning' title='Время пересекается с другой бронью'>
					{describeOverlap(overlap)}. Касаться границами можно: 10:00–11:00 и 11:00–12:00 не конфликтуют.
				</Alert>
			) : null}

			<BusySlots bookings={busy.bookings} status={busy.status} conflictIds={conflictIds} />

			<div className={styles.actions}>
				<Button variant='ghost' disabled={state.isPending} onClick={onCancel}>
					Отмена
				</Button>
				<Button type='submit' variant='primary' loading={state.isPending}>
					{mode === 'create' ? 'Забронировать' : 'Сохранить'}
				</Button>
			</div>
		</form>
	)
}
