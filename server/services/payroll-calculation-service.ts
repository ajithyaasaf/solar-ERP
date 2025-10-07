import { IStorage } from "../storage";
import { LeaveService } from "./leave-service";

/**
 * Enterprise Payroll Calculation Service
 * Handles comprehensive payroll calculation including:
 * - Overtime pay calculation
 * - Leave integration (paid and unpaid)
 * - Salary advance deductions
 * - Pro-rated earnings and deductions
 */
export class PayrollCalculationService {
  constructor(private storage: IStorage) {}

  /**
   * Calculate overtime pay based on salary structure and hours worked
   */
  async calculateOvertimePay(
    userId: string,
    overtimeHours: number,
    salaryStructure: any
  ): Promise<number> {
    if (overtimeHours <= 0) return 0;

    // Calculate base components for hourly rate
    const fixedBasic = salaryStructure.fixedBasic || 0;
    const fixedHRA = salaryStructure.fixedHRA || 0;
    const fixedConveyance = salaryStructure.fixedConveyance || 0;
    const totalFixedSalary = fixedBasic + fixedHRA + fixedConveyance;

    // Get overtime rate (default 1.5x if not specified)
    const overtimeRate = salaryStructure.overtimeRate || 1.5;

    // Calculate hourly rate based on 26 working days and 8 hours per day
    const standardWorkingHours = 8;
    const standardWorkingDays = 26;
    const hourlyRate = totalFixedSalary / (standardWorkingDays * standardWorkingHours);

    // Calculate overtime pay
    const overtimePay = overtimeHours * hourlyRate * overtimeRate;

    console.log('PAYROLL_CALC: Overtime calculation:', {
      userId,
      overtimeHours,
      totalFixedSalary,
      hourlyRate: hourlyRate.toFixed(2),
      overtimeRate,
      overtimePay: overtimePay.toFixed(2)
    });

    return Math.round(overtimePay);
  }

  /**
   * Get approved paid leave days for a specific month/year
   */
  async getPaidLeaveDays(
    userId: string,
    month: number,
    year: number
  ): Promise<number> {
    try {
      const leaves = await this.storage.listLeaveApplicationsByUser(userId);

      // Filter for approved casual leaves in the specified month/year
      const paidLeaves = leaves.filter(leave => {
        if (leave.status !== 'approved') return false;
        if (leave.leaveType !== 'casual_leave') return false;
        if (!leave.startDate) return false;

        const leaveDate = new Date(leave.startDate);
        const leaveMonth = leaveDate.getMonth() + 1;
        const leaveYear = leaveDate.getFullYear();

        return leaveMonth === month && leaveYear === year;
      });

      const totalPaidLeaveDays = paidLeaves.reduce(
        (sum, leave) => sum + (leave.totalDays || 0),
        0
      );

      console.log('PAYROLL_CALC: Paid leave calculation:', {
        userId,
        month,
        year,
        approvedLeaves: paidLeaves.length,
        totalPaidDays: totalPaidLeaveDays
      });

      return totalPaidLeaveDays;
    } catch (error) {
      console.error('Error calculating paid leave days:', error);
      return 0;
    }
  }

  /**
   * Calculate unpaid leave deductions for a specific month/year
   */
  async calculateUnpaidLeaveDeduction(
    userId: string,
    month: number,
    year: number,
    monthDays: number,
    totalFixedSalary: number
  ): Promise<number> {
    try {
      const leaves = await this.storage.listLeaveApplicationsByUser(userId);

      // Filter for approved unpaid/affecting-payroll leaves in the specified month/year
      const unpaidLeaves = leaves.filter(leave => {
        if (leave.status !== 'approved') return false;
        if (!leave.affectsPayroll && leave.leaveType !== 'unpaid_leave') return false;
        if (!leave.startDate) return false;

        const leaveDate = new Date(leave.startDate);
        const leaveMonth = leaveDate.getMonth() + 1;
        const leaveYear = leaveDate.getFullYear();

        return leaveMonth === month && leaveYear === year;
      });

      const totalUnpaidDays = unpaidLeaves.reduce(
        (sum, leave) => sum + (leave.totalDays || 0),
        0
      );

      // Calculate per-day salary and deduction
      const perDaySalary = totalFixedSalary / monthDays;
      const unpaidDeduction = totalUnpaidDays * perDaySalary;

      console.log('PAYROLL_CALC: Unpaid leave deduction:', {
        userId,
        month,
        year,
        unpaidLeaves: unpaidLeaves.length,
        totalUnpaidDays,
        perDaySalary: perDaySalary.toFixed(2),
        unpaidDeduction: unpaidDeduction.toFixed(2)
      });

      return Math.round(unpaidDeduction);
    } catch (error) {
      console.error('Error calculating unpaid leave deduction:', error);
      return 0;
    }
  }

  /**
   * Calculate salary advance deductions for a specific month/year
   */
  async calculateSalaryAdvanceDeduction(
    userId: string,
    month: number,
    year: number
  ): Promise<number> {
    try {
      // Get all approved salary advances for the user
      const advances = await this.storage.listSalaryAdvances({
        userId,
        status: 'approved'
      });

      // Filter advances where deduction applies to this month/year
      const applicableAdvances = advances.filter(advance => {
        const deductionStartMonth = advance.deductionStartMonth;
        const deductionStartYear = advance.deductionStartYear;

        if (!deductionStartMonth || !deductionStartYear) return false;

        // Create date objects for comparison
        const startDate = new Date(deductionStartYear, deductionStartMonth - 1);
        const currentDate = new Date(year, month - 1);

        // Check if current month is within deduction period
        if (currentDate < startDate) return false;

        // Calculate number of months since deduction started
        const monthsSinceStart = (year - deductionStartYear) * 12 + (month - deductionStartMonth);
        
        // Check if deduction is still active (within number of installments)
        return monthsSinceStart < advance.numberOfInstallments;
      });

      const totalAdvanceDeduction = applicableAdvances.reduce(
        (sum, advance) => sum + (advance.monthlyDeduction || 0),
        0
      );

      console.log('PAYROLL_CALC: Salary advance deduction:', {
        userId,
        month,
        year,
        applicableAdvances: applicableAdvances.length,
        totalDeduction: totalAdvanceDeduction
      });

      return Math.round(totalAdvanceDeduction);
    } catch (error) {
      console.error('Error calculating salary advance deduction:', error);
      return 0;
    }
  }

  /**
   * Comprehensive payroll calculation with all integrations
   */
  async calculateComprehensivePayroll(
    userId: string,
    month: number,
    year: number,
    attendanceRecords: any[],
    salaryStructure: any
  ) {
    // Get month details
    const monthDays = new Date(year, month, 0).getDate();

    // Calculate present days from attendance
    const validWorkingStatuses = ['present', 'late', 'overtime', 'half_day', 'early_checkout'];
    const presentDays = attendanceRecords.filter(record =>
      validWorkingStatuses.includes(record.status)
    ).length;

    // Get paid leave days
    const paidLeaveDays = await this.getPaidLeaveDays(userId, month, year);

    // Calculate total working days (attendance + paid leave)
    const totalWorkingDays = presentDays + paidLeaveDays;

    // Calculate fixed salary components
    const fixedBasic = salaryStructure.fixedBasic || 0;
    const fixedHRA = salaryStructure.fixedHRA || 0;
    const fixedConveyance = salaryStructure.fixedConveyance || 0;
    const totalFixedSalary = fixedBasic + fixedHRA + fixedConveyance;

    // Pro-rate earnings based on total working days (attendance + paid leave)
    const earnedBasic = (fixedBasic / monthDays) * totalWorkingDays;
    const earnedHRA = (fixedHRA / monthDays) * totalWorkingDays;
    const earnedConveyance = (fixedConveyance / monthDays) * totalWorkingDays;

    // Calculate overtime hours and pay
    const totalOvertimeHours = attendanceRecords.reduce(
      (sum, record) => sum + (record.overtimeHours || record.manualOTHours || 0),
      0
    );
    const overtimePay = await this.calculateOvertimePay(
      userId,
      totalOvertimeHours,
      salaryStructure
    );

    // Calculate dynamic earnings (pro-rated)
    const dynamicEarnings = { ...(salaryStructure.dynamicEarnings || {}) };
    let totalDynamicEarnings = 0;
    Object.entries(dynamicEarnings).forEach(([key, value]) => {
      if (typeof value === 'number' && value > 0) {
        const earnedAmount = (value / monthDays) * totalWorkingDays;
        dynamicEarnings[key] = Math.round(earnedAmount);
        totalDynamicEarnings += earnedAmount;
      }
    });

    // Calculate gross salary
    const grossSalary = earnedBasic + earnedHRA + earnedConveyance + totalDynamicEarnings + overtimePay;

    // Calculate statutory deductions
    const epfDeduction = salaryStructure.epfApplicable
      ? Math.min(earnedBasic * 0.12, 1800)
      : 0;
    const esiDeduction = salaryStructure.esiApplicable && grossSalary <= 21000
      ? grossSalary * 0.0075
      : 0;
    const vptDeduction = salaryStructure.vptAmount || 0;

    // Calculate dynamic deductions (pro-rated)
    const dynamicDeductions = { ...(salaryStructure.dynamicDeductions || {}) };
    let totalDynamicDeductions = 0;
    Object.entries(dynamicDeductions).forEach(([key, value]) => {
      if (typeof value === 'number' && value > 0) {
        const deductedAmount = (value / monthDays) * totalWorkingDays;
        dynamicDeductions[key] = Math.round(deductedAmount);
        totalDynamicDeductions += deductedAmount;
      }
    });

    // Calculate unpaid leave deduction
    const unpaidLeaveDeduction = await this.calculateUnpaidLeaveDeduction(
      userId,
      month,
      year,
      monthDays,
      totalFixedSalary
    );

    // Calculate salary advance deduction
    const salaryAdvanceDeduction = await this.calculateSalaryAdvanceDeduction(
      userId,
      month,
      year
    );

    // Calculate total deductions
    const totalDeductions =
      epfDeduction +
      esiDeduction +
      vptDeduction +
      totalDynamicDeductions +
      unpaidLeaveDeduction +
      salaryAdvanceDeduction;

    // Calculate net salary
    const netSalary = grossSalary - totalDeductions;

    console.log('PAYROLL_CALC: Comprehensive calculation complete:', {
      userId,
      month,
      year,
      presentDays,
      paidLeaveDays,
      totalWorkingDays,
      overtimeHours: totalOvertimeHours,
      overtimePay,
      grossSalary: Math.round(grossSalary),
      totalDeductions: Math.round(totalDeductions),
      netSalary: Math.round(netSalary)
    });

    return {
      monthDays,
      presentDays,
      paidLeaveDays,
      overtimeHours: totalOvertimeHours,
      perDaySalary: Math.round(totalFixedSalary / monthDays),
      earnedBasic: Math.round(earnedBasic),
      earnedHRA: Math.round(earnedHRA),
      earnedConveyance: Math.round(earnedConveyance),
      overtimePay: Math.round(overtimePay),
      dynamicEarnings,
      grossSalary: Math.round(grossSalary),
      epfDeduction: Math.round(epfDeduction),
      esiDeduction: Math.round(esiDeduction),
      vptDeduction: Math.round(vptDeduction),
      dynamicDeductions,
      unpaidLeaveDeduction: Math.round(unpaidLeaveDeduction),
      salaryAdvanceDeduction: Math.round(salaryAdvanceDeduction),
      totalEarnings: Math.round(grossSalary),
      totalDeductions: Math.round(totalDeductions),
      netSalary: Math.round(netSalary),
      esiEligible: grossSalary <= 21000
    };
  }
}
