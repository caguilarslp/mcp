/**
 * Timezone Utilities for Market Analysis
 * Handles timezone conversion between user local time and UTC
 */

export class TimezoneManager {
  private userTimezone: string;

  constructor(timezone: string = 'America/Mexico_City') {
    this.userTimezone = timezone;
  }

  /**
   * Convert user local time to UTC for API calls
   */
  userToUTC(localTimeStr: string): Date {
    // Parse as if it's in user's timezone
    const localDate = new Date(localTimeStr + ' ' + this.userTimezone);
    return new Date(localDate.toISOString());
  }

  /**
   * Convert UTC timestamp to user's local time for display
   */
  utcToUser(utcDate: Date | string): string {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    return date.toLocaleString('es-MX', {
      timeZone: this.userTimezone,
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Get current time in user's timezone
   */
  getUserNow(): string {
    return this.utcToUser(new Date());
  }

  /**
   * Calculate "X days ago" in user's timezone context
   */
  getDaysAgo(days: number, hour: number = 12): {
    userTime: string;
    utcTime: Date;
    context: string;
  } {
    const now = new Date();
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: this.userTimezone }));
    
    const targetDate = new Date(userNow);
    targetDate.setDate(targetDate.getDate() - days);
    targetDate.setHours(hour, 0, 0, 0);
    
    // Convert back to UTC for API calls
    const utcTarget = new Date(targetDate.toLocaleString('en-US', { timeZone: 'UTC' }));
    
    return {
      userTime: this.utcToUser(targetDate),
      utcTime: utcTarget,
      context: this.getTradingSessionContext(utcTarget)
    };
  }

  /**
   * Determine which trading session is active
   */
  private getTradingSessionContext(utcTime: Date): string {
    const hour = utcTime.getUTCHours();
    
    // Trading sessions in UTC
    if (hour >= 0 && hour < 9) return 'asia_session';
    if (hour >= 8 && hour < 17) return 'london_session'; 
    if (hour >= 13 && hour < 22) return 'ny_session';
    if (hour >= 8 && hour < 13) return 'london_ny_overlap';
    return 'off_hours';
  }

  /**
   * Format timestamp for consistent display
   */
  formatForDisplay(utcTimestamp: string): string {
    const utcDate = new Date(utcTimestamp);
    const userTime = this.utcToUser(utcDate);
    const session = this.getTradingSessionContext(utcDate);
    
    return `${userTime} (${session})`;
  }

  /**
   * Get timezone info for debugging
   */
  getTimezoneInfo(): {
    userTimezone: string;
    currentOffset: string;
    utcNow: string;
    userNow: string;
  } {
    const now = new Date();
    const userNow = this.utcToUser(now);
    const offset = now.getTimezoneOffset() / 60;
    
    return {
      userTimezone: this.userTimezone,
      currentOffset: `UTC${offset > 0 ? '-' : '+'}${Math.abs(offset)}`,
      utcNow: now.toISOString(),
      userNow
    };
  }
}

// Export default instance for Mexico timezone
export const mexicoTimezone = new TimezoneManager('America/Mexico_City');