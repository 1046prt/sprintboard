const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export const formatDate = (value) => (value ? dateFormat.format(new Date(value)) : '');

const units = [
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function timeAgo(value) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}
