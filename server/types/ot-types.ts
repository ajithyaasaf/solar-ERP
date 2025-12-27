/**
 * OT Session Interface
 * Represents a single overtime session within a day
 * Multiple sessions can exist per attendance record
 */
export interface OTSession {
    // Identity
    sessionId: string;                    // Unique ID: "ot_20251217_user123_001"
    sessionNumber: number;                // Sequential: 1, 2, 3...

    // Session details
    otType: 'early_arrival' | 'late_departure' | 'weekend' | 'holiday';
    startTime: Date;
    endTime?: Date;
    otHours: number;

    // Evidence & location
    startImageUrl: string;
    endImageUrl?: string;
    startLatitude: string;
    startLongitude: string;
    endLatitude?: string;
    endLongitude?: string;
    startAddress?: string;
    endAddress?: string;

    // Metadata
    reason: string;
    employeeId: string;

    // Status
    status: 'in_progress' | 'completed' | 'locked';

    // Timestamps
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Holiday Interface
 * Company holiday calendar for OT rate calculation
 */
export interface Holiday {
    id: string;
    date: Date;
    name: string;
    type: 'national' | 'state' | 'company' | 'optional';

    // OT rate multiplier (MUST be configured by admin - no default)
    otRateMultiplier: number;

    // Applicability
    isActive: boolean;
    applicableDepartments?: string[];  // undefined = all departments

    // Metadata
    notes?: string;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Company Settings Interface
 * Singleton - company-wide OT configuration
 */
export interface CompanySettings {
    id: '1';  // Always '1' (singleton)

    // Weekend configuration (configurable, not hardcoded)
    weekendDays: number[];  // [0] = Sunday only, [0, 6] = Sat+Sun, etc.

    // Default OT rates
    defaultOTRate: number;     // e.g., 1.0x
    weekendOTRate: number;     // e.g., 1.0x

    // Daily OT cap
    maxOTHoursPerDay: number;

    // Metadata
    updatedBy?: string;
    updatedAt: Date;
}

/**
 * Payroll Period Interface
 * For locking payroll periods to prevent retroactive changes
 */
export interface PayrollPeriod {
    id: string;
    month: number;                        // 1-12
    year: number;

    // Lock status
    status: 'open' | 'locked' | 'processed';

    // Lock metadata
    lockedAt?: Date;
    lockedBy?: string;  // Master admin only
}

/**
 * OT Session Request Interfaces
 */
export interface StartOTSessionRequest {
    userId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    imageUrl: string;
    address?: string;
    reason?: string;
}

export interface EndOTSessionRequest {
    userId: string;
    sessionId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    imageUrl: string;
    address?: string;
    reason?: string;
}

/**
 * OT Session Response Interfaces
 */
export interface StartOTSessionResponse {
    success: boolean;
    message: string;
    sessionId?: string;
    otType?: string;
    startTime?: Date;
}

export interface EndOTSessionResponse {
    success: boolean;
    message: string;
    otHours?: number;
    totalOTToday?: number;
    exceedsDailyLimit?: boolean;
}

/**
 * Extended Attendance Interface
 * Adds OT sessions array to existing attendance
 */
export interface AttendanceWithOTSessions extends Omit<Attendance, 'overtimeHours'> {
    otSessions: OTSession[];
    totalOTHours: number;

    // Keep legacy fields for backward compatibility (marked as deprecated)
    /** @deprecated Use otSessions array instead */
    otStartTime?: Date;
    /** @deprecated Use otSessions array instead */
    otEndTime?: Date;
    /** @deprecated Use totalOTHours instead */
    overtimeHours?: number;
}
