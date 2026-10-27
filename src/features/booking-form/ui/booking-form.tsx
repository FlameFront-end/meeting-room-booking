import type { CSSProperties } from 'react'

import { formatBookingRange, type Booking } from '@/entities/booking'
import { formatDuration } from '@/shared/lib/time'
import { Alert, DatePicker, Field, Reveal, Select } from '@/shared/ui'

import type { BookingFormState } from '../model/use-booking-form'

import styles from './booking-form.module.scss'
import { BusySlots } from './busy-slots'
import { SubmitErrorAlert } from './submit-error-alert'

type BookingFormProps = {
	state: BookingFormState
	/** Сегодня: раньше этой даты бронировать нельзя. */
	today: string
	/** id формы: кнопка отправки живёт в подвале окна и связана с формой атрибутом form. */
	id: string
}

const describeOverlap = (conflicts: readonly Booking[]) =>
	conflicts.map(booking => `${formatBookingRange(booking)} · ${booking.title ?? 'Без названия'}`).join(', ')

/** Порядок полей как в календарях: сначала «что», потом «когда». */
export const BookingForm = ({ state, today, id }: BookingFormProps) => {
	const { fields, slot, errors, overlap, conflictIds, submitError, busy, startOptions, endOptions } = state
	const activePreset = state.durationPresets.findIndex(preset => preset.pressed)

	return (
		<form
			id={id}
			className={styles.form}
			noValidate
			aria-busy={state.isPending}
			onSubmit={event => void state.submit(event)}
		>
			<Reveal>{submitError ? <SubmitErrorAlert error={submitError} /> : null}</Reveal>
			<Reveal>
				{!state.hasFreeSlot ? <Alert tone='info'>На этот день свободного времени нет.</Alert> : null}
			</Reveal>

			{/* Пока идёт отправка, поля заблокированы, а кнопка отправки — вне fieldset и не теряет фокус */}
			<fieldset className={styles.fields} disabled={state.isPending}>
				<Field
					label={
						<>
							Название <span className={styles.optional}>(необязательно)</span>
						</>
					}
					error={errors.title}
				>
					{control => (
						<input
							{...control}
							{...fields.title}
							type='text'
							autoComplete='off'
							placeholder='Без названия'
							data-autofocus
						/>
					)}
				</Field>

				<Field label='Дата' error={errors.date}>
					{(control, { labelId }) => (
						<DatePicker
							id={control.id}
							ref={fields.date.ref}
							aria-labelledby={labelId}
							aria-describedby={control['aria-describedby']}
							aria-invalid={control['aria-invalid']}
							value={fields.date.value}
							min={today}
							today={today}
							onChange={fields.date.onChange}
							onBlur={fields.date.onBlur}
						/>
					)}
				</Field>

				<div className={styles.time}>
					<div className={styles.times}>
						<Field label='Начало' error={errors.start}>
							{(control, { labelId }) => (
								<Select
									id={control.id}
									ref={fields.start.ref}
									aria-labelledby={labelId}
									aria-describedby={control['aria-describedby']}
									aria-invalid={control['aria-invalid']}
									value={fields.start.value}
									options={startOptions}
									onChange={fields.start.onChange}
									onBlur={fields.start.onBlur}
								/>
							)}
						</Field>
						<span className={styles.dash} aria-hidden='true'>
							—
						</span>
						<Field label='Окончание' error={errors.end}>
							{(control, { labelId }) => (
								<Select
									id={control.id}
									ref={fields.end.ref}
									aria-labelledby={labelId}
									aria-describedby={control['aria-describedby']}
									aria-invalid={control['aria-invalid']}
									value={fields.end.value}
									options={endOptions}
									onChange={fields.end.onChange}
									onBlur={fields.end.onBlur}
								/>
							)}
						</Field>
					</div>

					<div
						className={styles.segmented}
						role='group'
						aria-label='Длительность'
						style={{ '--active': activePreset } as CSSProperties}
					>
						{/* Плашка под активным вариантом — переезжает между пунктами, а не перерисовывается */}
						<span className={styles.thumb} data-hidden={activePreset < 0 || undefined} aria-hidden='true' />
						{state.durationPresets.map(preset => (
							<button
								key={preset.minutes}
								type='button'
								className={styles.preset}
								aria-pressed={preset.pressed}
								disabled={preset.disabled}
								onClick={() => state.setDuration(preset.minutes)}
							>
								{formatDuration(preset.minutes)}
							</button>
						))}
					</div>
				</div>
			</fieldset>

			<Reveal>
				{overlap.length > 0 ? (
					<Alert tone='warning' title='Это время занято'>
						{describeOverlap(overlap)}
					</Alert>
				) : null}
			</Reveal>

			<BusySlots bookings={busy.bookings} status={busy.status} conflictIds={conflictIds} selected={slot} />
		</form>
	)
}
