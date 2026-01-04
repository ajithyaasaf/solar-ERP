/**
 * Manual Overtime Service
 * Handles user-controlled OT sessions with photo and location evidence
 */

import { storage } from '../storage';
import { EnterpriseTimeService } from './enterprise-time-service';
import { PayrollLockService } from './payroll-lock-service';
import { getUTCMidnight } from '../utils/timezone-helpers';

export interface OTStartRequest {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  imageUrl: string;
  address?: string;
  reason?: string;
  deviceInfo?: {
    type: 'mobile' | 'tablet' | 'desktop';
    userAgent?: string;
    locationCapability: 'excellent' | 'good' | 'limited' | 'poor';
  };
}

export interface OTEndRequest {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  imageUrl: string;
  address?: string;
  reason?: string;
}

export interface OTStartResponse {
  success: boolean;
  message: string;
  otSessionId?: string;
  otType: 'early_arrival' | 'late_departure' | 'weekend' | 'holiday';
  startTime: string;
  expectedEndTime?: string;
}

export interface OTEndResponse {
  success: boolean;
  message: string;
  otHours: number;
  totalWorkingHours: number;
  startTime: string;
  endTime: string;
}

export class ManualOTService {
  // NOTE: Caching is now handled by EnterpriseTimeService
  // This service was updated to use EnterpriseTimeService for consistency


  /**
   * Start manual OT session
   */
  static async startOTSession(request: OTStartRequest): Promise<OTStartResponse> {
    try {
      // Validate user exists
      const user = await storage.getUser(request.userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          otType: 'late_departure',
          startTime: new Date().toISOString()
        };
      }

      // Check if user has department assigned
      if (!user.department) {
        return {
          success: false,
          message: 'Department not assigned. Contact administrator.',
          otType: 'late_departure',
          startTime: new Date().toISOString()
        };
      }

      // Get today's attendance record (UTC-safe)
      const today = getUTCMidnight(new Date());

      // Security Check: Verify payroll period is not locked
      if (await PayrollLockService.isPeriodLocked(today)) {
        return {
          success: false,
          message: 'Payroll period is locked. Cannot start OT.',
          otType: 'late_departure', // Default fallback
          startTime: new Date().toISOString()
        };
      }

      console.log('MANUAL OT SERVICE: Looking for attendance record for date:', today.toISOString().split('T')[0]);
      let todayAttendance = await storage.getAttendanceByUserAndDate(request.userId, today);
      console.log('MANUAL OT SERVICE: Found attendance record:', todayAttendance ? 'YES' : 'NO');

      // If no attendance record exists, create one for OT
      if (!todayAttendance) {
        const otType = await this.determineOTType(user.department, new Date());
        const newAttendanceData = {
          userId: request.userId,
          date: today,
          attendanceType: 'office' as const,
          status: 'present' as const,
          isLate: false,
          isWithinOfficeRadius: true,
          otStatus: 'in_progress' as const,
          isManualOT: true,
          autoCorrected: false,
          otStartTime: new Date(),
          otStartLatitude: request.latitude.toString(),
          otStartLongitude: request.longitude.toString(),
          otStartImageUrl: request.imageUrl,
          otStartAddress: request.address,
          otReason: request.reason,
          otType,
        };

        todayAttendance = await storage.createAttendance(newAttendanceData);
      } else {
        // Update existing attendance record with OT start
        const otType = await this.determineOTType(user.department, new Date());
        const updateData = {
          otStatus: 'in_progress' as const,
          isManualOT: true,
          otStartTime: new Date(),
          otStartLatitude: request.latitude.toString(),
          otStartLongitude: request.longitude.toString(),
          otStartImageUrl: request.imageUrl,
          otStartAddress: request.address,
          otReason: request.reason,
          otType,
        };

        todayAttendance = await storage.updateAttendance(todayAttendance.id, updateData);
      }

      const otType = await this.determineOTType(user.department, new Date());

      return {
        success: true,
        message: `OT session started successfully (${otType})`,
        otSessionId: todayAttendance.id,
        otType,
        startTime: new Date().toISOString(),
      };

    } catch (error) {
      console.error('MANUAL OT SERVICE ERROR:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId: request.userId
      });
      return {
        success: false,
        message: 'Failed to start OT session. Please try again.',
        otType: 'late_departure',
        startTime: new Date().toISOString()
      };
    }
  }

  /**
   * End manual OT session
   */
  static async endOTSession(request: OTEndRequest): Promise<OTEndResponse> {
    try {
      // Get today's attendance record
      // Get today (UTC-safe)
      const today = getUTCMidnight(new Date());

      // Security Check: Verify payroll period is not locked
      if (await PayrollLockService.isPeriodLocked(today)) {
        return {
          success: false,
          message: 'Payroll period is locked. Cannot end OT.',
          otHours: 0,
          totalWorkingHours: 0,
          startTime: '',
          endTime: ''
        };
      }

      const todayAttendance = await storage.getAttendanceByUserAndDate(request.userId, today);

      if (!todayAttendance) {
        return {
          success: false,
          message: 'No attendance record found for today',
          otHours: 0,
          totalWorkingHours: 0,
          startTime: '',
          endTime: ''
        };
      }

      if (todayAttendance.otStatus !== 'in_progress') {
        return {
          success: false,
          message: 'No active OT session found',
          otHours: 0,
          totalWorkingHours: 0,
          startTime: '',
          endTime: ''
        };
      }

      if (!todayAttendance.otStartTime) {
        return {
          success: false,
          message: 'OT start time not found',
          otHours: 0,
          totalWorkingHours: 0,
          startTime: '',
          endTime: ''
        };
      }

      const otEndTime = new Date();
      const otStartTime = todayAttendance.otStartTime ? new Date(todayAttendance.otStartTime) : null;

      // Validate that otStartTime is a valid date
      if (!otStartTime || isNaN(otStartTime.getTime())) {
        console.error('MANUAL OT SERVICE: Invalid otStartTime:', todayAttendance.otStartTime);
        return {
          success: false,
          message: 'Invalid OT start time. Please try again or contact support.',
          otHours: 0,
          totalWorkingHours: 0,
          startTime: '',
          endTime: ''
        };
      }

      // Calculate OT hours
      const otDurationMs = otEndTime.getTime() - otStartTime.getTime();
      const otHours = Number((otDurationMs / (1000 * 60 * 60)).toFixed(2));

      // Update attendance record with OT end
      const updateData: any = {
        otStatus: 'completed' as const,
        otEndTime,
        otEndLatitude: request.latitude.toString(),
        otEndLongitude: request.longitude.toString(),
        otEndImageUrl: request.imageUrl,
        otEndAddress: request.address,
        manualOTHours: otHours,
        overtimeHours: otHours, // Update the legacy field for compatibility
      };

      // IMPORTANT: Only set checkOutTime if it doesn't already exist
      // This preserves the original checkout data if user did regular checkout before starting OT
      // But also marks attendance complete if they went directly to OT without regular checkout
      if (!todayAttendance.checkOutTime) {
        updateData.checkOutTime = otEndTime;
        updateData.checkOutLatitude = request.latitude.toString();
        updateData.checkOutLongitude = request.longitude.toString();
        updateData.checkOutImageUrl = request.imageUrl;
        updateData.checkOutAddress = request.address;
      }

      // Calculate total working hours AFTER setting checkout time
      // This ensures accurate calculation whether user did regular checkout or not
      let regularHours = 0;
      if (todayAttendance.checkInTime) {
        const effectiveCheckOutTime = todayAttendance.checkOutTime
          ? new Date(todayAttendance.checkOutTime)
          : otEndTime;
        const regularDurationMs = effectiveCheckOutTime.getTime() - new Date(todayAttendance.checkInTime).getTime();
        regularHours = regularDurationMs / (1000 * 60 * 60);
      }

      const totalWorkingHours = Number(regularHours.toFixed(2));
      updateData.workingHours = totalWorkingHours;

      await storage.updateAttendance(todayAttendance.id, updateData);

      return {
        success: true,
        message: `OT session completed. ${otHours} hours of overtime recorded.`,
        otHours,
        totalWorkingHours,
        startTime: otStartTime.toISOString(),
        endTime: otEndTime.toISOString(),
      };

    } catch (error) {
      console.error('Error ending OT session:', error);
      return {
        success: false,
        message: 'Failed to end OT session. Please try again.',
        otHours: 0,
        totalWorkingHours: 0,
        startTime: '',
        endTime: ''
      };
    }
  }

  /**
   * Get current OT status for user
   */
  static async getOTStatus(userId: string) {
    try {
      // Get today's attendance (UTC-safe)
      const today = getUTCMidnight(new Date());

      const todayAttendance = await storage.getAttendanceByUserAndDate(userId, today);

      if (!todayAttendance) {
        return {
          hasActiveOT: false,
          otStatus: 'not_started',
          canStartOT: true,
          canEndOT: false
        };
      }

      const hasActiveOT = todayAttendance.otStatus === 'in_progress';
      const canStartOT = todayAttendance.otStatus === 'not_started' || todayAttendance.otStatus === 'completed';
      const canEndOT = todayAttendance.otStatus === 'in_progress';

      return {
        hasActiveOT,
        otStatus: todayAttendance.otStatus || 'not_started',
        canStartOT,
        canEndOT,
        otStartTime: todayAttendance.otStartTime,
        otType: todayAttendance.otType,
        currentOTHours: todayAttendance.otStartTime
          ? Number(((new Date().getTime() - new Date(todayAttendance.otStartTime).getTime()) / (1000 * 60 * 60)).toFixed(2))
          : 0
      };

    } catch (error) {
      console.error('Error getting OT status:', error);
      return {
        hasActiveOT: false,
        otStatus: 'not_started',
        canStartOT: true,
        canEndOT: false
      };
    }
  }

  /**
   * Determine OT type based on current time and department timing
   * Unified method used by all services
   */
  public static async determineOTType(department: string, currentTime: Date): Promise<'early_arrival' | 'late_departure' | 'weekend' | 'holiday'> {
    try {
      // 1. Check if it's a company holiday (Priority 1)
      const { UnifiedAttendanceService } = await import('./unified-attendance-service');
      const { isHoliday } = await UnifiedAttendanceService.isHoliday(currentTime, department);
      if (isHoliday) {
        return 'holiday';
      }

      // 2. Check if weekend (Priority 2)
      const { CompanySettingsService } = await import('./company-settings-service');
      const isWeekend = await CompanySettingsService.isWeekend(currentTime);
      if (isWeekend) {
        return 'weekend';
      }

      // Use EnterpriseTimeService for consistent timing operations
      const { EnterpriseTimeService } = await import('./enterprise-time-service');
      const departmentTiming = await EnterpriseTimeService.getDepartmentTiming(department);

      if (!departmentTiming || !departmentTiming.isActive) {
        return 'late_departure'; // Default if no timing configured
      }

      // Parse department timing using EnterpriseTimeService
      const deptStartTime = EnterpriseTimeService.parseTimeToDate(
        departmentTiming.checkInTime,
        currentTime
      );
      const deptEndTime = EnterpriseTimeService.parseTimeToDate(
        departmentTiming.checkOutTime,
        currentTime
      );

      if (!deptStartTime || !deptEndTime) {
        return 'late_departure';
      }

      // Determine OT type based on current time vs department timing
      if (currentTime < deptStartTime) {
        return 'early_arrival';
      } else if (currentTime > deptEndTime) {
        return 'late_departure';
      } else {
        // During regular hours - shouldn't happen but default to late_departure
        return 'late_departure';
      }

    } catch (error) {
      console.error('Error determining OT type:', error);
      return 'late_departure';
    }
  }

  /**
   * Check if OT button should be available based on department timing
   * SECURITY: Fail-safe design - disables button on any error/missing data
   */
  static async isOTButtonAvailable(userId: string): Promise<{
    available: boolean;
    reason?: string;
    nextAvailableTime?: string;
  }> {
    try {
      // Validate user and department
      const user = await storage.getUser(userId);
      if (!user || !user.department) {
        console.warn('[OT-AVAILABILITY] User missing or no department assigned:', {
          userId,
          hasUser: !!user,
          hasDept: !!user?.department
        });
        return {
          available: false,
          reason: 'Department not assigned. Please contact administrator.'
        };
      }

      const currentTime = new Date();
      const dayOfWeek = currentTime.getDay();

      // ✅ CONFIGURABLE WEEKEND: Use CompanySettingsService for weekend detection
      const { CompanySettingsService } = await import('./company-settings-service');
      const isWeekend = await CompanySettingsService.isWeekend(currentTime);

      if (isWeekend) {
        console.log('[OT-AVAILABILITY] Weekend detected - OT available');
        return { available: true };
      }

      // 🛡️ CRITICAL: Check if today is a company holiday
      const { UnifiedAttendanceService } = await import('./unified-attendance-service');
      const { isHoliday, holiday } = await UnifiedAttendanceService.isHoliday(
        currentTime,
        user.department
      );

      if (isHoliday) {
        // Check if OT is allowed on this specific holiday
        if (!holiday || !holiday.allowOT) {
          console.log('[OT-AVAILABILITY] Holiday detected - OT NOT allowed:', holiday?.name);
          return {
            available: false,
            reason: `OT is not allowed on ${holiday?.name}. This is a company holiday.`
          };
        }
        // Holiday allows OT - continue to normal OT availability checks
        console.log('[OT-AVAILABILITY] Holiday detected - OT allowed:', holiday.name);
        // Note: Will still need to check department timing for early/late classification
      }

      // CRITICAL FIX: Use EnterpriseTimeService for consistent timing
      // This service provides default timings if not configured and handles all edge cases
      const { EnterpriseTimeService } = await import('./enterprise-time-service');
      const departmentTiming = await EnterpriseTimeService.getDepartmentTiming(user.department);

      // FAIL-SAFE: If timing is not active, disable button
      if (!departmentTiming || !departmentTiming.isActive) {
        console.warn('[OT-AVAILABILITY] Department timing not configured or inactive:', {
          dept: user.department,
          isActive: departmentTiming?.isActive,
          hasTiming: !!departmentTiming
        });
        return {
          available: false,
          reason: 'Department timing not configured. Please contact administrator.'
        };
      }

      // Parse department start and end times using EnterpriseTimeService
      const deptStartTime = EnterpriseTimeService.parseTimeToDate(
        departmentTiming.checkInTime,
        currentTime
      );
      const deptEndTime = EnterpriseTimeService.parseTimeToDate(
        departmentTiming.checkOutTime,
        currentTime
      );

      // FAIL-SAFE: If time parsing fails, disable button
      if (!deptStartTime || !deptEndTime) {
        console.error('[OT-AVAILABILITY] Time parsing failed:', {
          dept: user.department,
          checkInTime: departmentTiming.checkInTime,
          checkOutTime: departmentTiming.checkOutTime,
          parsedStart: deptStartTime,
          parsedEnd: deptEndTime
        });
        return {
          available: false,
          reason: 'Invalid department timing configuration. Please contact administrator.'
        };
      }

      // Debug logging for troubleshooting
      console.log('[OT-AVAILABILITY] Time check:', {
        userId,
        dept: user.department,
        currentTime: currentTime.toISOString(),
        deptStart: deptStartTime.toISOString(),
        deptEnd: deptEndTime.toISOString(),
        isBeforeStart: currentTime < deptStartTime,
        isAfterEnd: currentTime > deptEndTime
      });

      // Determine OT scenario
      const isEarlyArrival = currentTime < deptStartTime;
      const isLateDeparture = currentTime > deptEndTime;

      // ✅ SMART ATTENDANCE CHECK: OT-type aware
      // Early arrival: Employee CANNOT check in yet (before work hours)
      //   → Allow OT without attendance (will auto-create)
      // Late departure: Employee SHOULD have checked in already
      //   → Require attendance to prevent abuse
      const today = getUTCMidnight(new Date());
      const attendance = await storage.getAttendanceByUserAndDate(userId, today);

      if (!attendance && isLateDeparture) {
        console.log('[OT-AVAILABILITY] Late departure requires attendance - OT NOT available');
        return {
          available: false,
          reason: 'Please check in first before starting late departure OT.'
        };
      }

      // Early arrival OT (before work hours)
      if (isEarlyArrival) {
        console.log('[OT-AVAILABILITY] Early arrival - OT available', attendance ? '(has attendance)' : '(will auto-create)');
        return { available: true };
      }

      // Late departure OT (after work hours) - attendance already validated above
      if (isLateDeparture) {
        console.log('[OT-AVAILABILITY] Late departure with attendance - OT available');
        return { available: true };
      }

      // NOT AVAILABLE: During regular department hours
      console.log('[OT-AVAILABILITY] During work hours - OT NOT available');
      return {
        available: false,
        reason: `OT is only available before ${departmentTiming.checkInTime} or after ${departmentTiming.checkOutTime}`,
        nextAvailableTime: departmentTiming.checkOutTime
      };

    } catch (error) {
      // FAIL-SAFE: On ANY error, disable button and log details for debugging
      console.error('[OT-AVAILABILITY] Critical error - DISABLING button for security:', error);
      console.error('[OT-AVAILABILITY] Error details:', {
        userId,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        available: false,
        reason: 'System error checking OT availability. Please contact support if this persists.'
      };
    }
  }
}