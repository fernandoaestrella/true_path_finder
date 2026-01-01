export const formatDuration = (seconds: number): string => {
  const diff = Math.abs(seconds);

  const MINUTE = 60;
  const HOUR = 3600;
  const DAY = 86400;
  const WEEK = 604800;
  const MONTH = 2592000; // 30 days
  const YEAR = 31536000; // 365 days

  const years = Math.floor(diff / YEAR);
  const remainderYear = diff % YEAR;

  const months = Math.floor(remainderYear / MONTH);
  const remainderMonth = remainderYear % MONTH;

  const weeks = Math.floor(remainderMonth / WEEK);
  const remainderWeek = remainderMonth % WEEK;

  const days = Math.floor(remainderWeek / DAY);
  const remainderDay = remainderWeek % DAY;

  const hours = Math.floor(remainderDay / HOUR);
  const remainderHour = remainderDay % HOUR;

  const minutes = Math.floor(remainderHour / MINUTE);
  const remseconds = remainderHour % MINUTE;

  if (years > 0) {
    return `${years}y ${months}mo ${weeks}w`;
  }
  if (months > 0) {
    return `${months}mo ${weeks}w ${days}d`;
  }
  if (weeks > 0) {
    return `${weeks}w ${days}d ${hours}h`;
  }
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  
  // Default: H M S (as originally) or if hours is 0 just M S or S
  if (hours > 0) return `${hours}h ${minutes}m ${remseconds}s`;
  if (minutes > 0) return `${minutes}m ${remseconds}s`;
  return `${remseconds}s`;
};

export const formatEventDate = (date: Date): string => {
  if (!date) return '';
  // Format: "Sat, Dec 30, 2025 at 1:22 PM"
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
};
