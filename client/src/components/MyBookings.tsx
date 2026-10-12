import type { Booking } from '../api'
import { formatDateTime, formatTime } from '../time'

interface Props {
  bookings: Booking[]
  timezone: string
  onCancel: (id: number) => void
}

export default function MyBookings({ bookings, timezone, onCancel }: Props) {
  return (
    <section className="rounded-lg bg-white p-5 shadow">
      <h2 className="mb-4 text-lg font-semibold">My bookings</h2>
      {bookings.length === 0 && <p className="text-sm text-gray-500">No bookings yet.</p>}
      <ul className="divide-y divide-gray-100">
        {bookings.map((booking) => (
          <li key={booking.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <div>
              <p className="font-medium">{booking.resource?.name}</p>
              <p>
                {formatDateTime(booking.startTime, timezone)} – {formatTime(booking.endTime, timezone)}
              </p>
              {booking.resource && (
                <p className="text-xs text-gray-500">
                  Resource time: {formatDateTime(booking.startTime, booking.resource.timezone)} ({booking.resource.timezone})
                </p>
              )}
            </div>
            <button type="button" onClick={() => onCancel(booking.id)} className="text-red-600 hover:underline">
              Cancel
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
