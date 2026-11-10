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
  const range = value.match(/(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i);
  if (range) {
    const startHour = Number(range[1]);
    const startMinute = Number(range[2] || "0");
    const endHour = Number(range[4]);
    const endMinute = Number(range[5] || "0");
    let startMeridiem = range[3]?.toUpperCase();
    const endMeridiem = range[6].toUpperCase();
    if (!validClockTime(startHour, startMinute) || !validClockTime(endHour, endMinute)) return "";
    if (!startMeridiem) {
      startMeridiem = endMeridiem;
      const sameMeridiemStart = to24Hour(startHour, startMeridiem);
      const end = to24Hour(endHour, endMeridiem);
      if (sameMeridiemStart * 60 + startMinute > end * 60 + endMinute) startMeridiem = endMeridiem === "AM" ? "PM" : "AM";
    }
    return formatTimeInput(to24Hour(startHour, startMeridiem), startMinute);
  }

  const match = value.match(/(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2] || "0");
  if (!validClockTime(hour, minute)) return "";
  return formatTimeInput(to24Hour(hour, match[3].toUpperCase()), minute);
}

function validClockTime(hour: number, minute: number) {
  return hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59;
}

function to24Hour(hour: number, meridiem: string) {
  if (meridiem === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function formatTimeInput(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function recommendedStartTime(windowStart = "", windowLabel = "") {
  return timeInputFromWindowStart(windowStart) || timeInputFromWindowLabel(windowLabel);
}
