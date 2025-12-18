/**
 * Unified Enterprise Attendance Service
 * Single source of truth for all attendance operations with advanced location validation
 */

import { storage } from '../storage';
import { EnterpriseLocationService, LocationRequest, LocationValidationResult } from './enterprise-location-service';
import { CloudinaryService } from './cloudinary-service';

export interface AttendanceCheckInRequest {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  attendanceType: 'office' | 'remote' | 'field_work';
  reason?: string;
  customerName?: string;
  imageUrl?: string;
  deviceInfo?: {
    type: 'mobile' | 'tablet' | 'desktop';
    userAgent?: string;
    locationCapability: 'excellent' | 'good' | 'limited' | 'poor';
  };
}

export interface AttendanceCheckInResponse {
  success: boolean;
  attendanceId?: string;
  message: string;
  locationValidation: LocationValidationResult;
  attendanceDetails?: {
    isLate: boolean;
    lateMinutes: number;
    expectedCheckInTime: string;
    actualCheckInTime: string;
  };
  recommendations?: string[];
}

export interface AttendanceCheckOutRequest {
  userId: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  reason?: string;
  otReason?: string;
  imageUrl?: string;
}

export interface AttendanceCheckOutResponse {
  success: boolean;
  message: string;
  workingHours: number;
  overtimeHours: number;
  totalHours: number;
}

export class UnifiedAttendanceService {
<<<<<<< HEAD

=======
  
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
  /**
   * Process attendance check-in with enterprise location validation
   */
  static async processCheckIn(request: AttendanceCheckInRequest): Promise<AttendanceCheckInResponse> {
    try {
      // Validate user exists
      const user = await storage.getUser(request.userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          locationValidation: {
            isValid: false,
            confidence: 0,
            distance: 0,
            detectedOffice: null,
            validationType: 'failed',
            message: 'User validation failed',
            recommendations: ['Contact system administrator'],
            metadata: {
              accuracy: request.accuracy,
              effectiveRadius: 0,
              indoorDetection: false,
              confidenceFactors: ['user_not_found']
            }
          }
        };
      }

      // CRITICAL: Validate department timing configuration before allowing check-in
      if (!user.department) {
        return {
          success: false,
          message: 'Department not assigned. Contact administrator to assign you to a department.',
          locationValidation: {
            isValid: false,
            confidence: 0,
            distance: 0,
            detectedOffice: null,
            validationType: 'failed',
            message: 'Department assignment required',
            recommendations: ['Contact your administrator to assign you to a department'],
            metadata: {
              accuracy: request.accuracy,
              effectiveRadius: 0,
              indoorDetection: false,
              confidenceFactors: ['no_department']
            }
          }
        };
      }

      // Check if department timing is configured
      const departmentTiming = await storage.getDepartmentTiming(user.department);
      if (!departmentTiming) {
        return {
          success: false,
          message: `Department timing not configured for ${user.department} department. Please configure working hours first.`,
          locationValidation: {
            isValid: false,
            confidence: 0,
            distance: 0,
            detectedOffice: null,
            validationType: 'failed',
            message: 'Department timing configuration required',
            recommendations: [
              'Go to Departments page → Configure Attendance Timing',
              'Set check-in time, check-out time, and working hours',
              'This is required to calculate late arrivals and overtime'
            ],
            metadata: {
              accuracy: request.accuracy,
              effectiveRadius: 0,
              indoorDetection: false,
              confidenceFactors: ['no_department_timing']
            }
          }
        };
      }

<<<<<<< HEAD
      // **CRITICAL FIX: Use UTC date to avoid timezone issues**
      // When using local time with setHours(0,0,0,0), the ISO string conversion
      // causes date mismatch in timezones ahead of UTC (e.g., IST +5:30)
      const now = new Date();
      const today = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      ));

      console.log('CHECK-IN: Using UTC date for consistency:', {
        serverTime: now.toISOString(),
        utcDate: today.toISOString(),
        dateString: today.toISOString().split('T')[0]
      });

      const existingAttendance = await storage.getAttendanceByUserAndDate(request.userId, today);

      if (existingAttendance) {
        // **CRITICAL: Verify the existing record is actually from TODAY**
        // This prevents blocking check-in when an old incomplete record exists
        const existingDate = new Date(existingAttendance.date);
        existingDate.setHours(0, 0, 0, 0);

        const todayNormalized = new Date(today);
        todayNormalized.setHours(0, 0, 0, 0);

        // Only block if the existing record is genuinely from today
        if (existingDate.getTime() === todayNormalized.getTime()) {
          console.log('DUPLICATE CHECK-IN: Blocking duplicate check-in for user', request.userId, {
            existingRecordDate: existingDate.toISOString(),
            todayDate: todayNormalized.toISOString(),
            existingRecordId: existingAttendance.id
          });

          return {
            success: false,
            message: 'You have already checked in today',
            locationValidation: {
              isValid: false,
              confidence: 0,
              distance: 0,
              detectedOffice: null,
              validationType: 'failed',
              message: 'Duplicate check-in attempt',
              recommendations: ['You can only check in once per day'],
              metadata: {
                accuracy: request.accuracy,
                effectiveRadius: 0,
                indoorDetection: false,
                confidenceFactors: ['duplicate_checkin']
              }
            }
          };
        } else {
          // Old record exists but it's from a different day - allow check-in
          console.log('DUPLICATE CHECK: Found old attendance record, but it\'s from a different day. Allowing check-in.', {
            existingRecordDate: existingDate.toISOString(),
            todayDate: todayNormalized.toISOString(),
            userId: request.userId
          });
        }
=======
      // Check for duplicate check-in
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existingAttendance = await storage.getAttendanceByUserAndDate(request.userId, today);
      
      if (existingAttendance) {
        return {
          success: false,
          message: 'You have already checked in today',
          locationValidation: {
            isValid: false,
            confidence: 0,
            distance: 0,
            detectedOffice: null,
            validationType: 'failed',
            message: 'Duplicate check-in attempt',
            recommendations: ['You can only check in once per day'],
            metadata: {
              accuracy: request.accuracy,
              effectiveRadius: 0,
              indoorDetection: false,
              confidenceFactors: ['duplicate_checkin']
            }
          }
        };
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      }

      // Simplified location validation - accept any location
      console.log('UNIFIED SERVICE: Processing simplified attendance with location data...');
<<<<<<< HEAD
      console.log('Location coordinates:', {
        latitude: request.latitude,
        longitude: request.longitude,
        accuracy: request.accuracy
      });

=======
      console.log('Location coordinates:', { 
        latitude: request.latitude, 
        longitude: request.longitude, 
        accuracy: request.accuracy 
      });
      
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      const locationValidation = {
        isValid: true,
        confidence: 1.0,
        distance: 0,
        detectedOffice: null,
        validationType: 'simplified' as const,
        message: 'Location recorded successfully',
        recommendations: [] as string[],
        metadata: {
          accuracy: request.accuracy,
          effectiveRadius: 0,
          indoorDetection: false,
          confidenceFactors: ['simplified_attendance']
        }
      };

      // Calculate timing information using Enterprise Time Service
      const timingInfo = await this.calculateTimingInfo(user, new Date());
<<<<<<< HEAD

=======
      
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      // Handle photo upload to Cloudinary if provided
      let cloudinaryImageUrl = request.imageUrl;
      if (request.imageUrl && request.imageUrl.startsWith('data:')) {
        console.log('ATTENDANCE: Uploading photo to Cloudinary for user:', request.userId);
        const uploadResult = await CloudinaryService.uploadAttendancePhoto(
          request.imageUrl,
          request.userId,
          new Date()
        );
<<<<<<< HEAD

=======
        
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
        if (uploadResult.success) {
          cloudinaryImageUrl = uploadResult.url;
          console.log('ATTENDANCE: Photo uploaded successfully:', uploadResult.url);
        } else {
          console.error('ATTENDANCE: Photo upload failed:', uploadResult.error);
          // Continue without failing the check-in - photo upload is not critical
        }
      }
<<<<<<< HEAD

=======
      
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      // Create attendance record
      const attendanceData = {
        userId: request.userId,
        date: today,
        checkInTime: new Date(),
        attendanceType: request.attendanceType,
        reason: request.reason || '',
        checkInLatitude: request.latitude.toString(),
        checkInLongitude: request.longitude.toString(),
        status: (timingInfo.isLate ? 'late' : 'present') as 'late' | 'present',
        isLate: timingInfo.isLate,
        lateMinutes: timingInfo.lateMinutes,
        workingHours: 0,
        breakHours: 0,
        isWithinOfficeRadius: true, // Simplified - no office restrictions
        remarks: `Attendance recorded with location verification`,
<<<<<<< HEAD

=======
        
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
        // Enhanced metadata for enterprise tracking
        locationAccuracy: request.accuracy,
        locationValidationType: locationValidation.validationType,
        locationConfidence: locationValidation.confidence,
        detectedOfficeId: locationValidation.detectedOffice?.id || null,
        distanceFromOffice: locationValidation.distance,
        isManualOT: false,
        otStatus: 'not_started' as const,
<<<<<<< HEAD

=======
        
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
        // Optional fields
        ...(request.customerName && { customerName: request.customerName }),
        ...(cloudinaryImageUrl && { checkInImageUrl: cloudinaryImageUrl })
      };

      const newAttendance = await storage.createAttendance(attendanceData);

      // Log simplified attendance acceptance
      console.log('UNIFIED SERVICE: Simplified attendance accepted for user:', request.userId);

      // Create activity log
      await storage.createActivityLog({
        type: 'attendance',
        title: `${this.getAttendanceTypeDisplay(request.attendanceType)} Check-in`,
        description: `${user.displayName} checked in${timingInfo.isLate ? ` (${timingInfo.lateMinutes} minutes late)` : ''} - Location recorded successfully`,
        entityId: newAttendance.id,
        entityType: 'attendance',
        userId: request.userId
      });

      const actualCheckInTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
<<<<<<< HEAD

=======
      
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      return {
        success: true,
        attendanceId: newAttendance.id,
        message: `Check-in successful at ${actualCheckInTime}${timingInfo.isLate ? ` (${timingInfo.lateMinutes} minutes late from ${timingInfo.expectedCheckInTime} start time)` : ''}`,
        locationValidation,
        attendanceDetails: {
          isLate: timingInfo.isLate,
          lateMinutes: timingInfo.lateMinutes,
          expectedCheckInTime: timingInfo.expectedCheckInTime,
          actualCheckInTime: actualCheckInTime
        },
        recommendations: locationValidation.recommendations
      };

    } catch (error) {
      console.error('Error processing check-in:', error);
      return {
        success: false,
        message: 'Failed to process check-in due to system error',
        locationValidation: {
          isValid: false,
          confidence: 0,
          distance: 0,
          detectedOffice: null,
          validationType: 'failed',
          message: 'System error during validation',
          recommendations: ['Please try again or contact support'],
          metadata: {
            accuracy: request.accuracy,
            effectiveRadius: 0,
            indoorDetection: false,
            confidenceFactors: ['system_error']
          }
        }
      };
    }
  }

  /**
   * Process attendance check-out with overtime calculation
   */
  static async processCheckOut(request: AttendanceCheckOutRequest): Promise<AttendanceCheckOutResponse> {
    try {
      // Find today's attendance record
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const attendance = await storage.getAttendanceByUserAndDate(request.userId, today);

      if (!attendance) {
        return {
          success: false,
          message: 'No check-in record found for today',
          workingHours: 0,
          overtimeHours: 0,
          totalHours: 0
        };
      }

      if (attendance.checkOutTime) {
        return {
          success: false,
          message: 'You have already checked out for today',
          workingHours: 0,
          overtimeHours: 0,
          totalHours: 0
        };
      }

      // Get user for department timing
      const user = await storage.getUser(request.userId);
      const { EnterpriseTimeService } = await import('./enterprise-time-service');
<<<<<<< HEAD

      // Calculate comprehensive time metrics using Enterprise Time Service
      const checkOutTime = new Date();
      const checkInTime = attendance.checkInTime ? new Date(attendance.checkInTime) : new Date();

=======
      
      // Calculate comprehensive time metrics using Enterprise Time Service
      const checkOutTime = new Date();
      const checkInTime = attendance.checkInTime ? new Date(attendance.checkInTime) : new Date();
      
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      const timeMetrics = await EnterpriseTimeService.calculateTimeMetrics(
        request.userId,
        user?.department || 'operations',
        checkInTime,
        checkOutTime
      );
<<<<<<< HEAD

=======
      
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      const { workingHours, overtimeHours } = timeMetrics;

      // Update attendance record
      const updatedAttendance = await storage.updateAttendance(attendance.id, {
        checkOutTime,
        checkOutLatitude: request.latitude?.toString(),
        checkOutLongitude: request.longitude?.toString(),
        workingHours,
        overtimeHours,
        otReason: request.otReason || '',
        remarks: request.reason || ''
      });

      // Log activity
      await storage.createActivityLog({
        type: 'attendance',
        title: 'Check-out',
        description: `${user?.displayName} checked out after ${workingHours.toFixed(1)} hours${overtimeHours > 0 ? ` (${overtimeHours.toFixed(1)}h overtime)` : ''}`,
        entityId: attendance.id,
        entityType: 'attendance',
        userId: request.userId
      });

      return {
        success: true,
        message: `Check-out successful. Total working time: ${workingHours.toFixed(1)} hours${overtimeHours > 0 ? ` (${overtimeHours.toFixed(1)}h overtime)` : ''}`,
        workingHours: Number(workingHours.toFixed(2)),
        overtimeHours: Number(overtimeHours.toFixed(2)),
        totalHours: Number(workingHours.toFixed(2))
      };

    } catch (error) {
      console.error('Error processing check-out:', error);
      return {
        success: false,
        message: 'Failed to process check-out due to system error',
        workingHours: 0,
        overtimeHours: 0,
        totalHours: 0
      };
    }
  }

  /**
   * Validate business rules for attendance check-in with work policy enforcement
   */
  private static async validateBusinessRules(
    request: AttendanceCheckInRequest,
    locationValidation: LocationValidationResult
  ): Promise<{ isValid: boolean; message: string; recommendations: string[] }> {
    const recommendations: string[] = [];

    // Get user and department timing for policy validation
    const user = await storage.getUser(request.userId);
    const { EnterpriseTimeService } = await import('./enterprise-time-service');
    const departmentTiming = await EnterpriseTimeService.getDepartmentTiming(user?.department || 'operations');

    // Remote work policy validation
    if (request.attendanceType === 'remote') {
      if (!departmentTiming.allowRemoteWork) {
        return {
          isValid: false,
          message: `Remote work is not allowed for ${user?.department || 'your'} department`,
          recommendations: ['Please check in from office location', 'Contact your supervisor for remote work approval']
        };
      }
<<<<<<< HEAD

=======
      
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      if (!request.reason || request.reason.trim().length < 10) {
        return {
          isValid: false,
          message: 'Remote work requires a detailed reason (minimum 10 characters)',
          recommendations: ['Provide a clear reason for working remotely', 'Include work location and expected tasks']
        };
      }
    }

    // Field work policy validation
    if (request.attendanceType === 'field_work') {
      if (!departmentTiming.allowFieldWork) {
        return {
          isValid: false,
          message: `Field work is not allowed for ${user?.department || 'your'} department`,
          recommendations: ['Please check in from office location', 'Contact your supervisor for field work approval']
        };
      }
<<<<<<< HEAD

=======
      
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      if (!request.customerName || request.customerName.trim().length < 3) {
        return {
          isValid: false,
          message: 'Field work requires a valid customer name (minimum 3 characters)',
          recommendations: ['Provide the customer or site name', 'Include project or visit details in reason']
        };
      }
<<<<<<< HEAD

=======
      
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      if (!request.imageUrl) {
        return {
          isValid: false,
          message: 'Field work requires a photo to be captured',
          recommendations: ['Take a photo at the field location', 'Ensure photo shows your current location']
        };
      }
    }

    // Office attendance validation
    if (request.attendanceType === 'office') {
      if (!locationValidation.isValid) {
        return {
          isValid: false,
          message: `Office check-in failed: ${locationValidation.message}`,
          recommendations: [
            ...locationValidation.recommendations,
            'Consider using "Remote Work" if you are working from outside office'
          ]
        };
      }
    }

    // Field work validation
    if (request.attendanceType === 'field_work') {
      if (!request.customerName) {
        return {
          isValid: false,
          message: 'Customer name is required for field work',
          recommendations: ['Please enter the customer name you are visiting']
        };
      }
      if (!request.imageUrl) {
        return {
          isValid: false,
          message: 'Photo is mandatory for field work check-in',
          recommendations: ['Please capture a photo to verify your field work location']
        };
      }
    }

    // Remote work validation
    if (request.attendanceType === 'remote') {
      if (!request.reason) {
        return {
          isValid: false,
          message: 'Reason is required for remote work',
          recommendations: ['Please provide a reason for working remotely today']
        };
      }
    }

    return { isValid: true, message: 'Validation successful', recommendations };
  }

  /**
   * Calculate timing information for check-in using Enterprise Time Service
   */
  private static async calculateTimingInfo(user: any, checkInTime: Date = new Date()): Promise<{
    isLate: boolean;
    lateMinutes: number;
    expectedCheckInTime: string;
  }> {
    const { EnterpriseTimeService } = await import('./enterprise-time-service');
<<<<<<< HEAD

    const department = user?.department || 'operations';
    const timing = await EnterpriseTimeService.getDepartmentTiming(department);

    // Parse expected check-in time for today
    const today = new Date(checkInTime);
    const expectedTime = this.parseTime12ToDate(timing.checkInTime, today);

    const isLate = checkInTime > expectedTime;
    const lateMinutes = isLate ?
=======
    
    const department = user?.department || 'operations';
    const timing = await EnterpriseTimeService.getDepartmentTiming(department);
    
    // Parse expected check-in time for today
    const today = new Date(checkInTime);
    const expectedTime = this.parseTime12ToDate(timing.checkInTime, today);
    
    const isLate = checkInTime > expectedTime;
    const lateMinutes = isLate ? 
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      Math.floor((checkInTime.getTime() - expectedTime.getTime()) / (1000 * 60)) : 0;

    return {
      isLate,
      lateMinutes,
      expectedCheckInTime: timing.checkInTime
    };
  }

  /**
   * Parse 12-hour time string to Date object - DEPRECATED: Use EnterpriseTimeService
   */
  private static parseTime12ToDate(timeStr: string, baseDate: Date): Date {
    console.warn('DEPRECATED: Use EnterpriseTimeService.parseTimeToDate instead');
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
    const match = timeStr.match(timeRegex);
<<<<<<< HEAD

=======
    
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
    if (!match) {
      console.error('UNIFIED_ATTENDANCE: Invalid time format:', timeStr);
      // Return safe fallback
      const fallback = new Date(baseDate);
      fallback.setHours(18, 0, 0, 0); // 6 PM default
      return fallback;
    }

    let [, hourStr, minuteStr, period] = match;
    let hours = parseInt(hourStr);
    const minutes = parseInt(minuteStr);

    if (isNaN(hours) || isNaN(minutes)) {
      console.error('UNIFIED_ATTENDANCE: Invalid time values:', timeStr);
      const fallback = new Date(baseDate);
      fallback.setHours(18, 0, 0, 0);
      return fallback;
    }

    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }

    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Generate appropriate remarks for attendance record
   */
  private static generateRemarks(
    request: AttendanceCheckInRequest,
    locationValidation: LocationValidationResult
  ): string {
    const parts: string[] = [];

    if (request.attendanceType === 'field_work' && request.customerName) {
      parts.push(`Field work at ${request.customerName}`);
    }

    if (request.reason) {
      parts.push(request.reason);
    }

    if (locationValidation.validationType === 'indoor_compensation') {
      parts.push('Indoor GPS detection');
    } else if (locationValidation.validationType === 'proximity_based') {
      parts.push('Proximity-based location validation');
    }

    if (locationValidation.detectedOffice) {
      parts.push(`Office: ${locationValidation.detectedOffice.name}`);
    }

    return parts.join(' | ') || 'Standard check-in';
  }

  /**
   * Get display name for attendance type
   */
  private static getAttendanceTypeDisplay(type: string): string {
    switch (type) {
      case 'office': return 'Office';
      case 'remote': return 'Remote Work';
      case 'field_work': return 'Field Work';
      default: return 'Unknown';
    }
  }

  /**
   * Generate comprehensive attendance metrics for analytics with Enterprise Time Service
   */
  static async generateAttendanceMetrics(userId: string, dateRange?: { start: Date; end: Date }) {
    try {
      const attendanceRecords = await storage.getAttendance(userId);
<<<<<<< HEAD

=======
      
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      if (!Array.isArray(attendanceRecords)) {
        console.error('ATTENDANCE METRICS: Expected array, got:', typeof attendanceRecords);
        return {
          totalDays: 0,
          totalWorkingHours: 0,
          totalOvertimeHours: 0,
          averageWorkingHours: 0,
          lateArrivals: 0,
          punctualityRate: 100,
          records: []
        };
      }
<<<<<<< HEAD

      // Filter by date range if provided
      const filteredRecords = dateRange
        ? attendanceRecords.filter((record: any) => {
          const checkInDate = new Date(record.checkInTime);
          return checkInDate >= dateRange.start && checkInDate <= dateRange.end;
        })
=======
      
      // Filter by date range if provided
      const filteredRecords = dateRange 
        ? attendanceRecords.filter((record: any) => {
            const checkInDate = new Date(record.checkInTime);
            return checkInDate >= dateRange.start && checkInDate <= dateRange.end;
          })
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
        : attendanceRecords;

      const totalDays = filteredRecords.length;
      const totalWorkingHours = filteredRecords.reduce((sum: number, record: any) => sum + (record.workingHours || 0), 0);
      const totalOvertimeHours = filteredRecords.reduce((sum: number, record: any) => sum + (record.overtimeHours || 0), 0);
      const lateArrivals = filteredRecords.filter((record: any) => record.isLate).length;
<<<<<<< HEAD

=======
      
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
      return {
        totalDays,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        averageWorkingHours: totalDays > 0 ? Math.round((totalWorkingHours / totalDays) * 100) / 100 : 0,
        lateArrivals,
        punctualityRate: totalDays > 0 ? Math.round(((totalDays - lateArrivals) / totalDays) * 100) : 100,
        records: filteredRecords
      };
    } catch (error) {
      console.error('Error generating attendance metrics:', error);
      return {
        totalDays: 0,
        totalWorkingHours: 0,
        totalOvertimeHours: 0,
        averageWorkingHours: 0,
        lateArrivals: 0,
        punctualityRate: 100,
        records: []
      };
    }
  }

  /**
   * Get department-specific timing configuration (DEPRECATED)
   * @deprecated Use EnterpriseTimeService.getDepartmentTiming() instead
   */
  private static getDepartmentTiming(department?: string): {
    checkInTime: string;
    checkOutTime: string;
    workingHours: number;
  } {
    console.warn('DEPRECATED: Using legacy getDepartmentTiming - migrate to EnterpriseTimeService');
<<<<<<< HEAD

=======
    
>>>>>>> d7b0360e5f812ad38e870765d33c592734271da8
    // Legacy fallback with 12-hour format
    const defaultTimings = {
      'operations': { checkInTime: '9:00 AM', checkOutTime: '6:00 PM', workingHours: 8 },
      'admin': { checkInTime: '9:30 AM', checkOutTime: '6:30 PM', workingHours: 8 },
      'hr': { checkInTime: '9:30 AM', checkOutTime: '6:30 PM', workingHours: 8 },
      'marketing': { checkInTime: '10:00 AM', checkOutTime: '7:00 PM', workingHours: 8 },
      'sales': { checkInTime: '9:00 AM', checkOutTime: '6:00 PM', workingHours: 8 },
      'technical': { checkInTime: '9:00 AM', checkOutTime: '6:00 PM', workingHours: 8 },
      'housekeeping': { checkInTime: '8:00 AM', checkOutTime: '5:00 PM', workingHours: 8 }
    };

    return defaultTimings[department as keyof typeof defaultTimings] || defaultTimings.operations;
  }
}