/**
 * Manual Overtime Service
 * Handles user-controlled OT sessions with photo and location evidence
 */

import { storage } from '../storage';
import { CloudinaryService } from './cloudinary-service';

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

      // Get today's attendance record
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
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
      const otStartTime = new Date(todayAttendance.otStartTime);
      
      // Calculate OT hours
      const otDurationMs = otEndTime.getTime() - otStartTime.getTime();
      const otHours = Number((otDurationMs / (1000 * 60 * 60)).toFixed(2));

      // Calculate total working hours (regular + OT)
      let regularHours = 0;
      if (todayAttendance.checkInTime && todayAttendance.checkOutTime) {
        const regularDurationMs = new Date(todayAttendance.checkOutTime).getTime() - new Date(todayAttendance.checkInTime).getTime();
        regularHours = regularDurationMs / (1000 * 60 * 60);
      }

      const totalWorkingHours = Number((regularHours + otHours).toFixed(2));

      // Update attendance record with OT end
      const updateData = {
        otStatus: 'completed' as const,
        otEndTime,
        otEndLatitude: request.latitude.toString(),
        otEndLongitude: request.longitude.toString(),
        otEndImageUrl: request.imageUrl,
        otEndAddress: request.address,
        manualOTHours: otHours,
        overtimeHours: otHours, // Update the legacy field for compatibility
        workingHours: totalWorkingHours,
      };

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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
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
   */
  private static async determineOTType(department: string, currentTime: Date): Promise<'early_arrival' | 'late_departure' | 'weekend' | 'holiday'> {
    try {
      // Check if weekend (Sunday only)
      const dayOfWeek = currentTime.getDay();
      if (dayOfWeek === 0) { // Sunday only
        return 'weekend';
      }

      // Get department timing
      const departmentTiming = await storage.getDepartmentTiming(department);
      if (!departmentTiming) {
        return 'late_departure'; // Default if no timing configured
      }

      // Parse department timing
      const { checkInTime, checkOutTime } = departmentTiming;
      const deptStartTime = this.parseTime12Hour(checkInTime, currentTime);
      const deptEndTime = this.parseTime12Hour(checkOutTime, currentTime);

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
   * Parse 12-hour time format to Date object in IST timezone
   */
  private static parseTime12Hour(timeStr: string, referenceDate: Date): Date | null {
    try {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return null;

      const [, hourStr, minuteStr, period] = match;
      let hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);

      // Convert to 24-hour format
      if (period.toUpperCase() === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
      }

      // Create date in IST timezone (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 hours in milliseconds
      const result = new Date(referenceDate);
      
      // Set the time in IST and then convert to UTC
      result.setUTCFullYear(referenceDate.getUTCFullYear());
      result.setUTCMonth(referenceDate.getUTCMonth());
      result.setUTCDate(referenceDate.getUTCDate());
      result.setUTCHours(hour, minute, 0, 0);
      
      // Convert IST to UTC by subtracting the offset
      const utcTime = new Date(result.getTime() - istOffset);
      
      // Debug logging removed for production
      
      return utcTime;
    } catch (error) {
      console.error('Error parsing time:', error);
      return null;
    }
  }

  /**
   * Check if OT button should be available based on department timing
   */
  static async isOTButtonAvailable(userId: string): Promise<{
    available: boolean;
    reason?: string;
    nextAvailableTime?: string;
  }> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.department) {
        return {
          available: false,
          reason: 'Department not assigned'
        };
      }

      const currentTime = new Date();
      const dayOfWeek = currentTime.getDay();

      // Always available on weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return { available: true };
      }

      // Get department timing
      const departmentTiming = await storage.getDepartmentTiming(user.department);
      if (!departmentTiming) {
        return { available: true }; // If no timing configured, allow OT
      }

      const { checkInTime, checkOutTime } = departmentTiming;
      const deptStartTime = this.parseTime12Hour(checkInTime, currentTime);
      const deptEndTime = this.parseTime12Hour(checkOutTime, currentTime);

      if (!deptStartTime || !deptEndTime) {
        return { available: true };
      }

      // Available before department start time (early arrival OT)
      if (currentTime < deptStartTime) {
        return { available: true };
      }

      // Available after department end time (late departure OT)
      
      if (currentTime > deptEndTime) {
        return { available: true };
      }

      // Not available during regular department hours  
      // Use the original checkout time string instead of converting timezones
      const availableAfterTime = checkOutTime;

      // Debug logging removed for production

      return {
        available: false,
        reason: 'OT not available during regular work hours',
        nextAvailableTime: availableAfterTime
      };

    } catch (error) {
      console.error('Error checking OT availability:', error);
      return { available: true }; // Default to available on error
    }
  }
}