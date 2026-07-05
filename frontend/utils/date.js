/**
 * Formats a Date object or date string consistently into Indian Standard Time (IST).
 * Format: "Jul 6, 2026, 03:00 AM"
 * 
 * @param {Date|string} dateInput 
 * @returns {string}
 */
export function formatTimestamp(dateInput) {
  if (!dateInput) return "N/A";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "N/A";
  
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
