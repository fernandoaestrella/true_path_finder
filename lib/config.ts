export const APP_CONFIG = {
  // Usage Limits
  DAILY_TIME_LIMIT_MINUTES: 21,
  
  // Event Batching
  MAX_PARTICIPANTS_PER_BATCH: 21,
  BATCH_OVERFLOW_THRESHOLD: 6, // Maximum number of people allowed to "overflow" into a full batch if they would otherwise be alone
  
  // Timer Reset
  TIMER_RESET_HOUR: 3,
  TIMER_RESET_MINUTE: 20,
};
