const formatterCache = new Map<string, Intl.DateTimeFormat>();

type TimeZoneParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getFormatter(timeZone: string) {
  const cacheKey = timeZone;
  const existing = formatterCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  formatterCache.set(cacheKey, formatter);
  return formatter;
}

export function getTimeZoneParts(date: Date, timeZone: string): TimeZoneParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
    hour: lookup.hour,
    minute: lookup.minute,
    second: lookup.second,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - date.getTime();
}

export function zonedTimeToUtc(parts: TimeZoneParts, timeZone: string) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  let offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let result = new Date(utcGuess - offset);
  const correctedOffset = getTimeZoneOffsetMs(result, timeZone);

  if (correctedOffset !== offset) {
    offset = correctedOffset;
    result = new Date(utcGuess - offset);
  }

  return result;
}

export function getNextDailyReminderAt(
  timeZone: string,
  hour: number,
  minute: number,
  now = new Date(),
) {
  const parts = getTimeZoneParts(now, timeZone);
  const hasPassed =
    parts.hour > hour || (parts.hour === hour && parts.minute >= minute);
  const dayCarrier = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + (hasPassed ? 1 : 0), 12),
  );

  return zonedTimeToUtc(
    {
      year: dayCarrier.getUTCFullYear(),
      month: dayCarrier.getUTCMonth() + 1,
      day: dayCarrier.getUTCDate(),
      hour,
      minute,
      second: 0,
    },
    timeZone,
  );
}

export function formatDateTimeLocalValue(date: Date) {
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join("T");
}

export function getDefaultReminderDateTimeValue(now = new Date()) {
  const draft = new Date(now.getTime() + 30 * 60 * 1000);
  draft.setSeconds(0, 0);

  const minutes = draft.getMinutes();
  if (minutes !== 0 && minutes !== 30) {
    draft.setMinutes(minutes < 30 ? 30 : 60, 0, 0);
  }

  return formatDateTimeLocalValue(draft);
}

export function parseDateTimeLocalValue(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function getTimeZoneDaySerial(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86400000);
}

export function formatTimeForTimeZone(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}
