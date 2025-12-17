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
// HOLIDAY MANAGEMENT ROUTES (Admin Only)
// ============================================

/**
 * POST /api/holidays
 * Create a new holiday
 */
router.post('/holidays', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const { date, name, type, otRateMultiplier, applicableDepartments, notes } = req.body;
        const adminId = req.user.uid;

        if (!date || !name || !type || !otRateMultiplier) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: date, name, type, otRateMultiplier'
            });
        }

        const result = await HolidayService.createHoliday({
            date: new Date(date),
            name,
            type,
            otRateMultiplier: parseFloat(otRateMultiplier),
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
 * GET /api/holidays
 * List holidays
 */
router.get('/holidays', verifyAuth, async (req, res) => {
    try {
        const { year, month } = req.query;

        let holidays;

        if (month && year) {
            holidays = await HolidayService.getHolidaysForMonth(
                parseInt(month as string),
                parseInt(year as string)
            );
        } else if (year) {
            holidays = await HolidayService.getHolidaysForYear(parseInt(year as string));
        } else {
            // Default: current year
            const currentYear = new Date().getFullYear();
            holidays = await HolidayService.getHolidaysForYear(currentYear);
        }

        return res.json({
            success: true,
            holidays
        });

    } catch (error) {
        console.error('Error listing holidays:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to list holidays'
        });
    }
});

/**
 * GET /api/holidays/check/:date
 * Check if a specific date is a holiday
 */
router.get('/holidays/check/:date', verifyAuth, async (req, res) => {
    try {
        const { date } = req.params;
        const department = req.query.department as string | undefined;

        const targetDate = new Date(date);
        const holiday = await HolidayService.getHolidayForDate(targetDate, department);

        return res.json({
            success: true,
            isHoliday: !!holiday,
            holiday
        });

    } catch (error) {
        console.error('Error checking holiday:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to check holiday'
        });
    }
});

/**
 * PUT /api/holidays/:id
 * Update a holiday
 */
router.put('/holidays/:id', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.uid;
        const updates = req.body;

        if (updates.date) {
            updates.date = new Date(updates.date);
        }

        if (updates.otRateMultiplier) {
            updates.otRateMultiplier = parseFloat(updates.otRateMultiplier);
        }

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
 * Delete a holiday (soft delete)
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
// COMPANY SETTINGS ROUTES (Admin Only)
// ============================================

/**
 * GET /api/settings
 * Get company OT settings
 */
router.get('/settings', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const settings = await CompanySettingsService.getSettings();

        return res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error('Error getting settings:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get settings'
        });
    }
});

/**
 * PUT /api/settings
 * Update company OT settings
 */
router.put('/settings', verifyAuth, requireAdmin, async (req, res) => {
    try {
        const adminId = req.user.uid;
        const updates = req.body;

        // Parse numeric values
        if (updates.defaultOTRate) {
            updates.defaultOTRate = parseFloat(updates.defaultOTRate);
        }
        if (updates.weekendOTRate) {
            updates.weekendOTRate = parseFloat(updates.weekendOTRate);
        }
        if (updates.maxOTHoursPerDay) {
            updates.maxOTHoursPerDay = parseFloat(updates.maxOTHoursPerDay);
        }
        if (updates.requireAdminApprovalAbove) {
            updates.requireAdminApprovalAbove = parseFloat(updates.requireAdminApprovalAbove);
        }

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
// PAYROLL LOCK ROUTES (Master Admin Only)
// ============================================

/**
 * POST /api/payroll/lock
 * Lock a payroll period
 */
router.post('/payroll/lock', verifyAuth, async (req, res) => {
    try {
        const { month, year } = req.body;
        const adminId = req.user.uid;
        const adminRole = req.user.role;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: month, year'
            });
        }

        const result = await PayrollLockService.lockPeriod(
            parseInt(month),
            parseInt(year),
            adminId,
            adminRole
        );

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
 * Unlock a payroll period (master admin only, requires reason)
 */
router.post('/payroll/unlock', verifyAuth, async (req, res) => {
    try {
        const { month, year, reason } = req.body;
        const adminId = req.user.uid;
        const adminRole = req.user.role;

        if (!month || !year || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: month, year, reason'
            });
        }

        const result = await PayrollLockService.unlockPeriod(
            parseInt(month),
            parseInt(year),
            adminId,
            adminRole,
            reason
        );

        return res.json(result);

    } catch (error) {
        console.error('Error unlocking payroll period:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to unlock payroll period'
        });
    }
});

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

export default router;
