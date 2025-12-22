/**
 * OT System API Routes
 * Comprehensive REST API for overtime management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { OTSessionService } from '../services/ot-session-service';
import { HolidayService } from '../services/holiday-service';
import { CompanySettingsService } from '../services/company-settings-service';
import { PayrollLockService } from '../services/payroll-lock-service';
import { auth } from '../firebase';
import { storage } from '../storage';

const router = Router();

// Auth middleware matching existing pattern from routes.ts
const verifyAuth = async (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: Missing or invalid token" });
    }
    const token = authHeader.split("Bearer ")[1];
    try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;

        // Load user profile
        const userProfile = await storage.getUser(decodedToken.uid);
        if (userProfile) {
            req.authenticatedUser = {
                uid: decodedToken.uid,
                user: userProfile,
                permissions: [],
                canApprove: false,
                maxApprovalAmount: null
            };
        }
        next();
    } catch (error) {
        console.error("Auth verification error:", error);
        res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};

// Admin check middleware
const requireAdmin = async (req: any, res: Response, next: NextFunction) => {
    const userProfile = req.authenticatedUser?.user;
    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'master_admin')) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
};

// Master admin check middleware
const requireMasterAdmin = async (req: any, res: Response, next: NextFunction) => {
    const userProfile = req.authenticatedUser?.user;
    if (!userProfile || userProfile.role !== 'master_admin') {
        return res.status(403).json({ message: "Forbidden: Master admin access required" });
    }
    next();
};

// ============================================
// OT SESSION ROUTES
// ============================================

/**
 * POST /api/ot/sessions/start
 * Start a new OT session
 */
router.post('/sessions/start', verifyAuth, async (req, res) => {
    try {
        const { latitude, longitude, accuracy, imageUrl, address, reason } = req.body;
        const userId = req.user.uid;

        if (!latitude || !longitude || !imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: latitude, longitude, imageUrl'
            });
        }

        const result = await OTSessionService.startSession({
            userId,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: parseFloat(accuracy || 0),
            imageUrl,
            address,
            reason
        });

        return res.json(result);

    } catch (error) {
        console.error('Error starting OT session:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to start OT session'
        });
    }
});

/**
 * POST /api/ot/sessions/:id/end
 * End an active OT session
 */
router.post('/sessions/:id/end', verifyAuth, async (req, res) => {
    try {
        const { id: sessionId } = req.params;
        const { latitude, longitude, accuracy, imageUrl, address, reason } = req.body;
        const userId = req.user.uid;

        if (!latitude || !longitude || !imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: latitude, longitude, imageUrl'
            });
        }

        const result = await OTSessionService.endSession({
            userId,
            sessionId,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: parseFloat(accuracy || 0),
            imageUrl,
            address,
            reason
        });

        return res.json(result);

    } catch (error) {
        console.error('Error ending OT session:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to end OT session'
        });
    }
});

/**
 * GET /api/ot/sessions/active
 * Get active OT session for current user
 */
router.get('/sessions/active', verifyAuth, async (req, res) => {
    try {
        const userId = req.user.uid;

        const session = await OTSessionService.getActiveSession(userId);

        return res.json({
            success: true,
            session
        });

    } catch (error) {
        console.error('Error getting active session:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get active session'
        });
    }
});

/**
 * GET /api/ot/sessions
 * Get OT sessions for a specific date
 */
router.get('/sessions', verifyAuth, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { date } = req.query;

        const targetDate = date ? new Date(date as string) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const sessions = await OTSessionService.getSessionsForDate(userId, targetDate);

        return res.json({
            success: true,
            sessions
        });

    } catch (error) {
        console.error('Error getting sessions:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get sessions'
        });
    }
});

// ============================================
// COMPANY SETTINGS ROUTES (Admin Only)
// ============================================


// Duplicate routes removed - using the more secure versions below (lines 668+)




/**
 * GET /api/payroll/periods/:year
 * Get all payroll periods for a year
 */
router.get('/payroll/periods/:year', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const { year } = req.params;

        const periods = await PayrollLockService.getPeriodsForYear(parseInt(year));

        return res.json({
            success: true,
            periods
        });

    } catch (error) {
        console.error('Error getting payroll periods:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get payroll periods'
        });
    }
});

/**
 * GET /api/payroll/status/:month/:year
 * Get payroll period status
 */
router.get('/payroll/status/:month/:year', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const { month, year } = req.params;

        const period = await PayrollLockService.getPeriodStatus(
            parseInt(month),
            parseInt(year)
        );

        return res.json({
            success: true,
            period
        });

    } catch (error) {
        console.error('Error getting payroll status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get payroll status'
        });
    }
});

// ============================================
// HOLIDAY MANAGEMENT ROUTES
// ============================================

/**
 * GET /api/holidays
 * Get holidays for a specific year or month
 * Query params: year (required), month (optional)
 */
router.get('/holidays', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const { year, month } = req.query;

        if (!year) {
            return res.status(400).json({
                success: false,
                message: 'Year parameter is required'
            });
        }

        const yearNum = parseInt(year as string);
        if (isNaN(yearNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid year format'
            });
        }

        let holidays;
        if (month) {
            const monthNum = parseInt(month as string);
            if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid month format (must be 1-12)'
                });
            }
            holidays = await HolidayService.getHolidaysForMonth(monthNum, yearNum);
        } else {
            holidays = await HolidayService.getHolidaysForYear(yearNum);
        }

        return res.json({ holidays });

    } catch (error) {
        console.error('Error fetching holidays:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch holidays'
        });
    }
});

/**
 * POST /api/holidays
 * Create a new holiday
 */
router.post('/holidays', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const { date, name, type, otRateMultiplier, applicableDepartments, notes } = req.body;
        const adminId = req.user.uid;

        // Validate required fields
        if (!date || !name || !otRateMultiplier) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: date, name, otRateMultiplier'
            });
        }

        // Validate OT rate
        const rate = parseFloat(otRateMultiplier);
        if (isNaN(rate) || rate <= 0) {
            return res.status(400).json({
                success: false,
                message: 'OT rate multiplier must be a positive number'
            });
        }

        const result = await HolidayService.createHoliday({
            date: new Date(date),
            name,
            type: type || 'company',
            otRateMultiplier: rate,
            isActive: true,
            applicableDepartments,
            notes
        }, adminId);

        return res.json(result);

    } catch (error) {
        console.error('Error creating holiday:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create holiday'
        });
    }
});

/**
 * PUT /api/holidays/:id
 * Update an existing holiday
 */
router.put('/holidays/:id', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { date, name, type, otRateMultiplier, applicableDepartments, notes, isActive } = req.body;
        const adminId = req.user.uid;

        // Validate OT rate if provided
        if (otRateMultiplier !== undefined) {
            const rate = parseFloat(otRateMultiplier);
            if (isNaN(rate) || rate <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'OT rate multiplier must be a positive number'
                });
            }
        }

        const updates: any = {};
        if (date !== undefined) updates.date = new Date(date);
        if (name !== undefined) updates.name = name;
        if (type !== undefined) updates.type = type;
        if (otRateMultiplier !== undefined) updates.otRateMultiplier = parseFloat(otRateMultiplier);
        if (applicableDepartments !== undefined) updates.applicableDepartments = applicableDepartments;
        if (notes !== undefined) updates.notes = notes;
        if (isActive !== undefined) updates.isActive = isActive;

        const result = await HolidayService.updateHoliday(id, updates, adminId);
        return res.json(result);

    } catch (error) {
        console.error('Error updating holiday:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update holiday'
        });
    }
});

/**
 * DELETE /api/holidays/:id
 * Delete a holiday (soft delete - sets isActive to false)
 */
router.delete('/holidays/:id', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.uid;

        const result = await HolidayService.deleteHoliday(id, adminId);
        return res.json(result);

    } catch (error) {
        console.error('Error deleting holiday:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete holiday'
        });
    }
});

// ============================================
// COMPANY SETTINGS ROUTES
// ============================================

/**
 * GET /api/settings
 * Get company OT settings
 */
router.get('/settings', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const settings = await CompanySettingsService.getSettings();
        return res.json({ settings });

    } catch (error) {
        console.error('Error fetching settings:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch settings'
        });
    }
});

/**
 * PUT /api/settings
 * Update company OT settings
 */
router.put('/settings', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const { weekendDays, defaultOTRate, weekendOTRate, maxOTHoursPerDay } = req.body;
        const adminId = req.user.uid;

        // Validate numeric fields
        const numericFields = {
            maxOTHoursPerDay
        };

        for (const [key, value] of Object.entries(numericFields)) {
            if (value !== undefined) {
                const num = parseFloat(value as string);
                if (isNaN(num) || num <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: `${key} must be a positive number`
                    });
                }
            }
        }

        // Validate weekendDays array
        if (weekendDays !== undefined) {
            if (!Array.isArray(weekendDays)) {
                return res.status(400).json({
                    success: false,
                    message: 'weekendDays must be an array'
                });
            }
            if (!weekendDays.every((day: number) => day >= 0 && day <= 6)) {
                return res.status(400).json({
                    success: false,
                    message: 'weekendDays must contain values between 0-6'
                });
            }
        }

        const updates: any = {};
        if (weekendDays !== undefined) updates.weekendDays = weekendDays;
        if (defaultOTRate !== undefined) updates.defaultOTRate = parseFloat(defaultOTRate);
        if (weekendOTRate !== undefined) updates.weekendOTRate = parseFloat(weekendOTRate);
        if (maxOTHoursPerDay !== undefined) updates.maxOTHoursPerDay = parseFloat(maxOTHoursPerDay);


        const result = await CompanySettingsService.updateSettings(updates, adminId);
        return res.json(result);

    } catch (error) {
        console.error('Error updating settings:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update settings'
        });
    }
});

// ============================================
// PAYROLL LOCK ROUTES
// ============================================

/**
 * GET /api/payroll/periods/:year
 * Get all payroll periods for a year
 */
router.get('/payroll/periods/:year', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const { year } = req.params;
        const yearNum = parseInt(year);

        if (isNaN(yearNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid year format'
            });
        }

        const periods = await PayrollLockService.getPeriodsForYear(yearNum);
        return res.json({ periods });

    } catch (error) {
        console.error('Error fetching payroll periods:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payroll periods'
        });
    }
});

/**
 * POST /api/payroll/lock
 * Lock a payroll period (master_admin only)
 */
router.post('/payroll/lock', verifyAuth, requireMasterAdmin, async (req, res) => {
    try {
        const { month, year } = req.body;
        const adminId = req.user.uid;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: month, year'
            });
        }

        const monthNum = parseInt(month);
        const yearNum = parseInt(year);

        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({
                success: false,
                message: 'Invalid month (must be 1-12)'
            });
        }

        if (isNaN(yearNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid year'
            });
        }

        const result = await PayrollLockService.lockPeriod(monthNum, yearNum, adminId);
        return res.json(result);

    } catch (error) {
        console.error('Error locking payroll period:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to lock payroll period'
        });
    }
});

/**
 * POST /api/payroll/unlock
 * Unlock a payroll period with mandatory reason (master_admin only)
 */
router.post('/payroll/unlock', verifyAuth, requireMasterAdmin, async (req, res) => {
    try {
        const { month, year, reason } = req.body;
        const adminId = req.user.uid;

        if (!month || !year || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: month, year, reason'
            });
        }

        const monthNum = parseInt(month);
        const yearNum = parseInt(year);

        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({
                success: false,
                message: 'Invalid month (must be 1-12)'
            });
        }

        if (isNaN(yearNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid year'
            });
        }

        if (reason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Unlock reason must be at least 10 characters'
            });
        }

        const result = await PayrollLockService.unlockPeriod(monthNum, yearNum, reason, adminId);
        return res.json(result);

    } catch (error) {
        console.error('Error unlocking payroll period:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to unlock payroll period'
        });
    }
});

export default router;
