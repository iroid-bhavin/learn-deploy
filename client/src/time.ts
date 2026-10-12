export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export const allTimezones = (): string[] => {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
  const zones = supported ? supported('timeZone') : [browserTimezone()]
  return zones.includes('UTC') ? zones : ['UTC', ...zones]
}

export const formatTime = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))

export const formatDateTime = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))

// Short calendar day, e.g. "Tue, 13 Oct".
export const formatDay = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))

// UTC offset of an instant in the given timezone, e.g. "GMT+1".
export const formatOffset = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(new Date(iso))
    .find((part) => part.type === 'timeZoneName')?.value ?? ''

// UTC offset of an instant, e.g. "UTC+1", "UTC-4", "UTC+5:30", "UTC+0".
export const formatUtcOffset = (iso: string, timeZone: string) => {
  const offset = formatOffset(iso, timeZone) // "GMT+1", or "GMT" for zero
  return offset === 'GMT' ? 'UTC+0' : offset.replace('GMT', 'UTC')
}

// Offset label shown next to a time, e.g. "(UTC+1)".
export const formatZone = (iso: string, timeZone: string) => `(${formatUtcOffset(iso, timeZone)})`

export const formatSlotRange = (startIso: string, endIso: string, timeZone: string, showZone = false) => {
  const start = formatTime(startIso, timeZone)
  const end = formatTime(endIso, timeZone)

  if (formatOffset(startIso, timeZone) !== formatOffset(endIso, timeZone)) {
    return `${start} ${formatZone(startIso, timeZone)} → ${end} ${formatZone(endIso, timeZone)}`
  }

  return showZone ? `${start}-${end} ${formatZone(startIso, timeZone)}` : `${start}-${end}`
}

// Offset from UTC in minutes, e.g. 60 for "GMT+1", -270 for "GMT-4:30".
const offsetMinutes = (iso: string, timeZone: string) => {
  const match = formatOffset(iso, timeZone).match(/GMT([+-])(\d+)(?::(\d+))?/)
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0)
  return match[1] === '-' ? -minutes : minutes
}

const describeMinutes = (minutes: number) =>
  minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}` : `${minutes} minutes`

interface SlotTimes {
  startTime: string
  endTime: string
}

// Explains a slot whose local times look odd because of a daylight-saving change in `timeZone`;
// null for ordinary slots. `slots` is the full list for the day (to spot repeated local times).
export const dstNote = (slot: SlotTimes, slots: SlotTimes[], timeZone: string): string | null => {
  const length = (Date.parse(slot.endTime) - Date.parse(slot.startTime)) / 60_000
  const startOffset = offsetMinutes(slot.startTime, timeZone)
  const endOffset = offsetMinutes(slot.endTime, timeZone)

  if (startOffset !== endOffset) {
    const shift = describeMinutes(Math.abs(endOffset - startOffset))
    const change = `${formatUtcOffset(slot.startTime, timeZone)} → ${formatUtcOffset(slot.endTime, timeZone)}`

    return endOffset > startOffset
      ? `Daylight saving time starts in ${timeZone}: clocks jump forward ${shift} during this slot (${change}). ` +
          `It is still a normal ${length}-minute slot; the skipped local times don't exist on this day.`
      : `Daylight saving time ends in ${timeZone}: clocks go back ${shift} during this slot (${change}). ` +
          `The end time looks earlier than the start, but it is still a normal ${length}-minute slot.`
  }

  const start = formatTime(slot.startTime, timeZone)
  const sameStart = slots.filter((other) => formatTime(other.startTime, timeZone) === start)

  if (sameStart.length > 1) {
    const which = sameStart.findIndex((other) => other.startTime === slot.startTime) === 0 ? 'first' : 'second'

    return (
      `Clocks go back in ${timeZone} on this day, so ${start} local time happens twice. ` +
      `This is the ${which} one (${formatUtcOffset(slot.startTime, timeZone)}). ` +
      `Both are separate ${length}-minute slots and can be booked independently.`
    )
  }

  return null
}

// Calendar date (YYYY-MM-DD) of an instant in the given timezone.
export const dateIn = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso),
  )

export const todayIn = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
