export function weatherScoreCaption(source: string, score: number | null, dataIncomplete: boolean) {
  if (dataIncomplete) return "Hourly details missing";
  if (source !== "almanac") return "out of 100";
  return score === null ? "Not scored · historical data" : "Historical fit · out of 100";
}
