// Only reviewed publisher-content routes. Private messages, RSVP, checkout,
// account, legal, error and unknown routes stay outside the advertising document.
const publicAdPages = new Set([
  '/', '/today', '/live', '/plan', '/weather-history', '/how-it-works',
  '/about', '/pricing', '/faq', '/weather-stories',
  '/weather-stories/destination-wedding-weather-disaster',
  '/weather-stories/las-vegas-monsoon-desert-wedding',
  '/weather-stories/burning-man-rain-desert-mud',
  '/weather-stories/windy-cookout-pool-party',
  '/weather-stories/best-weather-window-for-an-event',
]);

export function supportsAdvertising(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return publicAdPages.has(path);
}

export function validAdSlot(value: string | undefined): string | null {
  return value && /^\d+$/.test(value) ? value : null;
}
