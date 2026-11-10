function validTime(hour: number, minute: number) {
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60;
}

export function timeInputFromWindowStart(value = "") {
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return validTime(hour, minute) ? `${match[1]}:${match[2]}` : "";
}

export function timeInputFromWindowLabel(value = "") {
  const match = value.match(/(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = Number(match[2] || "0");
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return "";
  if (match[3].toUpperCase() === "AM") hour = hour === 12 ? 0 : hour;
  else hour = hour === 12 ? 12 : hour + 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function recommendedStartTime(windowStart = "", windowLabel = "") {
  return timeInputFromWindowStart(windowStart) || timeInputFromWindowLabel(windowLabel);
}
