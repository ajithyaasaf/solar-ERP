/**
 * Time Utility Helpers for Attendance Management
 * Handles time parsing, comparison, and department timing calculations
 */

interface TimeValue {
    hours: number;
    minutes: number;
}

/**
 * Parse time string in various formats to TimeValue
 * Supports: "6:00 PM", "18:00", "6:00 pm"
 */
export function parseTimeString(timeStr: string): TimeValue {
    // Handle 12-hour format (e.g., "6:00 PM")
    const time12HourMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (time12HourMatch) {
        let hours = parseInt(time12HourMatch[1]);
        const minutes = parseInt(time12HourMatch[2]);
        const period = time12HourMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }

        return { hours, minutes };
    }

    // Handle 24-hour format (e.g., "18:00")
    const time24HourMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (time24HourMatch) {
        return {
            hours: parseInt(time24HourMatch[1]),
            minutes: parseInt(time24HourMatch[2])
        };
    }

    throw new Error(`Unable to parse time format: "${timeStr}"`);
}

/**
 * Add minutes to a TimeValue
 */
export function addMinutes(time: TimeValue, minutesToAdd: number): TimeValue {
    const totalMinutes = time.hours * 60 + time.minutes + minutesToAdd;
    return {
        hours: Math.floor(totalMinutes / 60) % 24,
        minutes: totalMinutes % 60
    };
}

/**
 * Check if time1 is after time2
 */
export function isTimeAfter(time1: TimeValue, time2: TimeValue): boolean {
    if (time1.hours > time2.hours) return true;
    if (time1.hours < time2.hours) return false;
    return time1.minutes > time2.minutes;
}

/**
 * Check if an attendance checkout is overdue based on department timing
 * 
 * @param attendanceDate - The date of the attendance record
 * @param departmentCheckoutTime - Department's standard checkout time (e.g., "6:00 PM")
 * @param gracePeriodMinutes - Grace period after checkout time (default: 30 minutes)
 * @returns true if checkout is overdue, false otherwise
 */
export function isCheckoutOverdue(
    attendanceDate: Date,
    departmentCheckoutTime: string,
    gracePeriodMinutes: number = 30
): boolean {
    const now = new Date();

    // Normalize dates to compare only year/month/day
    const attendanceDateOnly = new Date(attendanceDate);
    attendanceDateOnly.setHours(0, 0, 0, 0);

    const todayDateOnly = new Date();
    todayDateOnly.setHours(0, 0, 0, 0);

    // If record is from previous days, it's always overdue
    if (attendanceDateOnly < todayDateOnly) {
        return true;
    }

    // If record is from a future date, it's not overdue
    if (attendanceDateOnly > todayDateOnly) {
        return false;
    }

    // Record is from today - check if current time > checkout time + grace period
    try {
        const checkoutTime = parseTimeString(departmentCheckoutTime);
        const checkoutWithGrace = addMinutes(checkoutTime, gracePeriodMinutes);

        const currentTime: TimeValue = {
            hours: now.getHours(),
            minutes: now.getMinutes()
        };

        return isTimeAfter(currentTime, checkoutWithGrace);
    } catch (error) {
        console.error('Error parsing department checkout time:', error);
        // If we can't parse the time, assume it's overdue to be safe
        return true;
    }
}
