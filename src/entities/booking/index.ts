// model
export {
	BOOKING_DURATION_MINUTES,
	BOOKING_TIME_STEP_MINUTES,
	BOOKING_TITLE_MAX_LENGTH,
	WORKING_HOURS
} from './model/constants'
export {
	bookingInputSchema,
	bookingListSchema,
	bookingPatchSchema,
	bookingSchema,
	isoDateSchema,
	timeSchema,
	type Booking,
	type BookingInput,
	type BookingPatch,
	type BookingSlot
} from './model/schema'
export {
	findConflicts,
	isBookingStarted,
	isDateBookable,
	rangesOverlap,
	validateBooking,
	type BookingValidationContext
} from './model/rules'
export { getRoomStatus, type RoomStatus } from './model/room-status'
export {
	getFreeWindows,
	getTimeOptions,
	shiftEndWithStart,
	suggestFreeSlot,
	type FreeWindow,
	type TimeOption,
	type TimeOptionsKind
} from './model/slots'
export {
	describeViolation,
	formatBookingRange,
	formatBookingWhen,
	type BookingViolation,
	type BookingViolationCode,
	type BookingViolationField
} from './model/violations'

// api
export {
	BOOKING_ERROR_CODES,
	BOOKINGS_ENDPOINT,
	getConflictsFromError,
	getViolationsFromError,
	isBookingConflictError,
	isBookingErrorCode,
	type BookingConflictDetails,
	type BookingErrorCode,
	type BookingValidationDetails
} from './api/contract'
export { bookingsApi, createBookingsApi, type BookingsApi } from './api/bookings-api'
export {
	bookingKeys,
	bookingsQueryOptions,
	useBookingsQuery,
	useCreateBookingMutation,
	useDeleteBookingMutation,
	useUpdateBookingMutation,
	type DeleteBookingVariables,
	type UpdateBookingVariables
} from './api/queries'

// ui
export { BookingCard } from './ui/booking-card/booking-card'
