// Returns YYYY-MM-DD in Europe/Tallinn timezone
export function getTodayEE(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tallinn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA -> YYYY-MM-DD
}
