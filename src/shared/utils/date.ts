export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatMonth(date = new Date()) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}
