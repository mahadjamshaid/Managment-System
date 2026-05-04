// Centralized timezone configuration
export const TIMEZONE = "Asia/Karachi"; // UTC+05:00

/**
 * Returns today's date formatted as YYYY-MM-DD in the configured timezone.
 * Useful for consistent database querying across server and client timezones.
 */
export const getTodayDateString = (): string => {
    return new Intl.DateTimeFormat('en-CA', { 
        timeZone: TIMEZONE, 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    }).format(new Date());
};
