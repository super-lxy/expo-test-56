export function formatTime(dateString: string) {
  const date = new Date(dateString);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}


export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatMonth(date = new Date()) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function formatDateTime(date: Date | string) {
  const value = typeof date === 'string' ? new Date(date) : date;
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${value.getMonth() + 1}月${value.getDate()}日 ${hours}:${minutes}`;
}

export function formatDayGroup(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayOffset = Math.round((startOfToday - startOfDate) / 86400000);
  if (dayOffset === 0) return '今天';
  if (dayOffset === 1) return '昨天';
  const weekday = `星期${'日一二三四五六'[date.getDay()]}`;
  return `${date.getMonth() + 1}月${date.getDate()}日  ${weekday}`;
}

export function dateKey(dateString: string) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
