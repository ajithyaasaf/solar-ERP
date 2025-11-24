import { db } from "./firebase";
import {
  FieldValue,
  Timestamp,
  Firestore,
  CollectionReference,
  DocumentReference,
  DocumentData,
  Query
} from "firebase-admin/firestore";
import { z } from "zod";
import {
  insertAttendanceSchema,
  insertOfficeLocationSchema,
  insertPermissionSchema,
  insertRoleSchema,
  insertUserRoleAssignmentSchema,
  insertPermissionOverrideSchema,
  insertAuditLogSchema,
  insertSalaryStructureSchema,
  insertPayrollSchema,
  insertPayrollSettingsSchema,
  insertSalaryAdvanceSchema,
  insertAttendancePolicySchema,
  insertEmployeeSchema,
  insertEmployeeDocumentSchema,
  insertPerformanceReviewSchema,
  insertLeaveBalanceSchema,
  insertLeaveApplicationSchema,
  insertFixedHolidaySchema,
  LeaveBalance,
  LeaveApplication,
  FixedHoliday,
  InsertLeaveBalance,
  InsertLeaveApplication,
  InsertFixedHoliday
} from "@shared/schema";

// Import additional schemas from shared
import { paymentModes, maritalStatus as sharedMaritalStatus, bloodGroups as sharedBloodGroups, employeeStatus as sharedEmployeeStatus } from "@shared/schema";

// Define our schemas since we're not using drizzle anymore
export const insertUserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable().optional().transform(val => val || "User"),
  role: z.enum(["master_admin", "admin", "employee"]).default("employee"),
  department: z.enum(["operations", "admin", "hr", "marketing", "sales", "technical", "housekeeping"]).nullable().optional(),
  designation: z.enum([
    "ceo", "gm", "officer", "executive", "cre", "team_leader", "technician", "welder", "house_man"
  ]).nullable().optional(),
  employeeId: z.string().optional(),
  reportingManagerId: z.string().nullable().optional(),
  payrollGrade: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"]).nullable().optional(),
  joinDate: z.date().optional(),
  isActive: z.boolean().default(true),
  photoURL: z.string().nullable().optional(),
  
  // Statutory Information
  esiNumber: z.string().optional(),
  epfNumber: z.string().optional(),
  aadharNumber: z.string().optional(),
  panNumber: z.string().optional(),
  
  // Personal Details
  fatherName: z.string().optional(),
  spouseName: z.string().optional(),
  dateOfBirth: z.date().optional(),
  age: z.number().min(0).max(150).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  maritalStatus: z.enum(sharedMaritalStatus).optional(),
  bloodGroup: z.enum(sharedBloodGroups).optional(),
  
  // Employee Document URLs
  profilePhotoUrl: z.string().optional(),
  aadharCardUrl: z.string().optional(),
  panCardUrl: z.string().optional(),
  
  // Professional Information
  educationalQualification: z.string().optional(),
  experienceYears: z.number().min(0).optional(),
  
  // Employment Lifecycle
  dateOfLeaving: z.date().optional(),
  employeeStatus: z.enum(sharedEmployeeStatus).default("active"),
  
  // Contact Information
  contactNumber: z.string().optional(),
  emergencyContactPerson: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
  permanentAddress: z.string().optional(),
  presentAddress: z.string().optional(),
  location: z.string().optional(),
  
  // Payroll Information
  paymentMode: z.enum(paymentModes).optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  ifscCode: z.string().optional(),
  
  // Document Management
  documents: z.object({
    marksheets: z.array(z.string()).optional(),
    certificates: z.array(z.string()).optional(),
    idProofs: z.array(z.string()).optional(),
    bankDocuments: z.array(z.string()).optional(),
    others: z.array(z.string()).optional()
  }).optional()
});

export const insertDesignationSchema = z.object({
  name: z.string(),
  level: z.number(),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([])
});

export const insertPermissionGroupSchema = z.object({
  name: z.string(),
  department: z.enum(["operations", "admin", "hr", "marketing", "sales", "technical", "housekeeping"]),
  designation: z.enum([
    "ceo", "gm", "officer", "executive", "cre", "team_leader", "technician", "welder", "house_man"
  ]),
  permissions: z.array(z.string()),
  canApprove: z.boolean().default(false),
  maxApprovalAmount: z.number().nullable().optional()
});

export const insertDepartmentSchema = z.object({
  name: z.string()
});

// Import unified customer schema from shared location
import { insertCustomerSchema, type UnifiedCustomer } from "@shared/schema";

// Create Customer type alias for backward compatibility
export type Customer = UnifiedCustomer;

export const insertProductSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number()
});

// Import comprehensive quotation schema from shared location
import { insertQuotationSchema as sharedInsertQuotationSchema, type Quotation as SharedQuotation } from "@shared/schema";

// Use the comprehensive quotation schema from shared
export const insertQuotationSchema = sharedInsertQuotationSchema;

export const insertInvoiceSchema = z.object({
  quotationId: z.string(),
  customerId: z.string(),
  total: z.number(),
  status: z.string().default("pending")
});

export const insertLeaveSchema = z.object({
  userId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  reason: z.string(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending")
});

export interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: "master_admin" | "admin" | "employee";
  department:
    | "operations"
    | "admin"
    | "hr"
    | "marketing"
    | "sales"
    | "technical"
    | "housekeeping"
    | null;
  designation:
    | "ceo"
    | "gm"
    | "officer"
    | "executive"
    | "cre"
    | "team_leader"
    | "technician"
    | "welder"
    | "house_man"
    | null;
  employeeId?: string;
  reportingManagerId?: string | null;
  payrollGrade?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "D1" | "D2" | null;
  joinDate?: Date;
  isActive: boolean;
  createdAt: Date;
  photoURL?: string;
  
  // Statutory Information
  esiNumber?: string;
  epfNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  
  // Personal Details
  fatherName?: string;
  spouseName?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  maritalStatus?: "single" | "married" | "divorced" | "widowed" | "separated";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";
  
  // Professional Information
  educationalQualification?: string;
  experienceYears?: number;
  
  // Employment Lifecycle
  dateOfLeaving?: Date;
  employeeStatus?: "active" | "inactive" | "probation" | "notice_period" | "terminated" | "on_leave";
  
  // Contact Information
  contactNumber?: string;
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
  permanentAddress?: string;
  presentAddress?: string;
  location?: string;
  
  // Payroll Information
  paymentMode?: "cash" | "bank" | "cheque";
  bankAccountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  
  // Document Management
  documents?: {
    marksheets?: string[];
    certificates?: string[];
    idProofs?: string[];
    bankDocuments?: string[];
    others?: string[];
  };
}

export interface Designation {
  id: string;
  name: string;
  level: number;
  description?: string;
  permissions: string[];
  createdAt: Date;
}

export interface PermissionGroup {
  id: string;
  name: string;
  department: "operations" | "admin" | "hr" | "marketing" | "sales" | "technical" | "housekeeping";
  designation: "ceo" | "gm" | "officer" | "executive" | "cre" | "team_leader" | "technician" | "welder" | "house_man";
  permissions: string[];
  canApprove: boolean;
  maxApprovalAmount?: number | null;
  createdAt: Date;
}

export interface Department {
  id: string;
  name: string;
}

export interface OfficeLocation {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  radius: number;
}


export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  createdAt: Date;
}

// Use the comprehensive quotation interface from shared
export type Quotation = SharedQuotation;

export interface Invoice {
  id: string;
  quotationId: string;
  customerId: string;
  total: number;
  status: string;
  createdAt: Date;
}

export interface Attendance {
  id: string;
  userId: string;
  userEmail: string;
  userDepartment: string | null;
  date: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  location: string;
  customerId?: number;
  reason?: string;
  checkInLatitude?: string;
  checkInLongitude?: string;
  checkInImageUrl?: string;
  checkOutLatitude?: string;
  checkOutLongitude?: string;
  checkOutImageUrl?: string;
  status: string;
  overtimeHours?: number;
  otReason?: string;
  otStartTime?: Date;
  otEndTime?: Date;
}

export interface Leave {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

// Activity Log interface
export interface ActivityLog {
  id: string;
  type: 'customer_created' | 'customer_updated' | 'quotation_created' | 'invoice_paid' | 'product_created' | 'attendance' | 'leave_requested' | 'follow_up_completed' | 'follow_up_scheduled';
  title: string;
  description: string;
  createdAt: Date;
  entityId: string;
  entityType: string;
  userId: string;
}

export const insertActivityLogSchema = z.object({
  type: z.enum(['customer_created', 'customer_updated', 'quotation_created', 'invoice_paid', 'product_created', 'attendance', 'leave_requested', 'follow_up_completed', 'follow_up_scheduled']),
  title: z.string(),
  description: z.string(),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  userId: z.string(),
});

// Phase 2: Enterprise RBAC Interfaces
export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  department?: string | null;
  designation?: string | null;
  permissions: string[];
  approvalLimits?: {
    quotations?: number | null;
    invoices?: number | null;
    expenses?: number | null;
    leave?: boolean;
    overtime?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  assignedBy: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface PermissionOverride {
  id: string;
  userId: string;
  permission: string;
  granted: boolean;
  reason: string;
  grantedBy: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  department?: string | null;
  designation?: string | null;
  createdAt: Date;
}

// Enterprise HR Management Interfaces
export interface Employee {
  id: string;
  employeeId: string;
  systemUserId?: string; // Links to User Management system
  
  // Personal Information
  personalInfo: {
    firstName: string;
    lastName: string;
    middleName?: string;
    displayName: string;
    dateOfBirth?: Date;
    gender?: "male" | "female" | "other" | "prefer_not_to_say";
    maritalStatus?: "single" | "married" | "divorced" | "widowed" | "separated";
    bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";
    nationality?: string;
    photoURL?: string;
  };

  // Contact Information
  contactInfo: {
    primaryEmail: string;
    secondaryEmail?: string;
    primaryPhone: string;
    secondaryPhone?: string;
    permanentAddress?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country: string;
    };
    currentAddress?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country: string;
      isSameAsPermanent: boolean;
    };
  };

  // Employment Information
  employmentInfo: {
    department: string;
    designation: string;
    employmentType: "full_time" | "part_time" | "contract" | "intern" | "consultant" | "freelancer";
    joinDate: Date;
    confirmationDate?: Date;
    probationPeriodMonths: number;
    reportingManagerId?: string;
    workLocation?: string;
    shiftPattern?: string;
    weeklyOffDays: number[];
  };

  // Payroll Information
  payrollInfo: {
    payrollGrade?: string;
    basicSalary?: number;
    currency: string;
    paymentMethod: "bank_transfer" | "cash" | "cheque";
    bankDetails?: {
      accountNumber?: string;
      bankName?: string;
      ifscCode?: string;
      accountHolderName?: string;
    };
    pfNumber?: string;
    esiNumber?: string;
    panNumber?: string;
    aadharNumber?: string;
  };

  // Professional Information
  professionalInfo: {
    totalExperienceYears?: number;
    relevantExperienceYears?: number;
    highestQualification?: string;
    skills: string[];
    certifications: string[];
    languages: string[];
    previousEmployers: Array<{
      companyName: string;
      designation: string;
      duration: string;
      reasonForLeaving?: string;
    }>;
  };

  // Emergency Contacts
  emergencyContacts: Array<{
    name: string;
    relationship: string;
    primaryPhone: string;
    secondaryPhone?: string;
    address?: string;
  }>;

  // System Information
  status: "active" | "inactive" | "probation" | "notice_period" | "terminated" | "on_leave";
  isActive: boolean;
  notes?: string;
  createdBy?: string;
  lastUpdatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  documentType: "aadhar_card" | "pan_card" | "passport" | "driving_license" | "voter_id" | 
               "resume" | "offer_letter" | "joining_letter" | "salary_certificate" |
               "experience_certificate" | "education_certificate" | "photo" | "other";
  documentName: string;
  documentUrl: string;
  documentNumber?: string;
  expiryDate?: Date;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  uploadedBy: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewPeriod: {
    startDate: Date;
    endDate: Date;
  };
  reviewType: "annual" | "quarterly" | "probation" | "special";
  overallRating: number;
  goals: Array<{
    title: string;
    description?: string;
    status: "achieved" | "partially_achieved" | "not_achieved";
  }>;
  strengths: string[];
  improvementAreas: string[];
  reviewerComments?: string;
  employeeComments?: string;
  reviewedBy: string;
  nextReviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Payroll System Interfaces
export interface SalaryStructure {
  id: string;
  userId: string;
  employeeId: string;
  fixedSalary: number;
  basicSalary: number;
  hra?: number;
  allowances?: number;
  variableComponent?: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  isActive: boolean;
  createdBy: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payroll {
  id: string;
  userId: string;
  employeeId: string;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  overtimeHours: number;
  leaveDays: number;
  
  // Salary Components
  fixedSalary: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  variableComponent: number;
  overtimePay: number;
  grossSalary: number;
  
  // Deductions
  pfDeduction: number;
  esiDeduction: number;
  tdsDeduction: number;
  advanceDeduction: number;
  loanDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  
  // Net Salary
  netSalary: number;
  
  // Status and Processing
  status: "draft" | "pending" | "approved" | "paid" | "cancelled";
  processedBy: string;
  approvedBy?: string;
  paidOn?: Date;
  paymentReference?: string;
  remarks?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollSettings {
  id: string;
  pfRate: number;
  esiRate: number;
  tdsRate: number;
  overtimeMultiplier: number;
  standardWorkingHours: number;
  standardWorkingDays: number;
  leaveDeductionRate: number;
  pfApplicableFromSalary: number;
  esiApplicableFromSalary: number;
  companyName: string;
  companyAddress?: string;
  companyPan?: string;
  companyTan?: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface SalaryAdvance {
  id: string;
  userId: string;
  employeeId: string;
  amount: number;
  reason: string;
  requestDate: Date;
  approvedDate?: Date;
  deductionStartMonth: number;
  deductionStartYear: number;
  numberOfInstallments: number;
  monthlyDeduction: number;
  remainingAmount: number;
  status: "pending" | "approved" | "rejected" | "completed";
  approvedBy?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendancePolicy {
  id: string;
  name: string;
  department?: string | null;
  designation?: string | null;
  checkInTime: string;
  checkOutTime: string;
  flexibleTiming: boolean;
  flexibilityMinutes: number;
  overtimeAllowed: boolean;
  maxOvertimeHours: number;
  overtimeApprovalRequired: boolean;
  lateMarkAfterMinutes: number;
  halfDayMarkAfterMinutes: number;
  weekendDays: number[];
  holidayPolicy: "paid" | "unpaid" | "optional";
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Payroll Interfaces
export interface EnhancedPayroll {
  id: string;
  userId: string;
  employeeId: string;
  month: number;
  year: number;
  monthDays: number;
  presentDays: number;
  paidLeaveDays: number;
  overtimeHours: number;
  perDaySalary: number;
  earnedBasic: number;
  earnedHRA: number;
  earnedConveyance: number;
  overtimePay: number;
  betta: number; // BETTA allowance from manual system
  dynamicEarnings: Record<string, number>;
  grossSalary: number; // Gross before BETTA
  finalGross: number; // Final gross after BETTA
  dynamicDeductions: Record<string, number>;
  epfDeduction: number;
  esiDeduction: number;
  vptDeduction: number;
  tdsDeduction: number;
  fineDeduction: number; // FINE from manual system
  salaryAdvance: number; // SALARY ADVANCE from manual system
  unpaidLeaveDeduction: number; // UNPAID LEAVE deduction
  creditAdjustment: number; // CREDIT from manual system
  esiEligible: boolean; // ESI eligibility status
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  status: "draft" | "processed" | "approved" | "paid";
  processedBy?: string;
  processedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnhancedSalaryStructure {
  id: string;
  userId: string;
  employeeId: string;
  fixedBasic: number;
  fixedHRA: number;
  fixedConveyance: number;
  customEarnings: Record<string, number>;
  customDeductions: Record<string, number>;
  perDaySalaryBase: "basic" | "basic_hra" | "gross";
  overtimeRate: number;
  epfApplicable: boolean;
  esiApplicable: boolean;
  vptAmount: number;
  templateId?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnhancedPayrollSettings {
  id: string;
  epfEmployeeRate: number;
  epfEmployerRate: number;
  esiEmployeeRate: number;
  esiEmployerRate: number;
  epfCeiling: number;
  esiThreshold: number;
  tdsThreshold: number;
  standardWorkingDays: number;
  standardWorkingHours: number;
  overtimeThresholdHours: number;
  companyName: string;
  companyAddress?: string;
  companyPan?: string;
  companyTan?: string;
  autoCalculateStatutory: boolean;
  allowManualOverride: boolean;
  requireApprovalForProcessing: boolean;
  updatedBy: string;
  updatedAt: Date;
}

export interface PayrollFieldConfig {
  id: string;
  name: string;
  displayName: string;
  category: "earnings" | "deductions";
  dataType: "number" | "text" | "boolean";
  isRequired: boolean;
  isSystemField: boolean;
  defaultValue?: any;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByDepartment(department: string): Promise<User[]>;
  getUsersByDesignation(designation: string): Promise<User[]>;
  getUsersByReportingManager(managerId: string): Promise<User[]>;
  listUsers(): Promise<User[]>;
  createUser(data: z.infer<typeof insertUserSchema>): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  
  // Department management
  getDepartment(id: string): Promise<Department | undefined>;
  getDepartmentByName(name: string): Promise<Department | undefined>;
  listDepartments(): Promise<string[]>;
  createDepartment(
    data: z.infer<typeof insertDepartmentSchema>,
  ): Promise<Department>;
  updateDepartment(
    id: string,
    data: Partial<z.infer<typeof insertDepartmentSchema>>,
  ): Promise<Department>;
  deleteDepartment(id: string): Promise<boolean>;
  
  // Designation management
  getDesignation(id: string): Promise<Designation | undefined>;
  getDesignationByName(name: string): Promise<Designation | undefined>;
  listDesignations(): Promise<Designation[]>;
  createDesignation(data: z.infer<typeof insertDesignationSchema>): Promise<Designation>;
  updateDesignation(id: string, data: Partial<z.infer<typeof insertDesignationSchema>>): Promise<Designation>;
  deleteDesignation(id: string): Promise<boolean>;
  
  // Permission management
  getPermissionGroup(id: string): Promise<PermissionGroup | undefined>;
  getPermissionsByDepartmentAndDesignation(department: string, designation: string): Promise<PermissionGroup | undefined>;
  listPermissionGroups(): Promise<PermissionGroup[]>;
  createPermissionGroup(data: z.infer<typeof insertPermissionGroupSchema>): Promise<PermissionGroup>;
  updatePermissionGroup(id: string, data: Partial<z.infer<typeof insertPermissionGroupSchema>>): Promise<PermissionGroup>;
  deletePermissionGroup(id: string): Promise<boolean>;
  
  // User permission utilities (Phase 1 - backward compatible)
  getUserPermissions(userId: string): Promise<string[]>;
  checkUserPermission(userId: string, permission: string): Promise<boolean>;
  getUserApprovalLimits(userId: string): Promise<{ canApprove: boolean; maxAmount: number | null }>;
  
  // Enterprise HR Management methods
  // Employee management
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  getEmployeeBySystemUserId(systemUserId: string): Promise<Employee | undefined>;
  getEmployeesByDepartment(department: string): Promise<Employee[]>;
  getEmployeesByDesignation(designation: string): Promise<Employee[]>;
  getEmployeesByManager(managerId: string): Promise<Employee[]>;
  getEmployeesByStatus(status: string): Promise<Employee[]>;
  listEmployees(filters?: {
    department?: string;
    status?: string;
    designation?: string;
    search?: string;
  }): Promise<Employee[]>;
  createEmployee(data: z.infer<typeof insertEmployeeSchema>): Promise<Employee>;
  updateEmployee(id: string, data: Partial<z.infer<typeof insertEmployeeSchema>>): Promise<Employee>;
  deleteEmployee(id: string): Promise<boolean>;
  
  // Employee Document management
  getEmployeeDocument(id: string): Promise<EmployeeDocument | undefined>;
  getEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]>;
  getEmployeeDocumentsByType(employeeId: string, documentType: string): Promise<EmployeeDocument[]>;
  createEmployeeDocument(data: z.infer<typeof insertEmployeeDocumentSchema>): Promise<EmployeeDocument>;
  updateEmployeeDocument(id: string, data: Partial<z.infer<typeof insertEmployeeDocumentSchema>>): Promise<EmployeeDocument>;
  deleteEmployeeDocument(id: string): Promise<boolean>;
  
  // Performance Review management
  getPerformanceReview(id: string): Promise<PerformanceReview | undefined>;
  getEmployeePerformanceReviews(employeeId: string): Promise<PerformanceReview[]>;
  getPerformanceReviewsByReviewer(reviewerId: string): Promise<PerformanceReview[]>;
  getUpcomingPerformanceReviews(): Promise<PerformanceReview[]>;
  createPerformanceReview(data: z.infer<typeof insertPerformanceReviewSchema>): Promise<PerformanceReview>;
  updatePerformanceReview(id: string, data: Partial<z.infer<typeof insertPerformanceReviewSchema>>): Promise<PerformanceReview>;
  deletePerformanceReview(id: string): Promise<boolean>;

  // Phase 2: Enterprise RBAC methods
  // Role management
  getRole(id: string): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  listRoles(): Promise<Role[]>;
  createRole(data: z.infer<typeof insertRoleSchema>): Promise<Role>;
  updateRole(id: string, data: Partial<z.infer<typeof insertRoleSchema>>): Promise<Role>;
  deleteRole(id: string): Promise<boolean>;
  
  // User role assignments
  getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]>;
  getRoleAssignment(id: string): Promise<UserRoleAssignment | undefined>;
  assignUserRole(data: z.infer<typeof insertUserRoleAssignmentSchema>): Promise<UserRoleAssignment>;
  revokeUserRole(userId: string, roleId: string): Promise<boolean>;
  
  // Permission overrides
  getUserPermissionOverrides(userId: string): Promise<PermissionOverride[]>;
  createPermissionOverride(data: z.infer<typeof insertPermissionOverrideSchema>): Promise<PermissionOverride>;
  revokePermissionOverride(id: string): Promise<boolean>;
  
  // Enterprise permission resolution
  getEffectiveUserPermissions(userId: string): Promise<string[]>;
  checkEffectiveUserPermission(userId: string, permission: string): Promise<boolean>;
  getEffectiveUserApprovalLimits(userId: string): Promise<{ canApprove: boolean; maxAmount: Record<string, number | null> }>;
  
  // Audit logging
  createAuditLog(data: z.infer<typeof insertAuditLogSchema>): Promise<AuditLog>;
  getAuditLogs(filters?: { userId?: string; entityType?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]>;
  
  // Payroll System Methods
  // Salary Structure Management
  getSalaryStructure(id: string): Promise<SalaryStructure | undefined>;
  getSalaryStructureByUser(userId: string): Promise<SalaryStructure | undefined>;
  createSalaryStructure(data: z.infer<typeof insertSalaryStructureSchema>): Promise<SalaryStructure>;
  updateSalaryStructure(id: string, data: Partial<z.infer<typeof insertSalaryStructureSchema>>): Promise<SalaryStructure>;
  listSalaryStructures(): Promise<SalaryStructure[]>;
  
  // Payroll Management
  getPayroll(id: string): Promise<Payroll | undefined>;
  getPayrollByUserAndMonth(userId: string, month: number, year: number): Promise<Payroll | undefined>;
  createPayroll(data: z.infer<typeof insertPayrollSchema>): Promise<Payroll>;
  updatePayroll(id: string, data: Partial<z.infer<typeof insertPayrollSchema>>): Promise<Payroll>;
  listPayrolls(filters?: { month?: number; year?: number; department?: string; status?: string }): Promise<Payroll[]>;
  listPayrollsByUser(userId: string): Promise<Payroll[]>;
  
  // Payroll Settings
  getPayrollSettings(): Promise<PayrollSettings | undefined>;
  updatePayrollSettings(data: z.infer<typeof insertPayrollSettingsSchema>): Promise<PayrollSettings>;
  
  // Salary Advances
  getSalaryAdvance(id: string): Promise<SalaryAdvance | undefined>;
  createSalaryAdvance(data: z.infer<typeof insertSalaryAdvanceSchema>): Promise<SalaryAdvance>;
  updateSalaryAdvance(id: string, data: Partial<z.infer<typeof insertSalaryAdvanceSchema>>): Promise<SalaryAdvance>;
  listSalaryAdvances(filters?: { userId?: string; status?: string }): Promise<SalaryAdvance[]>;
  
  // Attendance Policies
  getAttendancePolicy(id: string): Promise<AttendancePolicy | undefined>;
  getAttendancePolicyByDepartment(department: string, designation?: string): Promise<AttendancePolicy | undefined>;
  createAttendancePolicy(data: z.infer<typeof insertAttendancePolicySchema>): Promise<AttendancePolicy>;
  updateAttendancePolicy(id: string, data: Partial<z.infer<typeof insertAttendancePolicySchema>>): Promise<AttendancePolicy>;
  listAttendancePolicies(): Promise<AttendancePolicy[]>;

  // Department Timing Management
  getDepartmentTiming(department: string): Promise<any | undefined>;
  updateDepartmentTiming(department: string, data: any): Promise<any>;
  listDepartmentTimings(): Promise<any[]>;
  
  // Payroll Calculation Utilities
  calculatePayroll(userId: string, month: number, year: number): Promise<z.infer<typeof insertPayrollSchema>>;
  getMonthlyAttendanceSummary(userId: string, month: number, year: number): Promise<{
    workingDays: number;
    presentDays: number;
    absentDays: number;
    overtimeHours: number;
    leaveDays: number;
  }>;

  // Enhanced Payroll Management Methods
  getEnhancedPayroll(id: string): Promise<EnhancedPayroll | undefined>;
  getEnhancedPayrollByUserAndMonth(userId: string, month: number, year: number): Promise<EnhancedPayroll | undefined>;
  createEnhancedPayroll(data: any): Promise<EnhancedPayroll>;
  updateEnhancedPayroll(id: string, data: Partial<EnhancedPayroll>): Promise<EnhancedPayroll>;
  listEnhancedPayrolls(filters?: { month?: number; year?: number; department?: string; status?: string }): Promise<EnhancedPayroll[]>;
  listEnhancedPayrollsByUser(userId: string): Promise<EnhancedPayroll[]>;
  
  // Enhanced Salary Structure Management
  getEnhancedSalaryStructure(id: string): Promise<EnhancedSalaryStructure | undefined>;
  getEnhancedSalaryStructureByUser(userId: string): Promise<EnhancedSalaryStructure | undefined>;
  createEnhancedSalaryStructure(data: any): Promise<EnhancedSalaryStructure>;
  updateEnhancedSalaryStructure(id: string, data: Partial<EnhancedSalaryStructure>): Promise<EnhancedSalaryStructure>;
  listEnhancedSalaryStructures(): Promise<EnhancedSalaryStructure[]>;
  
  // Enhanced Payroll Settings
  getEnhancedPayrollSettings(): Promise<EnhancedPayrollSettings | undefined>;
  updateEnhancedPayrollSettings(data: any): Promise<EnhancedPayrollSettings>;
  
  // Payroll Field Configuration
  getPayrollFieldConfig(id: string): Promise<PayrollFieldConfig | undefined>;
  listPayrollFieldConfigs(): Promise<PayrollFieldConfig[]>;
  createPayrollFieldConfig(data: any): Promise<PayrollFieldConfig>;
  updatePayrollFieldConfig(id: string, data: Partial<PayrollFieldConfig>): Promise<PayrollFieldConfig>;
  deletePayrollFieldConfig(id: string): Promise<boolean>;
  
  listOfficeLocations(): Promise<OfficeLocation[]>;
  getOfficeLocation(id: string): Promise<OfficeLocation | undefined>;
  createOfficeLocation(
    data: z.infer<typeof insertOfficeLocationSchema>,
  ): Promise<OfficeLocation>;
  updateOfficeLocation(
    id: string,
    data: Partial<z.infer<typeof insertOfficeLocationSchema>>,
  ): Promise<OfficeLocation>;
  deleteOfficeLocation(id: string): Promise<void>;
  listCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(data: z.infer<typeof insertCustomerSchema>): Promise<Customer>;
  updateCustomer(
    id: string,
    data: Partial<z.infer<typeof insertCustomerSchema>>,
  ): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: z.infer<typeof insertProductSchema>): Promise<Product>;
  updateProduct(
    id: string,
    data: Partial<z.infer<typeof insertProductSchema>>,
  ): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  listQuotations(): Promise<Quotation[]>;
  getQuotation(id: string): Promise<Quotation | undefined>;
  createQuotation(
    data: z.infer<typeof insertQuotationSchema>,
  ): Promise<Quotation>;
  updateQuotation(
    id: string,
    data: Partial<z.infer<typeof insertQuotationSchema>>,
  ): Promise<Quotation>;
  deleteQuotation(id: string): Promise<void>;
  listInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(data: z.infer<typeof insertInvoiceSchema>): Promise<Invoice>;
  updateInvoice(
    id: string,
    data: Partial<z.infer<typeof insertInvoiceSchema>>,
  ): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  createAttendance(
    data: z.infer<typeof insertAttendanceSchema>,
  ): Promise<Attendance>;
  updateAttendance(
    id: string,
    data: Partial<z.infer<typeof insertAttendanceSchema>>,
  ): Promise<Attendance>;
  getAttendanceByUserAndDate(
    userId: string,
    date: Date,
  ): Promise<Attendance | undefined>;
  listAttendanceByUser(userId: string): Promise<Attendance[]>;
  listAttendanceByDate(date: Date): Promise<Attendance[]>;
  listAttendanceBetweenDates(
    startDate: Date,
    endDate: Date,
  ): Promise<Attendance[]>;
  listAttendanceByUserBetweenDates(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Attendance[]>;
  getAttendance(id: string): Promise<Attendance | undefined>;
  getUserAttendanceForDate(userId: string, date: string): Promise<Attendance | undefined>;
  getLeave(id: string): Promise<Leave | undefined>;
  listLeavesByUser(userId: string): Promise<Leave[]>;
  listPendingLeaves(): Promise<Leave[]>;
  createLeave(data: z.infer<typeof insertLeaveSchema>): Promise<Leave>;
  updateLeave(
    id: string,
    data: Partial<z.infer<typeof insertLeaveSchema>>,
  ): Promise<Leave>;
  
  // Comprehensive Leave Management System
  // Leave Balance Management
  getLeaveBalance(userId: string, month: number, year: number): Promise<LeaveBalance | undefined>;
  getCurrentLeaveBalance(userId: string): Promise<LeaveBalance | undefined>;
  createLeaveBalance(data: z.infer<typeof insertLeaveBalanceSchema>): Promise<LeaveBalance>;
  updateLeaveBalance(id: string, data: Partial<z.infer<typeof insertLeaveBalanceSchema>>): Promise<LeaveBalance>;
  listLeaveBalancesByYear(year: number): Promise<LeaveBalance[]>;
  resetMonthlyLeaveBalances(month: number, year: number): Promise<void>;
  
  // Leave Application Management
  getLeaveApplication(id: string): Promise<LeaveApplication | undefined>;
  createLeaveApplication(data: z.infer<typeof insertLeaveApplicationSchema>): Promise<LeaveApplication>;
  updateLeaveApplication(id: string, data: Partial<z.infer<typeof insertLeaveApplicationSchema>>): Promise<LeaveApplication>;
  listLeaveApplicationsByUser(userId: string): Promise<LeaveApplication[]>;
  listLeaveApplicationsByManager(managerId: string, status?: string): Promise<LeaveApplication[]>;
  listLeaveApplicationsByHR(status?: string): Promise<LeaveApplication[]>;
  listAllLeaveApplications(filters?: { status?: string; month?: number; year?: number }): Promise<LeaveApplication[]>;
  approveLeaveByManager(leaveId: string, managerId: string, remarks?: string): Promise<LeaveApplication>;
  approveLeaveByHR(leaveId: string, hrId: string, remarks?: string): Promise<LeaveApplication>;
  rejectLeave(leaveId: string, rejectedBy: string, reason: string, rejectedByRole: 'manager' | 'hr'): Promise<LeaveApplication>;
  cancelLeaveApplication(leaveId: string, userId: string): Promise<LeaveApplication>;
  
  // Fixed Holidays Management
  getFixedHoliday(id: string): Promise<FixedHoliday | undefined>;
  createFixedHoliday(data: z.infer<typeof insertFixedHolidaySchema>): Promise<FixedHoliday>;
  updateFixedHoliday(id: string, data: Partial<z.infer<typeof insertFixedHolidaySchema>>): Promise<FixedHoliday>;
  deleteFixedHoliday(id: string): Promise<boolean>;
  listFixedHolidays(year?: number): Promise<FixedHoliday[]>;
  initializeFixedHolidays(year: number, createdBy: string): Promise<void>;
  
  // Activity logs
  createActivityLog(data: z.infer<typeof insertActivityLogSchema>): Promise<ActivityLog>;
  listActivityLogs(limit?: number): Promise<ActivityLog[]>;
}

export class FirestoreStorage implements IStorage {
  private db: Firestore;
  
  constructor() {
    // Use the db imported at the top of the file
    this.db = db;
  }
  
  // Activity logs implementation
  async createActivityLog(data: z.infer<typeof insertActivityLogSchema>): Promise<ActivityLog> {
    const id = this.db.collection("activity_logs").doc().id;
    const activityLog: ActivityLog = {
      id,
      type: data.type,
      title: data.title,
      description: data.description,
      entityId: data.entityId || '',
      entityType: data.entityType || '',
      userId: data.userId,
      createdAt: new Date()
    };
    
    await this.db.collection("activity_logs").doc(id).set({
      ...activityLog,
      createdAt: Timestamp.fromDate(activityLog.createdAt)
    });
    
    return activityLog;
  }
  
  async listActivityLogs(limit = 10): Promise<ActivityLog[]> {
    const snapshot = await this.db.collection("activity_logs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now())
      } as ActivityLog;
    });
  }
  async getUser(id: string): Promise<User | undefined> {
    const userDoc = this.db.collection("users").doc(id);
    const docSnap = await userDoc.get();
    if (!docSnap.exists) return undefined;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      uid: data?.uid,
      email: data?.email,
      displayName: data?.displayName,
      role: data?.role,
      department: data?.department,
      designation: data?.designation,
      employeeId: data?.employeeId,
      reportingManagerId: data?.reportingManagerId,
      payrollGrade: data?.payrollGrade,
      joinDate: data?.joinDate?.toDate ? data.joinDate.toDate() : undefined,
      isActive: data?.isActive !== false,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : new Date(data?.createdAt || Date.now()),
      photoURL: data?.photoURL,
    } as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const usersRef = this.db.collection("users");
    const snapshot = await usersRef.where("email", "==", email).get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      department: data.department,
      createdAt: data.createdAt.toDate(),
      photoURL: data.photoURL,
    } as User;
  }

  async listUsers(): Promise<User[]> {
    const usersCollection = this.db.collection("users");
    const snapshot = await usersCollection.get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      // Handle different date formats safely
      let createdAt: Date;
      if (data.createdAt?.toDate) {
        // Firestore Timestamp
        createdAt = data.createdAt.toDate();
      } else if (data.createdAt) {
        // ISO string or similar
        createdAt = new Date(data.createdAt);
      } else {
        // Fallback
        createdAt = new Date();
      }
      
      return {
        id: doc.id,
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        department: data.department,
        designation: data.designation || null,
        employeeId: data.employeeId,
        reportingManagerId: data.reportingManagerId || null,
        payrollGrade: data.payrollGrade || null,
        joinDate: data.joinDate ? (data.joinDate.toDate ? data.joinDate.toDate() : new Date(data.joinDate)) : undefined,
        isActive: data.isActive !== false,
        createdAt: createdAt,
        photoURL: data.photoURL,
      } as User;
    });
  }

  async createUser(data: z.infer<typeof insertUserSchema>): Promise<User> {
    const validatedData = insertUserSchema.parse(data);
    const userDoc = this.db.collection("users").doc(validatedData.uid);
    
    await userDoc.set({
      ...validatedData,
      id: validatedData.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    return { 
      id: validatedData.uid,
      ...validatedData, 
      createdAt: new Date(),
      isActive: validatedData.isActive || true
    } as User;
  }

  async getUsersByDepartment(department: string): Promise<User[]> {
    const usersCollection = this.db.collection("users");
    const snapshot = await usersCollection.where("department", "==", department).get();
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        department: data.department,
        designation: data.designation || null,
        employeeId: data.employeeId,
        reportingManagerId: data.reportingManagerId || null,
        payrollGrade: data.payrollGrade || null,
        joinDate: data.joinDate ? (data.joinDate.toDate ? data.joinDate.toDate() : new Date(data.joinDate)) : undefined,
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        photoURL: data.photoURL,
      } as User;
    });
  }

  async getUsersByDesignation(designation: string): Promise<User[]> {
    const usersCollection = this.db.collection("users");
    const snapshot = await usersCollection.where("designation", "==", designation).get();
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        department: data.department,
        designation: data.designation || null,
        employeeId: data.employeeId,
        reportingManagerId: data.reportingManagerId || null,
        payrollGrade: data.payrollGrade || null,
        joinDate: data.joinDate ? (data.joinDate.toDate ? data.joinDate.toDate() : new Date(data.joinDate)) : undefined,
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        photoURL: data.photoURL,
      } as User;
    });
  }

  async getUsersByReportingManager(managerId: string): Promise<User[]> {
    const usersCollection = this.db.collection("users");
    const snapshot = await usersCollection.where("reportingManagerId", "==", managerId).get();
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        department: data.department,
        designation: data.designation || null,
        employeeId: data.employeeId,
        reportingManagerId: data.reportingManagerId || null,
        payrollGrade: data.payrollGrade || null,
        joinDate: data.joinDate ? (data.joinDate.toDate ? data.joinDate.toDate() : new Date(data.joinDate)) : undefined,
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        photoURL: data.photoURL,
      } as User;
    });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const userDoc = this.db.collection("users").doc(id);
    const updateData: any = { ...data, updatedAt: Timestamp.now() };
    
    if (data.createdAt) {
      updateData.createdAt = Timestamp.fromDate(data.createdAt);
    }
    
    await userDoc.update(updateData);
    const updatedDoc = await userDoc.get();
    
    if (!updatedDoc.exists) throw new Error("User not found");
    const updatedData = updatedDoc.data() || {};
    
    return {
      id: updatedDoc.id,
      uid: updatedData.uid,
      email: updatedData.email,
      displayName: updatedData.displayName,
      role: updatedData.role,
      department: updatedData.department,
      designation: updatedData.designation || null,
      employeeId: updatedData.employeeId,
      reportingManagerId: updatedData.reportingManagerId || null,
      payrollGrade: updatedData.payrollGrade || null,
      joinDate: updatedData.joinDate ? (updatedData.joinDate.toDate ? updatedData.joinDate.toDate() : new Date(updatedData.joinDate)) : undefined,
      isActive: updatedData.isActive !== false,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      photoURL: updatedData.photoURL,
    } as User;
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const deptDoc = this.db.collection("departments").doc(id);
    const docSnap = await deptDoc.get();
    if (!docSnap.exists) return undefined;
    const data = docSnap.data();
    return { id: docSnap.id, name: data?.name } as Department;
  }

  async getDepartmentByName(name: string): Promise<Department | undefined> {
    const departmentsRef = this.db.collection("departments");
    const snapshot = await departmentsRef.where("name", "==", name).get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return { id: doc.id, name: data.name } as Department;
  }

  async listDepartments(): Promise<string[]> {
    return ["operations", "admin", "hr", "marketing", "sales", "technical", "housekeeping"];
  }

  async createDepartment(
    data: z.infer<typeof insertDepartmentSchema>,
  ): Promise<Department> {
    const validatedData = insertDepartmentSchema.parse(data);
    const departmentsRef = this.db.collection("departments");
    const deptDoc = await departmentsRef.add({
      ...validatedData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    return { id: deptDoc.id, ...validatedData } as Department;
  }

  async updateDepartment(
    id: string,
    data: Partial<z.infer<typeof insertDepartmentSchema>>,
  ): Promise<Department> {
    const deptDoc = this.db.collection("departments").doc(id);
    const validatedData = insertDepartmentSchema.partial().parse(data);
    
    await deptDoc.update({ 
      ...validatedData, 
      updatedAt: Timestamp.now() 
    });
    
    const updatedDoc = await deptDoc.get();
    if (!updatedDoc.exists) throw new Error("Department not found");
    
    const docData = updatedDoc.data() || {};
    return { id: updatedDoc.id, name: docData.name } as Department;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    const deptDoc = this.db.collection("departments").doc(id);
    await deptDoc.delete();
    return true;
  }

  // Designation management methods
  async getDesignation(id: string): Promise<Designation | undefined> {
    const designationDoc = this.db.collection("designations").doc(id);
    const docSnap = await designationDoc.get();
    if (!docSnap.exists) return undefined;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data?.name,
      level: data?.level || 1,
      description: data?.description,
      permissions: data?.permissions || [],
      createdAt: data?.createdAt?.toDate() || new Date()
    } as Designation;
  }

  async getDesignationByName(name: string): Promise<Designation | undefined> {
    const designationsRef = this.db.collection("designations");
    const snapshot = await designationsRef.where("name", "==", name).get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      level: data.level || 1,
      description: data.description,
      permissions: data.permissions || [],
      createdAt: data.createdAt?.toDate() || new Date()
    } as Designation;
  }

  async listDesignations(): Promise<Designation[]> {
    const designationsCollection = this.db.collection("designations");
    const snapshot = await designationsCollection.orderBy("level", "desc").get();
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        level: data.level || 1,
        description: data.description,
        permissions: data.permissions || [],
        createdAt: data.createdAt?.toDate() || new Date()
      } as Designation;
    });
  }

  async createDesignation(data: z.infer<typeof insertDesignationSchema>): Promise<Designation> {
    const validatedData = insertDesignationSchema.parse(data);
    const designationRef = this.db.collection("designations").doc();
    
    const designationData = {
      ...validatedData,
      createdAt: Timestamp.now()
    };
    
    await designationRef.set(designationData);
    
    return {
      id: designationRef.id,
      ...validatedData,
      createdAt: new Date()
    } as Designation;
  }

  async updateDesignation(id: string, data: Partial<z.infer<typeof insertDesignationSchema>>): Promise<Designation> {
    const designationDoc = this.db.collection("designations").doc(id);
    const updateData = { ...data, updatedAt: Timestamp.now() };
    
    await designationDoc.update(updateData);
    const updatedDoc = await designationDoc.get();
    
    if (!updatedDoc.exists) throw new Error("Designation not found");
    const updatedData = updatedDoc.data() || {};
    
    return {
      id: updatedDoc.id,
      name: updatedData.name,
      level: updatedData.level || 1,
      description: updatedData.description,
      permissions: updatedData.permissions || [],
      createdAt: updatedData.createdAt?.toDate() || new Date()
    } as Designation;
  }

  async deleteDesignation(id: string): Promise<boolean> {
    const designationDoc = this.db.collection("designations").doc(id);
    await designationDoc.delete();
    return true;
  }

  // Permission management methods
  async getPermissionGroup(id: string): Promise<PermissionGroup | undefined> {
    const permissionDoc = this.db.collection("permission_groups").doc(id);
    const docSnap = await permissionDoc.get();
    if (!docSnap.exists) return undefined;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data?.name,
      department: data?.department,
      designation: data?.designation,
      permissions: data?.permissions || [],
      canApprove: data?.canApprove || false,
      maxApprovalAmount: data?.maxApprovalAmount || null,
      createdAt: data?.createdAt?.toDate() || new Date()
    } as PermissionGroup;
  }

  async getPermissionsByDepartmentAndDesignation(department: string, designation: string): Promise<PermissionGroup | undefined> {
    const permissionsRef = this.db.collection("permission_groups");
    const snapshot = await permissionsRef
      .where("department", "==", department)
      .where("designation", "==", designation)
      .get();
    
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      name: data.name,
      department: data.department,
      designation: data.designation,
      permissions: data.permissions || [],
      canApprove: data.canApprove || false,
      maxApprovalAmount: data.maxApprovalAmount || null,
      createdAt: data.createdAt?.toDate() || new Date()
    } as PermissionGroup;
  }

  async listPermissionGroups(): Promise<PermissionGroup[]> {
    const permissionsCollection = this.db.collection("permission_groups");
    const snapshot = await permissionsCollection.get();
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        department: data.department,
        designation: data.designation,
        permissions: data.permissions || [],
        canApprove: data.canApprove || false,
        maxApprovalAmount: data.maxApprovalAmount || null,
        createdAt: data.createdAt?.toDate() || new Date()
      } as PermissionGroup;
    });
  }

  async createPermissionGroup(data: z.infer<typeof insertPermissionGroupSchema>): Promise<PermissionGroup> {
    const validatedData = insertPermissionGroupSchema.parse(data);
    const permissionRef = this.db.collection("permission_groups").doc();
    
    const permissionData = {
      ...validatedData,
      createdAt: Timestamp.now()
    };
    
    await permissionRef.set(permissionData);
    
    return {
      id: permissionRef.id,
      ...validatedData,
      createdAt: new Date()
    } as PermissionGroup;
  }

  async updatePermissionGroup(id: string, data: Partial<z.infer<typeof insertPermissionGroupSchema>>): Promise<PermissionGroup> {
    const permissionDoc = this.db.collection("permission_groups").doc(id);
    const updateData = { ...data, updatedAt: Timestamp.now() };
    
    await permissionDoc.update(updateData);
    const updatedDoc = await permissionDoc.get();
    
    if (!updatedDoc.exists) throw new Error("Permission group not found");
    const updatedData = updatedDoc.data() || {};
    
    return {
      id: updatedDoc.id,
      name: updatedData.name,
      department: updatedData.department,
      designation: updatedData.designation,
      permissions: updatedData.permissions || [],
      canApprove: updatedData.canApprove || false,
      maxApprovalAmount: updatedData.maxApprovalAmount || null,
      createdAt: updatedData.createdAt?.toDate() || new Date()
    } as PermissionGroup;
  }

  async deletePermissionGroup(id: string): Promise<boolean> {
    const permissionDoc = this.db.collection("permission_groups").doc(id);
    await permissionDoc.delete();
    return true;
  }

  // User permission utility methods
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.getUser(userId);
    if (!user || !user.department || !user.designation) return [];
    
    const permissionGroup = await this.getPermissionsByDepartmentAndDesignation(user.department, user.designation);
    return permissionGroup?.permissions || [];
  }

  async checkUserPermission(userId: string, permission: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.includes(permission);
  }

  async getUserApprovalLimits(userId: string): Promise<{ canApprove: boolean; maxAmount: number | null }> {
    const user = await this.getUser(userId);
    if (!user || !user.department || !user.designation) {
      return { canApprove: false, maxAmount: null };
    }
    
    const permissionGroup = await this.getPermissionsByDepartmentAndDesignation(user.department, user.designation);
    return {
      canApprove: permissionGroup?.canApprove || false,
      maxAmount: permissionGroup?.maxApprovalAmount || null
    };
  }

  // Check effective user permission based on department + designation
  async checkEffectiveUserPermission(userId: string, permission: string): Promise<boolean> {
    try {
      console.log(`SERVER PERMISSION CHECK: Checking permission '${permission}' for user '${userId}'`);
      const user = await this.getUser(userId);
      if (!user) {
        console.log(`SERVER PERMISSION CHECK: User '${userId}' not found`);
        return false;
      }
      
      console.log(`SERVER PERMISSION CHECK: User found - role: ${user.role}, department: ${user.department}, designation: ${user.designation}`);
      
      // Master admin has all permissions
      if (user.role === "master_admin") {
        console.log(`SERVER PERMISSION CHECK: Master admin detected, granting permission '${permission}'`);
        return true;
      }
      
      // If user doesn't have department or designation, deny access
      if (!user.department || !user.designation) {
        console.log(`SERVER PERMISSION CHECK: User missing department or designation, denying access`);
        return false;
      }
      
      // Import permission calculation logic from shared schema
      const { getEffectivePermissions } = await import("@shared/schema");
      const effectivePermissions = getEffectivePermissions(user.department, user.designation);
      
      const hasPermission = effectivePermissions.includes(permission);
      console.log(`SERVER PERMISSION CHECK: Effective permissions check result: ${hasPermission} for permission '${permission}'`);
      
      return hasPermission;
    } catch (error) {
      console.error("SERVER PERMISSION CHECK ERROR:", error);
      return false;
    }
  }

  // Audit logging implementation
  async createAuditLog(data: z.infer<typeof insertAuditLogSchema>): Promise<AuditLog> {
    const auditDoc = this.db.collection("audit_logs").doc();
    const auditLog = {
      id: auditDoc.id,
      ...data,
      timestamp: new Date(),
      createdAt: new Date()
    };
    
    await auditDoc.set({
      ...auditLog,
      timestamp: Timestamp.fromDate(auditLog.timestamp),
      createdAt: Timestamp.fromDate(auditLog.createdAt)
    });
    
    return auditLog as AuditLog;
  }

  async getAuditLogs(filters?: { userId?: string; entityType?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]> {
    let query: Query = this.db.collection("audit_logs");
    
    if (filters?.userId) {
      query = query.where("userId", "==", filters.userId);
    }
    if (filters?.entityType) {
      query = query.where("entityType", "==", filters.entityType);
    }
    if (filters?.startDate) {
      query = query.where("timestamp", ">=", Timestamp.fromDate(filters.startDate));
    }
    if (filters?.endDate) {
      query = query.where("timestamp", "<=", Timestamp.fromDate(filters.endDate));
    }
    
    const snapshot = await query.orderBy("timestamp", "desc").limit(100).get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date()
      } as AuditLog;
    });
  }

  async listOfficeLocations(): Promise<OfficeLocation[]> {
    const locationsCollection = this.db.collection("office_locations");
    const snapshot = await locationsCollection.get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        radius: data.radius,
        createdAt: data.createdAt?.toDate() || new Date()
      } as OfficeLocation;
    });
  }

  async getOfficeLocation(id: string): Promise<OfficeLocation | undefined> {
    const locationDoc = this.db.collection("office_locations").doc(id);
    const docSnap = await locationDoc.get();
    if (!docSnap.exists) return undefined;
    const data = docSnap.data() || {};
    return { id: docSnap.id, ...data } as OfficeLocation;
  }

  async createOfficeLocation(
    data: z.infer<typeof insertOfficeLocationSchema>,
  ): Promise<OfficeLocation> {
    const validatedData = insertOfficeLocationSchema.parse(data);
    const locationsRef = this.db.collection("office_locations");
    
    const locationDoc = await locationsRef.add({
      ...validatedData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    return { 
      id: locationDoc.id,
      ...validatedData 
    } as OfficeLocation;
  }

  async updateOfficeLocation(
    id: string,
    data: Partial<z.infer<typeof insertOfficeLocationSchema>>,
  ): Promise<OfficeLocation> {
    const validatedData = insertOfficeLocationSchema.partial().parse(data);
    const locationDoc = this.db.collection("office_locations").doc(id);
    
    await locationDoc.update({
      ...validatedData,
      updatedAt: Timestamp.now(),
    });
    
    const updatedDoc = await locationDoc.get();
    if (!updatedDoc.exists) throw new Error("Office location not found");
    
    const docData = updatedDoc.data() || {};
    return { 
      id: updatedDoc.id, 
      name: docData.name,
      latitude: docData.latitude,
      longitude: docData.longitude,
      radius: docData.radius
    } as OfficeLocation;
  }

  async deleteOfficeLocation(id: string): Promise<void> {
    const locationDoc = this.db.collection("office_locations").doc(id);
    await locationDoc.delete();
  }

  async listCustomers(): Promise<Customer[]> {
    const customersCollection = this.db.collection("customers");
    const snapshot = await customersCollection.get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        name: data.name,
        mobile: data.mobile,
        email: data.email,
        address: data.address,
        ebServiceNumber: data.ebServiceNumber,
        propertyType: data.propertyType,
        location: data.location,
        scope: data.scope,
        profileCompleteness: data.profileCompleteness || "basic",
        createdFrom: data.createdFrom || "customers_page",
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate()
      } as Customer;
    });
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const customerDoc = this.db.collection("customers").doc(id);
    const docSnap = await customerDoc.get();
    
    if (!docSnap.exists) return undefined;
    
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      name: data.name,
      mobile: data.mobile,
      email: data.email,
      address: data.address,
      ebServiceNumber: data.ebServiceNumber,
      propertyType: data.propertyType,
      location: data.location,
      scope: data.scope,
      profileCompleteness: data.profileCompleteness || "basic",
      createdFrom: data.createdFrom || "customers_page",
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate()
    } as Customer;
  }

  // NEW: Find customer by mobile number for deduplication
  async findCustomerByMobile(mobile: string): Promise<Customer | undefined> {
    const customersCollection = this.db.collection("customers");
    const snapshot = await customersCollection.where("mobile", "==", mobile).limit(1).get();
    
    if (snapshot.empty) return undefined;
    
    const doc = snapshot.docs[0];
    const data = doc.data() || {};
    return {
      id: doc.id,
      name: data.name,
      mobile: data.mobile,
      email: data.email,
      address: data.address,
      ebServiceNumber: data.ebServiceNumber,
      propertyType: data.propertyType,
      location: data.location,
      scope: data.scope,
      profileCompleteness: data.profileCompleteness || "basic",
      createdFrom: data.createdFrom || "customers_page",
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate()
    } as Customer;
  }

  // UNIFIED: Create or update customer with proper deduplication and merge logic
  async createCustomer(
    data: z.infer<typeof insertCustomerSchema>,
  ): Promise<Customer> {
    const validatedData = insertCustomerSchema.parse(data);
    
    // CRITICAL: Check if customer already exists by mobile number
    const existingCustomer = await this.findCustomerByMobile(validatedData.mobile);
    
    if (existingCustomer) {
      // Customer exists - merge data without overwriting existing values with empty strings
      console.log(`Customer with mobile ${validatedData.mobile} already exists. Merging data.`);
      
      // Helper function to clean and merge fields (only add non-empty, defined values)
      const cleanMerge = (existing: any, incoming: any) => {
        const merged = { ...existing };
        
        Object.keys(incoming).forEach(key => {
          const value = incoming[key];
          // Only update if value is meaningful (not empty string, null, or undefined)
          if (value !== undefined && value !== null && value !== '') {
            merged[key] = value;
          }
        });
        
        return merged;
      };
      
      // Merge only meaningful data, preserving existing values
      const mergedData = cleanMerge(existingCustomer, validatedData);
      
      // Promote profile completeness (full > basic) and keep original creation source
      const finalData = {
        ...mergedData,
        createdFrom: existingCustomer.createdFrom, // Keep original source
        profileCompleteness: this.promoteProfileCompleteness(
          existingCustomer.profileCompleteness,
          validatedData.profileCompleteness || "basic"
        ),
        updatedAt: Timestamp.now()
      };
      
      // Helper function to prune undefined values in-place while preserving Firestore types
      const deepPruneUndefined = (obj: any): void => {
        if (!obj || typeof obj !== 'object') return;
        if (obj instanceof Timestamp) return; // Preserve Firestore Timestamp instances
        if (Array.isArray(obj)) {
          for (const item of obj) {
            deepPruneUndefined(item);
          }
          return;
        }
        
        for (const key of Object.keys(obj)) {
          const value = obj[key];
          if (value === undefined) {
            delete obj[key];
          } else {
            deepPruneUndefined(value);
          }
        }
      };
      
      // Remove read-only fields (id, createdAt) and clean undefined values for Firestore update
      const { id, createdAt, ...updateDataForFirestore } = finalData;
      deepPruneUndefined(updateDataForFirestore);
      
      // Update existing customer
      const customerDoc = this.db.collection("customers").doc(existingCustomer.id);
      await customerDoc.update(updateDataForFirestore);
      
      // Return updated customer with proper data structure
      return {
        ...finalData,
        id: existingCustomer.id,
        createdAt: existingCustomer.createdAt,
        updatedAt: new Date()
      } as Customer;
      
    } else {
      // No existing customer - create new record
      console.log(`Creating new customer with mobile ${validatedData.mobile}`);
      
      const customersRef = this.db.collection("customers");
      const newCustomerData = {
        ...validatedData,
        profileCompleteness: this.determineProfileCompleteness(validatedData),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const customerDoc = await customersRef.add(newCustomerData);
      
      return {
        id: customerDoc.id,
        ...validatedData,
        profileCompleteness: newCustomerData.profileCompleteness,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Customer;
    }
  }

  // Helper method to determine profile completeness based on available data
  private determineProfileCompleteness(customerData: any): "basic" | "full" {
    const hasBasicInfo = customerData.name && customerData.mobile;
    const hasExtendedInfo = customerData.email || customerData.address || customerData.scope;
    const hasSiteVisitInfo = customerData.propertyType || customerData.ebServiceNumber;
    
    // Consider "full" if has basic info plus either extended info or site visit info
    if (hasBasicInfo && (hasExtendedInfo || hasSiteVisitInfo)) {
      return "full";
    }
    
    return "basic";
  }

  // Helper method to promote profile completeness (full > basic)
  private promoteProfileCompleteness(
    existing: "basic" | "full", 
    incoming: "basic" | "full"
  ): "basic" | "full" {
    // Always promote to the higher level (full > basic)
    if (existing === "full" || incoming === "full") {
      return "full";
    }
    return "basic";
  }

  async updateCustomer(
    id: string,
    data: Partial<z.infer<typeof insertCustomerSchema>>,
  ): Promise<Customer> {
    const validatedData = insertCustomerSchema.partial().parse(data);
    const customerDoc = this.db.collection("customers").doc(id);
    
    // Get current customer to merge with updates
    const currentDoc = await customerDoc.get();
    if (!currentDoc.exists) throw new Error("Customer not found");
    
    const currentData = currentDoc.data() || {};
    const mergedData = { ...currentData, ...validatedData };
    
    await customerDoc.update({
      ...validatedData,
      profileCompleteness: this.determineProfileCompleteness(mergedData),
      updatedAt: Timestamp.now(),
    });
    
    const updatedDoc = await customerDoc.get();
    const updatedData = updatedDoc.data() || {};
    return {
      id: updatedDoc.id,
      name: updatedData.name,
      mobile: updatedData.mobile,
      email: updatedData.email,
      address: updatedData.address,
      ebServiceNumber: updatedData.ebServiceNumber,
      propertyType: updatedData.propertyType,
      location: updatedData.location,
      scope: updatedData.scope,
      profileCompleteness: updatedData.profileCompleteness,
      createdFrom: updatedData.createdFrom,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate()
    } as Customer;
  }

  async deleteCustomer(id: string): Promise<void> {
    const customerDoc = this.db.collection("customers").doc(id);
    await customerDoc.delete();
  }

  async listProducts(): Promise<Product[]> {
    const productsCollection = this.db.collection("products");
    const snapshot = await productsCollection.get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        price: data.price,
        createdAt: data.createdAt?.toDate() || new Date()
      } as Product;
    });
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const productDoc = this.db.collection("products").doc(id);
    const docSnap = await productDoc.get();
    
    if (!docSnap.exists) return undefined;
    
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      name: data.name,
      description: data.description,
      price: data.price,
      createdAt: data.createdAt?.toDate() || new Date()
    } as Product;
  }

  async createProduct(
    data: z.infer<typeof insertProductSchema>,
  ): Promise<Product> {
    const validatedData = insertProductSchema.parse(data);
    const productsRef = this.db.collection("products");
    
    const productDoc = await productsRef.add({
      ...validatedData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    return {
      id: productDoc.id,
      ...validatedData,
      createdAt: new Date(),
    } as Product;
  }

  async updateProduct(
    id: string,
    data: Partial<z.infer<typeof insertProductSchema>>,
  ): Promise<Product> {
    const validatedData = insertProductSchema.partial().parse(data);
    const productDoc = this.db.collection("products").doc(id);
    
    await productDoc.update({
      ...validatedData,
      updatedAt: Timestamp.now(),
    });
    
    const updatedDoc = await productDoc.get();
    if (!updatedDoc.exists) throw new Error("Product not found");
    
    const updatedData = updatedDoc.data() || {};
    return {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
    } as Product;
  }

  async deleteProduct(id: string): Promise<void> {
    const productDoc = this.db.collection("products").doc(id);
    await productDoc.delete();
  }

  async listQuotations(): Promise<Quotation[]> {
    const quotationsCollection = this.db.collection("quotations");
    const snapshot = await quotationsCollection.get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Quotation;
    });
  }

  async getQuotation(id: string): Promise<Quotation | undefined> {
    const quotationDoc = this.db.collection("quotations").doc(id);
    const docSnap = await quotationDoc.get();
    
    if (!docSnap.exists) return undefined;
    
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as Quotation;
  }

  async createQuotation(
    data: z.infer<typeof insertQuotationSchema>,
  ): Promise<Quotation> {
    try {
      console.log("\n\n🎯🎯🎯 STORAGE.CREATE_QUOTATION CALLED 🎯🎯🎯");
      console.log("📥 Input data keys:", Object.keys(data));
      console.log("📥 Full input data:", JSON.stringify(data, null, 2));
      
      console.log("\n🔍 Starting schema validation...");
      const validatedData = insertQuotationSchema.parse(data);
      
      console.log("✅ Schema validation passed!");
      console.log("📤 Validated data keys:", Object.keys(validatedData));
      console.log("📤 Validated data:", JSON.stringify(validatedData, null, 2));
      
      const quotationsRef = this.db.collection("quotations");
      
      const quotationDoc = await quotationsRef.add({
        ...validatedData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      console.log("✅ Quotation saved to Firestore:", quotationDoc.id);
      
      return {
        id: quotationDoc.id,
        ...validatedData,
        createdAt: new Date(),
      } as Quotation;
    } catch (error) {
      console.error("\n❌ ERROR IN STORAGE.CREATE_QUOTATION ❌");
      console.error("Error type:", error instanceof z.ZodError ? "ZodError" : error.constructor.name);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      
      if (error instanceof z.ZodError) {
        console.error("\n🔴 ZOD VALIDATION ERRORS DETAILED:");
        error.errors.forEach((err, idx) => {
          console.error(`\n❌ ERROR ${idx + 1}:`);
          console.error(`   Path: ${err.path.join(" → ")}`);
          console.error(`   Code: ${err.code}`);
          console.error(`   Message: ${err.message}`);
          console.error(`   Full error object:`, JSON.stringify(err, null, 2));
        });
      }
      
      console.error("Full error stack:", error instanceof Error ? error.stack : "No stack");
      throw error;
    }
  }

  async updateQuotation(
    id: string,
    data: Partial<z.infer<typeof insertQuotationSchema>>,
    updatedBy: string
  ): Promise<Quotation> {
    const validatedData = insertQuotationSchema.partial().parse(data);
    const quotationDoc = this.db.collection("quotations").doc(id);
    
    // Fetch current quotation to create revision history
    const currentDoc = await quotationDoc.get();
    if (!currentDoc.exists) throw new Error("Quotation not found");
    
    const currentData = currentDoc.data() || {};
    const currentVersion = currentData.documentVersion || 1;
    
    // Create revision history entry with snapshot of current state
    const revisionEntry = {
      version: currentVersion,
      updatedAt: Timestamp.now(),
      updatedBy,
      changeNote: `Revision ${currentVersion + 1}`
    };
    
    // Append to existing revision history or create new array
    const existingHistory = currentData.revisionHistory || [];
    const updatedHistory = [...existingHistory, revisionEntry];
    
    // Remove undefined values from validatedData (Firestore doesn't accept undefined)
    const cleanedData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== undefined)
    );
    
    // Update quotation with incremented version and revision history
    await quotationDoc.update({
      ...cleanedData,
      documentVersion: currentVersion + 1,
      revisionHistory: updatedHistory,
      updatedAt: Timestamp.now(),
    });
    
    const updatedDoc = await quotationDoc.get();
    if (!updatedDoc.exists) throw new Error("Quotation not found after update");
    
    const updatedData = updatedDoc.data() || {};
    return {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
      revisionHistory: updatedData.revisionHistory?.map((r: any) => ({
        ...r,
        updatedAt: r.updatedAt?.toDate() || new Date()
      }))
    } as Quotation;
  }

  async deleteQuotation(id: string): Promise<void> {
    const quotationDoc = this.db.collection("quotations").doc(id);
    await quotationDoc.delete();
  }

  async listInvoices(): Promise<Invoice[]> {
    const invoicesCollection = this.db.collection("invoices");
    const snapshot = await invoicesCollection.get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        quotationId: data.quotationId,
        customerId: data.customerId,
        total: data.total,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date()
      } as Invoice;
    });
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const invoiceDoc = this.db.collection("invoices").doc(id);
    const docSnap = await invoiceDoc.get();
    
    if (!docSnap.exists) return undefined;
    
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      quotationId: data.quotationId,
      customerId: data.customerId,
      total: data.total,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date()
    } as Invoice;
  }

  async createInvoice(
    data: z.infer<typeof insertInvoiceSchema>,
  ): Promise<Invoice> {
    const validatedData = insertInvoiceSchema.parse(data);
    const invoicesRef = this.db.collection("invoices");
    
    const invoiceDoc = await invoicesRef.add({
      ...validatedData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    return {
      id: invoiceDoc.id,
      ...validatedData,
      createdAt: new Date(),
    } as Invoice;
  }

  async updateInvoice(
    id: string,
    data: Partial<z.infer<typeof insertInvoiceSchema>>,
  ): Promise<Invoice> {
    const validatedData = insertInvoiceSchema.partial().parse(data);
    const invoiceDoc = this.db.collection("invoices").doc(id);
    
    await invoiceDoc.update({
      ...validatedData,
      updatedAt: Timestamp.now(),
    });
    
    const updatedDoc = await invoiceDoc.get();
    if (!updatedDoc.exists) throw new Error("Invoice not found");
    
    const updatedData = updatedDoc.data() || {};
    return {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
    } as Invoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    const invoiceDoc = this.db.collection("invoices").doc(id);
    await invoiceDoc.delete();
  }

  async createAttendance(
    data: z.infer<typeof insertAttendanceSchema>,
  ): Promise<Attendance> {
    const userDoc = await this.db.collection("users").doc(data.userId).get();
    const attendanceDate = data.date ? new Date(data.date) : new Date();
    const dateString = attendanceDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const validatedData = insertAttendanceSchema.parse({
      ...data,
      date: data.date || new Date(),
      checkInTime: data.checkInTime || new Date(),
      checkOutTime: data.checkOutTime,
    });
    
    // Filter out undefined values to prevent Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== undefined)
    );

    const attendanceRef = this.db.collection("attendance");
    const attendanceDoc = await attendanceRef.add({
      ...cleanData,
      date: Timestamp.fromDate(validatedData.date),
      checkInTime: validatedData.checkInTime ? Timestamp.fromDate(validatedData.checkInTime) : Timestamp.now(),
      checkOutTime: validatedData.checkOutTime ? Timestamp.fromDate(validatedData.checkOutTime) : null,
      location: validatedData.attendanceType || "office",
      dateString: dateString,
      userEmail: userDoc.exists ? userDoc.data()?.email || "" : "",
      userDepartment: userDoc.exists ? userDoc.data()?.department || null : null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    return {
      id: attendanceDoc.id,
      ...validatedData,
      userEmail: userDoc.exists ? userDoc.data()?.email || "" : "",
      userDepartment: userDoc.exists ? userDoc.data()?.department || null : null,
      date: new Date(),
      checkInTime: validatedData.checkInTime instanceof Timestamp ? validatedData.checkInTime.toDate() : undefined,
      checkOutTime: validatedData.checkOutTime instanceof Timestamp ? validatedData.checkOutTime.toDate() : undefined,
    } as Attendance;
  }

  async updateAttendance(
    id: string,
    data: Partial<z.infer<typeof insertAttendanceSchema>>,
  ): Promise<Attendance> {
    // Handle data type conversions before validation
    const processedData = { ...data };
    
    // Convert latitude/longitude from numbers to strings if they exist
    if (typeof processedData.checkOutLatitude === 'number') {
      processedData.checkOutLatitude = String(processedData.checkOutLatitude);
    }
    if (typeof processedData.checkOutLongitude === 'number') {
      processedData.checkOutLongitude = String(processedData.checkOutLongitude);
    }
    if (typeof processedData.checkInLatitude === 'number') {
      processedData.checkInLatitude = String(processedData.checkInLatitude);
    }
    if (typeof processedData.checkInLongitude === 'number') {
      processedData.checkInLongitude = String(processedData.checkInLongitude);
    }
    
    // Now validate the processed data
    const validatedData = insertAttendanceSchema.partial().parse(processedData);
    
    // Then prepare for Firestore with timestamp conversion
    const firestoreData: any = {
      ...validatedData,
      updatedAt: Timestamp.now(),
    };
    
    // Convert dates to Firestore timestamps, only if they exist
    if (validatedData.date) {
      firestoreData.date = Timestamp.fromDate(validatedData.date);
    }
    if (validatedData.checkInTime) {
      firestoreData.checkInTime = Timestamp.fromDate(validatedData.checkInTime);
    }
    if (validatedData.checkOutTime) {
      firestoreData.checkOutTime = Timestamp.fromDate(validatedData.checkOutTime);
    }
    if (validatedData.otStartTime) {
      firestoreData.otStartTime = Timestamp.fromDate(validatedData.otStartTime);
    }
    if (validatedData.otEndTime) {
      firestoreData.otEndTime = Timestamp.fromDate(validatedData.otEndTime);
    }
    
    // Remove undefined values to avoid Firestore errors
    Object.keys(firestoreData).forEach(key => {
      if (firestoreData[key] === undefined) {
        delete firestoreData[key];
      }
    });
    
    const attendanceDoc = this.db.collection("attendance").doc(id);
    
    await attendanceDoc.update(firestoreData);
    
    const updatedDoc = await attendanceDoc.get();
    if (!updatedDoc.exists) throw new Error("Attendance not found");
    
    const updatedData = updatedDoc.data() || {};
    return {
      id: updatedDoc.id,
      ...updatedData,
      date: updatedData.date?.toDate() || new Date(),
      checkInTime: updatedData.checkInTime?.toDate() || null,
      checkOutTime: updatedData.checkOutTime?.toDate() || null,
      otStartTime: updatedData.otStartTime?.toDate() || undefined,
      otEndTime: updatedData.otEndTime?.toDate() || undefined,
    } as Attendance;
  }

  async getAttendanceByUserAndDate(
    userId: string,
    date: Date,
  ): Promise<Attendance | undefined> {
    const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    const attendanceRef = this.db.collection("attendance");
    const snapshot = await attendanceRef
      .where("userId", "==", userId)
      .where("dateString", "==", dateStr)
      .limit(1)
      .get();
    
    if (snapshot.empty) return undefined;
    
    const record = snapshot.docs[0];
    const data = record.data() || {};
    
    return {
      id: record.id,
      ...data,
      date: data.date?.toDate() || new Date(),
      checkInTime: data.checkInTime?.toDate() || null,
      checkOutTime: data.checkOutTime?.toDate() || null,
      otStartTime: data.otStartTime?.toDate() || undefined,
      otEndTime: data.otEndTime?.toDate() || undefined,
    } as Attendance;
  }

  async listAttendanceByUser(userId: string): Promise<Attendance[]> {
    try {
      console.log(`STORAGE: Querying attendance for userId: ${userId}`);
      const attendanceRef = this.db.collection("attendance");
      const snapshot = await attendanceRef
        .where("userId", "==", userId)
        .get();
      
      console.log(`STORAGE: Found ${snapshot.docs.length} attendance records for userId: ${userId}`);
      
      const attendanceRecords = snapshot.docs.map(doc => {
        const data = doc.data() || {};
        const record = {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || new Date(),
          checkInTime: data.checkInTime?.toDate() || null,
          checkOutTime: data.checkOutTime?.toDate() || null,
          otStartTime: data.otStartTime?.toDate() || undefined,
          otEndTime: data.otEndTime?.toDate() || undefined,
        } as Attendance;
        
        console.log(`STORAGE: Record ${doc.id} - Date: ${record.date?.toISOString()}, Status: ${record.status}, UserID: ${record.userId}`);
        return record;
      });
      
      return attendanceRecords;
    } catch (error) {
      console.error(`STORAGE: Error querying attendance for userId ${userId}:`, error);
      return [];
    }
  }

  async listAttendanceByDate(date: Date): Promise<Attendance[]> {
    const startOfDay = Timestamp.fromDate(new Date(date.setHours(0, 0, 0, 0)));
    const endOfDay = Timestamp.fromDate(
      new Date(date.setHours(23, 59, 59, 999)),
    );
    
    const attendanceRef = this.db.collection("attendance");
    const snapshot = await attendanceRef
      .where("date", ">=", startOfDay)
      .where("date", "<=", endOfDay)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        checkInTime: data.checkInTime?.toDate() || null,
        checkOutTime: data.checkOutTime?.toDate() || null,
        otStartTime: data.otStartTime?.toDate() || undefined,
        otEndTime: data.otEndTime?.toDate() || undefined,
      } as Attendance;
    });
  }

  async listAttendanceBetweenDates(
    startDate: Date,
    endDate: Date,
  ): Promise<Attendance[]> {
    const startTimestamp = Timestamp.fromDate(new Date(startDate.setHours(0, 0, 0, 0)));
    const endTimestamp = Timestamp.fromDate(
      new Date(endDate.setHours(23, 59, 59, 999)),
    );
    
    const attendanceRef = this.db.collection("attendance");
    const snapshot = await attendanceRef
      .where("date", ">=", startTimestamp)
      .where("date", "<=", endTimestamp)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        checkInTime: data.checkInTime?.toDate() || null,
        checkOutTime: data.checkOutTime?.toDate() || null,
        otStartTime: data.otStartTime?.toDate() || undefined,
        otEndTime: data.otEndTime?.toDate() || undefined,
      } as Attendance;
    });
  }

  async listAttendanceByUserBetweenDates(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Attendance[]> {
    const startTimestamp = Timestamp.fromDate(new Date(startDate.setHours(0, 0, 0, 0)));
    const endTimestamp = Timestamp.fromDate(
      new Date(endDate.setHours(23, 59, 59, 999)),
    );
    
    const attendanceRef = this.db.collection("attendance");
    const snapshot = await attendanceRef
      .where("userId", "==", userId)
      .where("date", ">=", startTimestamp)
      .where("date", "<=", endTimestamp)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        checkInTime: data.checkInTime?.toDate() || null,
        checkOutTime: data.checkOutTime?.toDate() || null,
        otStartTime: data.otStartTime?.toDate() || undefined,
        otEndTime: data.otEndTime?.toDate() || undefined,
      } as Attendance;
    });
  }

  async getAttendance(id: string): Promise<Attendance | undefined> {
    const attendanceDoc = this.db.collection("attendance").doc(id);
    const docSnap = await attendanceDoc.get();
    if (!docSnap.exists) return undefined;
    
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      ...data,
      date: data.date?.toDate() || new Date(),
      checkInTime: data.checkInTime?.toDate() || null,
      checkOutTime: data.checkOutTime?.toDate() || null,
      otStartTime: data.otStartTime?.toDate() || undefined,
      otEndTime: data.otEndTime?.toDate() || undefined,
    } as Attendance;
  }

  async getUserAttendanceForDate(userId: string, date: string): Promise<Attendance | undefined> {
    const targetDate = new Date(date);
    return this.getAttendanceByUserAndDate(userId, targetDate);
  }

  async listAttendanceBetweenDates(
    startDate: Date,
    endDate: Date,
  ): Promise<Attendance[]> {
    const start = Timestamp.fromDate(startDate);
    const end = Timestamp.fromDate(endDate);
    
    const attendanceRef = this.db.collection("attendance");
    const snapshot = await attendanceRef
      .where("date", ">=", start)
      .where("date", "<=", end)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        checkInTime: data.checkInTime?.toDate() || null,
        checkOutTime: data.checkOutTime?.toDate() || null,
        otStartTime: data.otStartTime?.toDate() || undefined,
        otEndTime: data.otEndTime?.toDate() || undefined,
      } as Attendance;
    });
  }

  async getLeave(id: string): Promise<Leave | undefined> {
    const leaveDoc = this.db.collection("leaves").doc(id);
    const docSnap = await leaveDoc.get();
    
    if (!docSnap.exists) return undefined;
    
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      ...data,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as Leave;
  }

  async listLeavesByUser(userId: string): Promise<Leave[]> {
    const leavesRef = this.db.collection("leaves");
    const snapshot = await leavesRef
      .where("userId", "==", userId)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Leave;
    });
  }

  async listPendingLeaves(): Promise<Leave[]> {
    const leavesRef = this.db.collection("leaves");
    const snapshot = await leavesRef
      .where("status", "==", "pending")
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Leave;
    });
  }

  async createLeave(data: z.infer<typeof insertLeaveSchema>): Promise<Leave> {
    const validatedData = insertLeaveSchema.parse({
      ...data,
      startDate: Timestamp.fromDate(data.startDate),
      endDate: Timestamp.fromDate(data.endDate),
    });
    
    const leavesRef = this.db.collection("leaves");
    const leaveDoc = await leavesRef.add({
      ...validatedData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    return {
      id: leaveDoc.id,
      ...validatedData,
      startDate: new Date(),
      endDate: new Date(),
      createdAt: new Date(),
    } as Leave;
  }

  async updateLeave(
    id: string,
    data: Partial<z.infer<typeof insertLeaveSchema>>,
  ): Promise<Leave> {
    const validatedData = insertLeaveSchema.partial().parse({
      ...data,
      startDate: data.startDate
        ? Timestamp.fromDate(data.startDate)
        : undefined,
      endDate: data.endDate ? Timestamp.fromDate(data.endDate) : undefined,
    });
    
    const leaveDoc = this.db.collection("leaves").doc(id);
    
    await leaveDoc.update({ 
      ...validatedData, 
      updatedAt: Timestamp.now() 
    });
    
    const updatedDoc = await leaveDoc.get();
    if (!updatedDoc.exists) throw new Error("Leave not found");
    
    const updatedData = updatedDoc.data() || {};
    return {
      id: updatedDoc.id,
      ...updatedData,
      startDate: updatedData.startDate?.toDate() || new Date(),
      endDate: updatedData.endDate?.toDate() || new Date(),
      createdAt: updatedData.createdAt?.toDate() || new Date(),
    } as Leave;
  }

  // ===================== Comprehensive Leave Management System =====================
  
  // Leave Balance Management
  async getLeaveBalance(userId: string, month: number, year: number): Promise<LeaveBalance | undefined> {
    const balanceRef = this.db.collection("leave_balances");
    const snapshot = await balanceRef
      .where("userId", "==", userId)
      .where("month", "==", month)
      .where("year", "==", year)
      .get();
    
    if (snapshot.empty) return undefined;
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      employeeId: data.employeeId,
      casualLeaveBalance: data.casualLeaveBalance,
      permissionHoursBalance: data.permissionHoursBalance,
      casualLeaveUsed: data.casualLeaveUsed,
      permissionHoursUsed: data.permissionHoursUsed,
      year: data.year,
      month: data.month,
      casualLeaveHistory: data.casualLeaveHistory?.map((h: any) => ({
        date: h.date?.toDate() || new Date(),
        days: h.days,
        leaveId: h.leaveId
      })) || [],
      permissionHistory: data.permissionHistory?.map((h: any) => ({
        date: h.date?.toDate() || new Date(),
        hours: h.hours,
        leaveId: h.leaveId
      })) || [],
      lastResetDate: data.lastResetDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as LeaveBalance;
  }

  async getCurrentLeaveBalance(userId: string): Promise<LeaveBalance | undefined> {
    const now = new Date();
    return this.getLeaveBalance(userId, now.getMonth() + 1, now.getFullYear());
  }

  async createLeaveBalance(data: z.infer<typeof insertLeaveBalanceSchema>): Promise<LeaveBalance> {
    // Validate the input data
    const validatedData = insertLeaveBalanceSchema.parse(data);
    
    const balanceRef = this.db.collection("leave_balances").doc();
    const balanceData = {
      ...validatedData,
      casualLeaveHistory: validatedData.casualLeaveHistory.map(h => ({
        date: Timestamp.fromDate(h.date),
        days: h.days,
        leaveId: h.leaveId
      })),
      permissionHistory: validatedData.permissionHistory.map(h => ({
        date: Timestamp.fromDate(h.date),
        hours: h.hours,
        leaveId: h.leaveId
      })),
      lastResetDate: Timestamp.fromDate(validatedData.lastResetDate),
      createdAt: Timestamp.fromDate(validatedData.createdAt),
      updatedAt: Timestamp.fromDate(validatedData.updatedAt),
    };
    
    await balanceRef.set(balanceData);
    
    return {
      id: balanceRef.id,
      ...validatedData,
    };
  }

  async updateLeaveBalance(id: string, data: Partial<z.infer<typeof insertLeaveBalanceSchema>>): Promise<LeaveBalance> {
    // Validate the partial input data
    const validatedData = insertLeaveBalanceSchema.partial().parse(data);
    
    const balanceDoc = this.db.collection("leave_balances").doc(id);
    const updateData: any = { 
      ...validatedData, 
      updatedAt: Timestamp.now() 
    };
    
    // Convert date fields to Timestamp if present
    if (validatedData.casualLeaveHistory) {
      updateData.casualLeaveHistory = validatedData.casualLeaveHistory.map(h => ({
        date: Timestamp.fromDate(h.date),
        days: h.days,
        leaveId: h.leaveId
      }));
    }
    if (validatedData.permissionHistory) {
      updateData.permissionHistory = validatedData.permissionHistory.map(h => ({
        date: Timestamp.fromDate(h.date),
        hours: h.hours,
        leaveId: h.leaveId
      }));
    }
    if (validatedData.lastResetDate) {
      updateData.lastResetDate = Timestamp.fromDate(validatedData.lastResetDate);
    }
    
    await balanceDoc.update(updateData);
    
    const updatedDoc = await balanceDoc.get();
    if (!updatedDoc.exists) throw new Error("Leave balance not found");
    
    const updatedData = updatedDoc.data() || {};
    return {
      id: updatedDoc.id,
      userId: updatedData.userId,
      employeeId: updatedData.employeeId,
      casualLeaveBalance: updatedData.casualLeaveBalance,
      permissionHoursBalance: updatedData.permissionHoursBalance,
      casualLeaveUsed: updatedData.casualLeaveUsed,
      permissionHoursUsed: updatedData.permissionHoursUsed,
      year: updatedData.year,
      month: updatedData.month,
      casualLeaveHistory: updatedData.casualLeaveHistory?.map((h: any) => ({
        date: h.date?.toDate() || new Date(),
        days: h.days,
        leaveId: h.leaveId
      })) || [],
      permissionHistory: updatedData.permissionHistory?.map((h: any) => ({
        date: h.date?.toDate() || new Date(),
        hours: h.hours,
        leaveId: h.leaveId
      })) || [],
      lastResetDate: updatedData.lastResetDate?.toDate() || new Date(),
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
    } as LeaveBalance;
  }

  async listLeaveBalancesByYear(year: number): Promise<LeaveBalance[]> {
    const balanceRef = this.db.collection("leave_balances");
    const snapshot = await balanceRef.where("year", "==", year).get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        employeeId: data.employeeId,
        casualLeaveBalance: data.casualLeaveBalance,
        permissionHoursBalance: data.permissionHoursBalance,
        casualLeaveUsed: data.casualLeaveUsed,
        permissionHoursUsed: data.permissionHoursUsed,
        year: data.year,
        month: data.month,
        casualLeaveHistory: data.casualLeaveHistory?.map((h: any) => ({
          date: h.date?.toDate() || new Date(),
          days: h.days,
          leaveId: h.leaveId
        })) || [],
        permissionHistory: data.permissionHistory?.map((h: any) => ({
          date: h.date?.toDate() || new Date(),
          hours: h.hours,
          leaveId: h.leaveId
        })) || [],
        lastResetDate: data.lastResetDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as LeaveBalance;
    });
  }

  async resetMonthlyLeaveBalances(month: number, year: number): Promise<void> {
    const usersSnapshot = await this.db.collection("users").where("isActive", "!=", false).get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Check if balance already exists for this month
      const existingBalance = await this.getLeaveBalance(userId, month, year);
      
      if (!existingBalance) {
        // Create new balance for the month
        await this.createLeaveBalance({
          userId,
          employeeId: userData.employeeId || userId,
          casualLeaveBalance: 1,
          permissionHoursBalance: 2,
          casualLeaveUsed: 0,
          permissionHoursUsed: 0,
          year,
          month,
          casualLeaveHistory: [],
          permissionHistory: [],
          lastResetDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  // Leave Application Management
  async getLeaveApplication(id: string): Promise<LeaveApplication | undefined> {
    const leaveDoc = this.db.collection("leave_applications").doc(id);
    const docSnap = await leaveDoc.get();
    
    if (!docSnap.exists) return undefined;
    
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      userId: data.userId,
      employeeId: data.employeeId,
      userName: data.userName,
      userDepartment: data.userDepartment,
      userDesignation: data.userDesignation,
      leaveType: data.leaveType,
      startDate: data.startDate?.toDate(),
      endDate: data.endDate?.toDate(),
      totalDays: data.totalDays,
      permissionDate: data.permissionDate?.toDate(),
      permissionStartTime: data.permissionStartTime,
      permissionEndTime: data.permissionEndTime,
      permissionHours: data.permissionHours,
      reason: data.reason,
      status: data.status,
      reportingManagerId: data.reportingManagerId,
      reportingManagerName: data.reportingManagerName,
      managerApprovedAt: data.managerApprovedAt?.toDate(),
      managerApprovedBy: data.managerApprovedBy,
      managerRemarks: data.managerRemarks,
      hrApprovedAt: data.hrApprovedAt?.toDate(),
      hrApprovedBy: data.hrApprovedBy,
      hrRemarks: data.hrRemarks,
      rejectedAt: data.rejectedAt?.toDate(),
      rejectedBy: data.rejectedBy,
      rejectionReason: data.rejectionReason,
      balanceAtApplication: data.balanceAtApplication,
      affectsPayroll: data.affectsPayroll,
      deductionAmount: data.deductionAmount,
      applicationDate: data.applicationDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as LeaveApplication;
  }

  async createLeaveApplication(data: z.infer<typeof insertLeaveApplicationSchema>): Promise<LeaveApplication> {
    // Validate the input data
    const validatedData = insertLeaveApplicationSchema.parse(data);
    
    const leaveRef = this.db.collection("leave_applications").doc();
    const leaveData: any = {
      ...validatedData,
      startDate: validatedData.startDate ? Timestamp.fromDate(validatedData.startDate) : undefined,
      endDate: validatedData.endDate ? Timestamp.fromDate(validatedData.endDate) : undefined,
      permissionDate: validatedData.permissionDate ? Timestamp.fromDate(validatedData.permissionDate) : undefined,
      managerApprovedAt: validatedData.managerApprovedAt ? Timestamp.fromDate(validatedData.managerApprovedAt) : undefined,
      hrApprovedAt: validatedData.hrApprovedAt ? Timestamp.fromDate(validatedData.hrApprovedAt) : undefined,
      rejectedAt: validatedData.rejectedAt ? Timestamp.fromDate(validatedData.rejectedAt) : undefined,
      applicationDate: Timestamp.fromDate(validatedData.applicationDate),
      createdAt: Timestamp.fromDate(validatedData.createdAt),
      updatedAt: Timestamp.fromDate(validatedData.updatedAt),
    };
    
    // Remove undefined fields to avoid Firestore errors
    Object.keys(leaveData).forEach(key => {
      if (leaveData[key] === undefined) {
        delete leaveData[key];
      }
    });
    
    await leaveRef.set(leaveData);
    
    return {
      id: leaveRef.id,
      ...validatedData,
    };
  }

  async updateLeaveApplication(id: string, data: Partial<z.infer<typeof insertLeaveApplicationSchema>>): Promise<LeaveApplication> {
    // Validate the partial input data
    const validatedData = insertLeaveApplicationSchema.partial().parse(data);
    
    const leaveDoc = this.db.collection("leave_applications").doc(id);
    const updateData: any = { 
      ...validatedData, 
      updatedAt: Timestamp.now() 
    };
    
    // Convert optional date fields to Timestamp if present
    if (validatedData.startDate) updateData.startDate = Timestamp.fromDate(validatedData.startDate);
    if (validatedData.endDate) updateData.endDate = Timestamp.fromDate(validatedData.endDate);
    if (validatedData.permissionDate) updateData.permissionDate = Timestamp.fromDate(validatedData.permissionDate);
    if (validatedData.managerApprovedAt) updateData.managerApprovedAt = Timestamp.fromDate(validatedData.managerApprovedAt);
    if (validatedData.hrApprovedAt) updateData.hrApprovedAt = Timestamp.fromDate(validatedData.hrApprovedAt);
    if (validatedData.rejectedAt) updateData.rejectedAt = Timestamp.fromDate(validatedData.rejectedAt);
    if (validatedData.applicationDate) updateData.applicationDate = Timestamp.fromDate(validatedData.applicationDate);
    
    // Remove undefined fields to avoid Firestore errors
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await leaveDoc.update(updateData);
    
    const result = await this.getLeaveApplication(id);
    if (!result) throw new Error("Leave application not found after update");
    return result;
  }

  async listLeaveApplicationsByUser(userId: string): Promise<LeaveApplication[]> {
    const leaveRef = this.db.collection("leave_applications");
    const snapshot = await leaveRef
      .where("userId", "==", userId)
      .orderBy("applicationDate", "desc")
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        employeeId: data.employeeId,
        userName: data.userName,
        userDepartment: data.userDepartment,
        userDesignation: data.userDesignation,
        leaveType: data.leaveType,
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
        totalDays: data.totalDays,
        permissionDate: data.permissionDate?.toDate(),
        permissionStartTime: data.permissionStartTime,
        permissionEndTime: data.permissionEndTime,
        permissionHours: data.permissionHours,
        reason: data.reason,
        status: data.status,
        reportingManagerId: data.reportingManagerId,
        reportingManagerName: data.reportingManagerName,
        managerApprovedAt: data.managerApprovedAt?.toDate(),
        managerApprovedBy: data.managerApprovedBy,
        managerRemarks: data.managerRemarks,
        hrApprovedAt: data.hrApprovedAt?.toDate(),
        hrApprovedBy: data.hrApprovedBy,
        hrRemarks: data.hrRemarks,
        rejectedAt: data.rejectedAt?.toDate(),
        rejectedBy: data.rejectedBy,
        rejectionReason: data.rejectionReason,
        balanceAtApplication: data.balanceAtApplication,
        affectsPayroll: data.affectsPayroll,
        deductionAmount: data.deductionAmount,
        applicationDate: data.applicationDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as LeaveApplication;
    });
  }

  async listLeaveApplicationsByManager(managerId: string, status?: string): Promise<LeaveApplication[]> {
    const leaveRef = this.db.collection("leave_applications");
    let query: any = leaveRef.where("reportingManagerId", "==", managerId);
    
    if (status) {
      query = query.where("status", "==", status);
    }
    
    const snapshot = await query.orderBy("applicationDate", "desc").get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        employeeId: data.employeeId,
        userName: data.userName,
        userDepartment: data.userDepartment,
        userDesignation: data.userDesignation,
        leaveType: data.leaveType,
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
        totalDays: data.totalDays,
        permissionDate: data.permissionDate?.toDate(),
        permissionStartTime: data.permissionStartTime,
        permissionEndTime: data.permissionEndTime,
        permissionHours: data.permissionHours,
        reason: data.reason,
        status: data.status,
        reportingManagerId: data.reportingManagerId,
        reportingManagerName: data.reportingManagerName,
        managerApprovedAt: data.managerApprovedAt?.toDate(),
        managerApprovedBy: data.managerApprovedBy,
        managerRemarks: data.managerRemarks,
        hrApprovedAt: data.hrApprovedAt?.toDate(),
        hrApprovedBy: data.hrApprovedBy,
        hrRemarks: data.hrRemarks,
        rejectedAt: data.rejectedAt?.toDate(),
        rejectedBy: data.rejectedBy,
        rejectionReason: data.rejectionReason,
        balanceAtApplication: data.balanceAtApplication,
        affectsPayroll: data.affectsPayroll,
        deductionAmount: data.deductionAmount,
        applicationDate: data.applicationDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as LeaveApplication;
    });
  }

  async listLeaveApplicationsByHR(status?: string): Promise<LeaveApplication[]> {
    const leaveRef = this.db.collection("leave_applications");
    let query: any = leaveRef;
    
    if (status) {
      query = query.where("status", "==", status);
    }
    
    const snapshot = await query.orderBy("applicationDate", "desc").get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        employeeId: data.employeeId,
        userName: data.userName,
        userDepartment: data.userDepartment,
        userDesignation: data.userDesignation,
        leaveType: data.leaveType,
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
        totalDays: data.totalDays,
        permissionDate: data.permissionDate?.toDate(),
        permissionStartTime: data.permissionStartTime,
        permissionEndTime: data.permissionEndTime,
        permissionHours: data.permissionHours,
        reason: data.reason,
        status: data.status,
        reportingManagerId: data.reportingManagerId,
        reportingManagerName: data.reportingManagerName,
        managerApprovedAt: data.managerApprovedAt?.toDate(),
        managerApprovedBy: data.managerApprovedBy,
        managerRemarks: data.managerRemarks,
        hrApprovedAt: data.hrApprovedAt?.toDate(),
        hrApprovedBy: data.hrApprovedBy,
        hrRemarks: data.hrRemarks,
        rejectedAt: data.rejectedAt?.toDate(),
        rejectedBy: data.rejectedBy,
        rejectionReason: data.rejectionReason,
        balanceAtApplication: data.balanceAtApplication,
        affectsPayroll: data.affectsPayroll,
        deductionAmount: data.deductionAmount,
        applicationDate: data.applicationDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as LeaveApplication;
    });
  }

  async listAllLeaveApplications(filters?: { status?: string; month?: number; year?: number }): Promise<LeaveApplication[]> {
    const leaveRef = this.db.collection("leave_applications");
    let query: any = leaveRef;
    
    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    }
    
    const snapshot = await query.orderBy("applicationDate", "desc").get();
    
    let results = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        employeeId: data.employeeId,
        userName: data.userName,
        userDepartment: data.userDepartment,
        userDesignation: data.userDesignation,
        leaveType: data.leaveType,
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
        totalDays: data.totalDays,
        permissionDate: data.permissionDate?.toDate(),
        permissionStartTime: data.permissionStartTime,
        permissionEndTime: data.permissionEndTime,
        permissionHours: data.permissionHours,
        reason: data.reason,
        status: data.status,
        reportingManagerId: data.reportingManagerId,
        reportingManagerName: data.reportingManagerName,
        managerApprovedAt: data.managerApprovedAt?.toDate(),
        managerApprovedBy: data.managerApprovedBy,
        managerRemarks: data.managerRemarks,
        hrApprovedAt: data.hrApprovedAt?.toDate(),
        hrApprovedBy: data.hrApprovedBy,
        hrRemarks: data.hrRemarks,
        rejectedAt: data.rejectedAt?.toDate(),
        rejectedBy: data.rejectedBy,
        rejectionReason: data.rejectionReason,
        balanceAtApplication: data.balanceAtApplication,
        affectsPayroll: data.affectsPayroll,
        deductionAmount: data.deductionAmount,
        applicationDate: data.applicationDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as LeaveApplication;
    });
    
    // Filter by month/year if provided
    if (filters?.month && filters?.year) {
      results = results.filter(leave => {
        const date = leave.startDate || leave.permissionDate;
        if (date) {
          return date.getMonth() + 1 === filters.month && date.getFullYear() === filters.year;
        }
        return false;
      });
    }
    
    return results;
  }

  async approveLeaveByManager(leaveId: string, managerId: string, remarks?: string): Promise<LeaveApplication> {
    const leave = await this.getLeaveApplication(leaveId);
    if (!leave) throw new Error("Leave application not found");
    
    const manager = await this.getUser(managerId);
    if (!manager) throw new Error("Manager not found");
    
    await this.updateLeaveApplication(leaveId, {
      status: "pending_hr",
      managerApprovedAt: new Date(),
      managerApprovedBy: managerId,
      managerRemarks: remarks,
      reportingManagerName: manager.displayName,
    });
    
    const result = await this.getLeaveApplication(leaveId);
    if (!result) throw new Error("Leave application not found after approval");
    return result;
  }

  async approveLeaveByHR(leaveId: string, hrId: string, remarks?: string): Promise<LeaveApplication> {
    const leave = await this.getLeaveApplication(leaveId);
    if (!leave) throw new Error("Leave application not found");
    
    // Get current leave balance
    const balance = await this.getCurrentLeaveBalance(leave.userId);
    if (!balance) throw new Error("Leave balance not found");
    
    console.log(`[HR Approval] Leave type: ${leave.leaveType}, Days: ${leave.totalDays}, Hours: ${leave.permissionHours}`);
    console.log(`[HR Approval] Before - Casual used: ${balance.casualLeaveUsed}, Permission used: ${balance.permissionHoursUsed}`);
    
    // Update leave application
    await this.updateLeaveApplication(leaveId, {
      status: "approved",
      hrApprovedAt: new Date(),
      hrApprovedBy: hrId,
      hrRemarks: remarks,
    });
    
    // Update leave balance based on leave type
    if (leave.leaveType === "casual_leave" && leave.totalDays) {
      const newCasualUsed = balance.casualLeaveUsed + leave.totalDays;
      console.log(`[HR Approval] Updating casual leave: ${balance.casualLeaveUsed} + ${leave.totalDays} = ${newCasualUsed}`);
      await this.updateLeaveBalance(balance.id, {
        casualLeaveUsed: newCasualUsed,
        casualLeaveHistory: [
          ...balance.casualLeaveHistory,
          {
            date: leave.startDate || new Date(),
            days: leave.totalDays,
            leaveId: leaveId,
          }
        ]
      });
    } else if (leave.leaveType === "permission" && leave.permissionHours) {
      const newPermissionUsed = balance.permissionHoursUsed + leave.permissionHours;
      console.log(`[HR Approval] Updating permission hours: ${balance.permissionHoursUsed} + ${leave.permissionHours} = ${newPermissionUsed}`);
      await this.updateLeaveBalance(balance.id, {
        permissionHoursUsed: newPermissionUsed,
        permissionHistory: [
          ...balance.permissionHistory,
          {
            date: leave.permissionDate || new Date(),
            hours: leave.permissionHours,
            leaveId: leaveId,
          }
        ]
      });
    }
    
    const result = await this.getLeaveApplication(leaveId);
    if (!result) throw new Error("Leave application not found after approval");
    return result;
  }

  async rejectLeave(leaveId: string, rejectedBy: string, reason: string, rejectedByRole: 'manager' | 'hr'): Promise<LeaveApplication> {
    const status = rejectedByRole === 'manager' ? 'rejected_by_manager' : 'rejected_by_hr';
    
    await this.updateLeaveApplication(leaveId, {
      status,
      rejectedAt: new Date(),
      rejectedBy,
      rejectionReason: reason,
    });
    
    const result = await this.getLeaveApplication(leaveId);
    if (!result) throw new Error("Leave application not found after rejection");
    return result;
  }

  async cancelLeaveApplication(leaveId: string, userId: string): Promise<LeaveApplication> {
    const leave = await this.getLeaveApplication(leaveId);
    if (!leave) throw new Error("Leave application not found");
    
    if (leave.userId !== userId) {
      throw new Error("Unauthorized: You can only cancel your own leave applications");
    }
    
    if (leave.status === "approved") {
      throw new Error("Cannot cancel approved leave. Please contact HR.");
    }
    
    await this.updateLeaveApplication(leaveId, {
      status: "cancelled",
    });
    
    const result = await this.getLeaveApplication(leaveId);
    if (!result) throw new Error("Leave application not found after cancellation");
    return result;
  }

  // Fixed Holidays Management
  async getFixedHoliday(id: string): Promise<FixedHoliday | undefined> {
    const holidayDoc = this.db.collection("fixed_holidays").doc(id);
    const docSnap = await holidayDoc.get();
    
    if (!docSnap.exists) return undefined;
    
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      name: data.name,
      date: data.date?.toDate() || new Date(),
      year: data.year,
      type: data.type,
      isPaid: data.isPaid,
      isOptional: data.isOptional,
      applicableDepartments: data.applicableDepartments,
      description: data.description,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as FixedHoliday;
  }

  async createFixedHoliday(data: z.infer<typeof insertFixedHolidaySchema>): Promise<FixedHoliday> {
    // Validate the input data
    const validatedData = insertFixedHolidaySchema.parse(data);
    
    const holidayRef = this.db.collection("fixed_holidays").doc();
    const holidayData = {
      ...validatedData,
      date: Timestamp.fromDate(validatedData.date),
      createdAt: Timestamp.fromDate(validatedData.createdAt),
    };
    
    await holidayRef.set(holidayData);
    
    return {
      id: holidayRef.id,
      ...validatedData,
    };
  }

  async updateFixedHoliday(id: string, data: Partial<z.infer<typeof insertFixedHolidaySchema>>): Promise<FixedHoliday> {
    // Validate the partial input data
    const validatedData = insertFixedHolidaySchema.partial().parse(data);
    
    const holidayDoc = this.db.collection("fixed_holidays").doc(id);
    const updateData: any = { ...validatedData };
    
    // Convert date field to Timestamp if present
    if (validatedData.date) updateData.date = Timestamp.fromDate(validatedData.date);
    if (validatedData.createdAt) updateData.createdAt = Timestamp.fromDate(validatedData.createdAt);
    
    await holidayDoc.update(updateData);
    
    const result = await this.getFixedHoliday(id);
    if (!result) throw new Error("Fixed holiday not found after update");
    return result;
  }

  async deleteFixedHoliday(id: string): Promise<boolean> {
    const holidayDoc = this.db.collection("fixed_holidays").doc(id);
    await holidayDoc.delete();
    return true;
  }

  async listFixedHolidays(year?: number): Promise<FixedHoliday[]> {
    const holidayRef = this.db.collection("fixed_holidays");
    let query: any = holidayRef;
    
    if (year) {
      query = query.where("year", "==", year);
    }
    
    const snapshot = await query.orderBy("date", "asc").get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        date: data.date?.toDate() || new Date(),
        year: data.year,
        type: data.type,
        isPaid: data.isPaid,
        isOptional: data.isOptional,
        applicableDepartments: data.applicableDepartments,
        description: data.description,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as FixedHoliday;
    });
  }

  async initializeFixedHolidays(year: number, createdBy: string): Promise<void> {
    const FIXED_ANNUAL_HOLIDAYS = [
      { name: "May Day", month: 5, day: 1 },
      { name: "Independence Day", month: 8, day: 15 },
      { name: "Gandhi Jayanti", month: 10, day: 2 },
      { name: "Republic Day", month: 1, day: 26 }
    ];
    
    for (const holiday of FIXED_ANNUAL_HOLIDAYS) {
      const existingHolidays = await this.listFixedHolidays(year);
      const alreadyExists = existingHolidays.some(h => 
        h.name === holiday.name && h.year === year
      );
      
      if (!alreadyExists) {
        await this.createFixedHoliday({
          name: holiday.name,
          date: new Date(year, holiday.month - 1, holiday.day),
          year,
          type: "national",
          isPaid: true,
          isOptional: false,
          createdBy,
          createdAt: new Date(),
        });
      }
    }
  }

  // ===================== Phase 2: Enterprise RBAC Implementation =====================

  // Role management
  async getRole(id: string): Promise<Role | undefined> {
    const roleDoc = this.db.collection("roles").doc(id);
    const docSnap = await roleDoc.get();
    if (!docSnap.exists) return undefined;
    
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Role;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const rolesRef = this.db.collection("roles");
    const snapshot = await rolesRef.where("name", "==", name).get();
    if (snapshot.empty) return undefined;
    
    const doc = snapshot.docs[0];
    const data = doc.data() || {};
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Role;
  }

  async listRoles(): Promise<Role[]> {
    const rolesRef = this.db.collection("roles");
    const snapshot = await rolesRef.get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Role;
    });
  }

  async createRole(data: z.infer<typeof insertRoleSchema>): Promise<Role> {
    const validatedData = insertRoleSchema.parse(data);
    const roleDoc = this.db.collection("roles").doc();
    
    const roleData = {
      ...validatedData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    await roleDoc.set(roleData);
    
    return {
      id: roleDoc.id,
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Role;
  }

  async updateRole(id: string, data: Partial<z.infer<typeof insertRoleSchema>>): Promise<Role> {
    const validatedData = insertRoleSchema.partial().parse(data);
    const roleDoc = this.db.collection("roles").doc(id);
    
    await roleDoc.update({ 
      ...validatedData, 
      updatedAt: Timestamp.now() 
    });
    
    const updatedDoc = await roleDoc.get();
    if (!updatedDoc.exists) throw new Error("Role not found");
    
    const updatedData = updatedDoc.data() || {};
    return {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
    } as Role;
  }

  async deleteRole(id: string): Promise<boolean> {
    try {
      await this.db.collection("roles").doc(id).delete();
      return true;
    } catch (error) {
      console.error("Error deleting role:", error);
      return false;
    }
  }

  // User role assignments
  async getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]> {
    const assignmentsRef = this.db.collection("user_role_assignments");
    const snapshot = await assignmentsRef
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        effectiveFrom: data.effectiveFrom?.toDate() || new Date(),
        effectiveTo: data.effectiveTo?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as UserRoleAssignment;
    });
  }

  async getRoleAssignment(id: string): Promise<UserRoleAssignment | undefined> {
    const assignmentDoc = this.db.collection("user_role_assignments").doc(id);
    const docSnap = await assignmentDoc.get();
    if (!docSnap.exists) return undefined;
    
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      ...data,
      effectiveFrom: data.effectiveFrom?.toDate() || new Date(),
      effectiveTo: data.effectiveTo?.toDate() || null,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as UserRoleAssignment;
  }

  async assignUserRole(data: z.infer<typeof insertUserRoleAssignmentSchema>): Promise<UserRoleAssignment> {
    const validatedData = insertUserRoleAssignmentSchema.parse(data);
    const assignmentDoc = this.db.collection("user_role_assignments").doc();
    
    const assignmentData = {
      ...validatedData,
      effectiveFrom: Timestamp.fromDate(validatedData.effectiveFrom),
      effectiveTo: validatedData.effectiveTo ? Timestamp.fromDate(validatedData.effectiveTo) : null,
      createdAt: Timestamp.now(),
    };
    
    await assignmentDoc.set(assignmentData);
    
    return {
      id: assignmentDoc.id,
      ...validatedData,
    } as UserRoleAssignment;
  }

  async revokeUserRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const assignmentsRef = this.db.collection("user_role_assignments");
      const snapshot = await assignmentsRef
        .where("userId", "==", userId)
        .where("roleId", "==", roleId)
        .where("isActive", "==", true)
        .get();
      
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isActive: false, updatedAt: Timestamp.now() });
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error revoking user role:", error);
      return false;
    }
  }

  // Permission overrides
  async getUserPermissionOverrides(userId: string): Promise<PermissionOverride[]> {
    const overridesRef = this.db.collection("permission_overrides");
    const snapshot = await overridesRef
      .where("userId", "==", userId)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        effectiveFrom: data.effectiveFrom?.toDate() || new Date(),
        effectiveTo: data.effectiveTo?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as PermissionOverride;
    });
  }

  async createPermissionOverride(data: z.infer<typeof insertPermissionOverrideSchema>): Promise<PermissionOverride> {
    const validatedData = insertPermissionOverrideSchema.parse(data);
    const overrideDoc = this.db.collection("permission_overrides").doc();
    
    const overrideData = {
      ...validatedData,
      effectiveFrom: Timestamp.fromDate(validatedData.effectiveFrom),
      effectiveTo: validatedData.effectiveTo ? Timestamp.fromDate(validatedData.effectiveTo) : null,
      createdAt: Timestamp.now(),
    };
    
    await overrideDoc.set(overrideData);
    
    return {
      id: overrideDoc.id,
      ...validatedData,
    } as PermissionOverride;
  }

  async revokePermissionOverride(id: string): Promise<boolean> {
    try {
      await this.db.collection("permission_overrides").doc(id).delete();
      return true;
    } catch (error) {
      console.error("Error revoking permission override:", error);
      return false;
    }
  }

  // Enterprise permission resolution
  async getEffectiveUserPermissions(userId: string): Promise<string[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    let permissions: Set<string> = new Set();

    // Master admin gets all permissions
    if (user.role === "master_admin") {
      // Import the required functions
      const { getEffectivePermissions } = await import("@shared/schema");
      const allPermissions = getEffectivePermissions(user.department || "sales", user.designation || "cre");
      // Add system-level permissions for master admin
      allPermissions.forEach(p => permissions.add(p));
      permissions.add("system.settings");
      permissions.add("system.backup");
      permissions.add("system.audit");
      permissions.add("users.delete");
      permissions.add("permissions.assign");
      return Array.from(permissions);
    }

    // Enterprise RBAC: Department + Designation based permissions
    if (user.department && user.designation) {
      try {
        const { getEffectivePermissions } = await import("@shared/schema");
        const departmentDesignationPermissions = getEffectivePermissions(user.department, user.designation);
        departmentDesignationPermissions.forEach(p => permissions.add(p));
      } catch (error) {
        console.error("Error loading schema functions:", error);
        // Fallback to permission groups
        const permissionGroup = await this.getPermissionsByDepartmentAndDesignation(
          user.department, 
          user.designation
        );
        if (permissionGroup) {
          permissionGroup.permissions.forEach(p => permissions.add(p));
        }
      }
    }

    // Phase 2: Additional Role-based permissions
    const roleAssignments = await this.getUserRoleAssignments(userId);
    for (const assignment of roleAssignments) {
      const role = await this.getRole(assignment.roleId);
      if (role) {
        role.permissions.forEach(p => permissions.add(p));
      }
    }

    // Permission overrides (can grant or revoke specific permissions)
    const overrides = await this.getUserPermissionOverrides(userId);
    const currentDate = new Date();
    
    for (const override of overrides) {
      const isActive = (!override.effectiveTo || override.effectiveTo > currentDate) &&
                      override.effectiveFrom <= currentDate;
      
      if (isActive) {
        if (override.granted) {
          permissions.add(override.permission);
        } else {
          permissions.delete(override.permission);
        }
      }
    }

    return Array.from(permissions);
  }



  async getEffectiveUserApprovalLimits(userId: string): Promise<{ canApprove: boolean; maxAmount: Record<string, number | null> }> {
    const user = await this.getUser(userId);
    if (!user) return { canApprove: false, maxAmount: {} };

    let maxAmount: Record<string, number | null> = {
      quotations: null,
      invoices: null,
      expenses: null,
    };
    let canApprove = false;

    // Phase 1: Legacy approval limits
    const legacyLimits = await this.getUserApprovalLimits(userId);
    if (legacyLimits.canApprove) {
      canApprove = true;
      if (legacyLimits.maxAmount !== null) {
        maxAmount.quotations = legacyLimits.maxAmount;
        maxAmount.invoices = legacyLimits.maxAmount;
        maxAmount.expenses = legacyLimits.maxAmount;
      }
    }

    // Phase 2: Role-based approval limits
    const roleAssignments = await this.getUserRoleAssignments(userId);
    for (const assignment of roleAssignments) {
      const role = await this.getRole(assignment.roleId);
      if (role?.approvalLimits) {
        canApprove = true;
        
        if (role.approvalLimits.quotations !== undefined) {
          maxAmount.quotations = Math.max(maxAmount.quotations || 0, role.approvalLimits.quotations || 0);
        }
        if (role.approvalLimits.invoices !== undefined) {
          maxAmount.invoices = Math.max(maxAmount.invoices || 0, role.approvalLimits.invoices || 0);
        }
        if (role.approvalLimits.expenses !== undefined) {
          maxAmount.expenses = Math.max(maxAmount.expenses || 0, role.approvalLimits.expenses || 0);
        }
      }
    }

    return { canApprove, maxAmount };
  }

  // Audit logging
  async createAuditLog(data: z.infer<typeof insertAuditLogSchema>): Promise<AuditLog> {
    const validatedData = insertAuditLogSchema.parse(data);
    const auditDoc = this.db.collection("audit_logs").doc();
    
    const auditData = {
      ...validatedData,
      createdAt: Timestamp.now(),
    };
    
    await auditDoc.set(auditData);
    
    return {
      id: auditDoc.id,
      ...validatedData,
      createdAt: new Date(),
    } as AuditLog;
  }

  async getAuditLogs(filters?: { userId?: string; entityType?: string; startDate?: Date; endDate?: Date }): Promise<AuditLog[]> {
    let query = this.db.collection("audit_logs").orderBy("createdAt", "desc");
    
    if (filters?.userId) {
      query = query.where("userId", "==", filters.userId);
    }
    if (filters?.entityType) {
      query = query.where("entityType", "==", filters.entityType);
    }
    if (filters?.startDate) {
      query = query.where("createdAt", ">=", Timestamp.fromDate(filters.startDate));
    }
    if (filters?.endDate) {
      query = query.where("createdAt", "<=", Timestamp.fromDate(filters.endDate));
    }
    
    const snapshot = await query.limit(1000).get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as AuditLog;
    });
  }

  // ============================================
  // PAYROLL SYSTEM STORAGE METHODS
  // ============================================

  // Salary Structure Management
  async getSalaryStructure(id: string): Promise<SalaryStructure | undefined> {
    const doc = await this.db.collection('salaryStructures').doc(id).get();
    if (!doc.exists) return undefined;
    
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      effectiveFrom: data.effectiveFrom?.toDate() || new Date(),
      effectiveTo: data.effectiveTo?.toDate() || null,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as SalaryStructure;
  }

  async getSalaryStructureByUser(userId: string): Promise<SalaryStructure | undefined> {
    const querySnapshot = await this.db.collection('salaryStructures')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .orderBy('effectiveFrom', 'desc')
      .limit(1)
      .get();
    
    if (querySnapshot.empty) return undefined;
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      effectiveFrom: data.effectiveFrom?.toDate() || new Date(),
      effectiveTo: data.effectiveTo?.toDate() || null,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as SalaryStructure;
  }

  async createSalaryStructure(data: z.infer<typeof insertSalaryStructureSchema>): Promise<SalaryStructure> {
    const doc = this.db.collection('salaryStructures').doc();
    const salaryData = {
      ...data,
      id: doc.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await doc.set(salaryData);
    return salaryData as SalaryStructure;
  }

  async updateSalaryStructure(id: string, data: Partial<z.infer<typeof insertSalaryStructureSchema>>): Promise<SalaryStructure> {
    const doc = this.db.collection('salaryStructures').doc(id);
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    
    await doc.update(updateData);
    
    const updated = await doc.get();
    const updatedData = updated.data()!;
    return {
      id: updated.id,
      ...updatedData,
      effectiveFrom: updatedData.effectiveFrom?.toDate() || new Date(),
      effectiveTo: updatedData.effectiveTo?.toDate() || null,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
    } as SalaryStructure;
  }

  async listSalaryStructures(): Promise<SalaryStructure[]> {
    const querySnapshot = await this.db.collection('salaryStructures')
      .orderBy('createdAt', 'desc')
      .get();
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        effectiveFrom: data.effectiveFrom?.toDate() || new Date(),
        effectiveTo: data.effectiveTo?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as SalaryStructure;
    });
  }

  // Payroll Management
  async getPayroll(id: string): Promise<Payroll | undefined> {
    const doc = await this.db.collection('payrolls').doc(id).get();
    if (!doc.exists) return undefined;
    
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      paidOn: data.paidOn?.toDate() || null,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Payroll;
  }

  async getPayrollByUserAndMonth(userId: string, month: number, year: number): Promise<Payroll | undefined> {
    const querySnapshot = await this.db.collection('payrolls')
      .where('userId', '==', userId)
      .where('month', '==', month)
      .where('year', '==', year)
      .limit(1)
      .get();
    
    if (querySnapshot.empty) return undefined;
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      paidOn: data.paidOn?.toDate() || null,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Payroll;
  }

  async createPayroll(data: z.infer<typeof insertPayrollSchema>): Promise<Payroll> {
    const doc = this.db.collection('payrolls').doc();
    const payrollData = {
      ...data,
      id: doc.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await doc.set(payrollData);
    return payrollData as Payroll;
  }

  async updatePayroll(id: string, data: Partial<z.infer<typeof insertPayrollSchema>>): Promise<Payroll> {
    const doc = this.db.collection('payrolls').doc(id);
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    
    await doc.update(updateData);
    
    const updated = await doc.get();
    const updatedData = updated.data()!;
    return {
      id: updated.id,
      ...updatedData,
      paidOn: updatedData.paidOn?.toDate() || null,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
    } as Payroll;
  }

  async listPayrolls(filters?: { month?: number; year?: number; department?: string; status?: string }): Promise<Payroll[]> {
    let query = this.db.collection('payrolls').orderBy('createdAt', 'desc') as any;
    
    if (filters?.month) {
      query = query.where('month', '==', filters.month);
    }
    if (filters?.year) {
      query = query.where('year', '==', filters.year);
    }
    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }
    
    const querySnapshot = await query.get();
    
    return querySnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        paidOn: data.paidOn?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Payroll;
    });
  }

  async listPayrollsByUser(userId: string): Promise<Payroll[]> {
    const querySnapshot = await this.db.collection('payrolls')
      .where('userId', '==', userId)
      .orderBy('year', 'desc')
      .orderBy('month', 'desc')
      .get();
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        paidOn: data.paidOn?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Payroll;
    });
  }

  // Payroll Settings
  async getPayrollSettings(): Promise<PayrollSettings | undefined> {
    const querySnapshot = await this.db.collection('payrollSettings')
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    
    if (querySnapshot.empty) return undefined;
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as PayrollSettings;
  }

  async updatePayrollSettings(data: z.infer<typeof insertPayrollSettingsSchema>): Promise<PayrollSettings> {
    const settingsData = {
      ...data,
      updatedAt: new Date(),
    };
    
    // Check if settings exist
    const existing = await this.getPayrollSettings();
    if (existing) {
      const doc = this.db.collection('payrollSettings').doc(existing.id);
      await doc.update(settingsData);
      return { ...existing, ...settingsData } as PayrollSettings;
    } else {
      const doc = this.db.collection('payrollSettings').doc();
      const newSettings = {
        ...settingsData,
        id: doc.id,
      };
      await doc.set(newSettings);
      return newSettings as PayrollSettings;
    }
  }

  // Salary Advances
  async getSalaryAdvance(id: string): Promise<SalaryAdvance | undefined> {
    const doc = await this.db.collection('salaryAdvances').doc(id).get();
    if (!doc.exists) return undefined;
    
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      requestDate: data.requestDate?.toDate() || new Date(),
      approvedDate: data.approvedDate?.toDate() || null,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as SalaryAdvance;
  }

  async createSalaryAdvance(data: z.infer<typeof insertSalaryAdvanceSchema>): Promise<SalaryAdvance> {
    const doc = this.db.collection('salaryAdvances').doc();
    const advanceData = {
      ...data,
      id: doc.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await doc.set(advanceData);
    return advanceData as SalaryAdvance;
  }

  async updateSalaryAdvance(id: string, data: Partial<z.infer<typeof insertSalaryAdvanceSchema>>): Promise<SalaryAdvance> {
    const doc = this.db.collection('salaryAdvances').doc(id);
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    
    await doc.update(updateData);
    
    const updated = await doc.get();
    const updatedData = updated.data()!;
    return {
      id: updated.id,
      ...updatedData,
      requestDate: updatedData.requestDate?.toDate() || new Date(),
      approvedDate: updatedData.approvedDate?.toDate() || null,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
    } as SalaryAdvance;
  }

  async listSalaryAdvances(filters?: { userId?: string; status?: string }): Promise<SalaryAdvance[]> {
    let query = this.db.collection('salaryAdvances').orderBy('requestDate', 'desc') as any;
    
    if (filters?.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }
    
    const querySnapshot = await query.get();
    
    return querySnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        requestDate: data.requestDate?.toDate() || new Date(),
        approvedDate: data.approvedDate?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as SalaryAdvance;
    });
  }

  // Attendance Policies
  async getAttendancePolicy(id: string): Promise<AttendancePolicy | undefined> {
    const doc = await this.db.collection('attendancePolicies').doc(id).get();
    if (!doc.exists) return undefined;
    
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as AttendancePolicy;
  }

  async getAttendancePolicyByDepartment(department: string, designation?: string): Promise<AttendancePolicy | undefined> {
    let query = this.db.collection('attendancePolicies')
      .where('department', '==', department)
      .where('isActive', '==', true) as any;
    
    if (designation) {
      query = query.where('designation', '==', designation);
    }
    
    const querySnapshot = await query.limit(1).get();
    
    if (querySnapshot.empty) return undefined;
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as AttendancePolicy;
  }

  async createAttendancePolicy(data: z.infer<typeof insertAttendancePolicySchema>): Promise<AttendancePolicy> {
    const doc = this.db.collection('attendancePolicies').doc();
    const policyData = {
      ...data,
      id: doc.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await doc.set(policyData);
    return policyData as AttendancePolicy;
  }

  async updateAttendancePolicy(id: string, data: Partial<z.infer<typeof insertAttendancePolicySchema>>): Promise<AttendancePolicy> {
    const doc = this.db.collection('attendancePolicies').doc(id);
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    
    await doc.update(updateData);
    
    const updated = await doc.get();
    const updatedData = updated.data()!;
    return {
      id: updated.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
    } as AttendancePolicy;
  }

  async listAttendancePolicies(): Promise<AttendancePolicy[]> {
    const querySnapshot = await this.db.collection('attendancePolicies')
      .orderBy('createdAt', 'desc')
      .get();
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as AttendancePolicy;
    });
  }

  // Department Timing Management
  async getDepartmentTiming(department: string): Promise<any | undefined> {
    const doc = await this.db.collection('departmentTimings').doc(department).get();
    if (!doc.exists) return undefined;
    
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  async updateDepartmentTiming(department: string, data: any): Promise<any> {
    const doc = this.db.collection('departmentTimings').doc(department);
    const updateData = {
      ...data,
      department,
      updatedAt: new Date(),
    };
    
    await doc.set(updateData, { merge: true });
    
    const updated = await doc.get();
    const updatedData = updated.data()!;
    return {
      id: updated.id,
      ...updatedData,
      createdAt: updatedData.createdAt?.toDate() || new Date(),
      updatedAt: updatedData.updatedAt?.toDate() || new Date(),
    };
  }

  async listDepartmentTimings(): Promise<any[]> {
    const querySnapshot = await this.db.collection('departmentTimings')
      .orderBy('department', 'asc')
      .get();
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  }

  // Payroll Calculation Utilities
  async calculatePayroll(userId: string, month: number, year: number): Promise<z.infer<typeof insertPayrollSchema>> {
    // Get user's salary structure
    const salaryStructure = await this.getSalaryStructureByUser(userId);
    if (!salaryStructure) {
      throw new Error('No salary structure found for user');
    }

    // Get attendance summary for the month
    const attendanceSummary = await this.getMonthlyAttendanceSummary(userId, month, year);
    
    // Get payroll settings
    const settings = await this.getPayrollSettings();
    const defaultSettings = {
      pfRate: 12,
      esiRate: 1.75,
      tdsRate: 10,
      overtimeMultiplier: 1.5,
      standardWorkingHours: 8,
      standardWorkingDays: 22,
      leaveDeductionRate: 1,
      pfApplicableFromSalary: 15000,
      esiApplicableFromSalary: 21000,
    };
    const payrollSettings = settings || defaultSettings;

    // Calculate salary components
    const { workingDays, presentDays, absentDays, overtimeHours, leaveDays } = attendanceSummary;
    
    // Base salary calculations
    const dailySalary = salaryStructure.fixedSalary / payrollSettings.standardWorkingDays;
    const adjustedSalary = dailySalary * presentDays;
    
    // Overtime calculation
    const overtimePay = (salaryStructure.fixedSalary / (payrollSettings.standardWorkingDays * payrollSettings.standardWorkingHours)) * 
                       overtimeHours * payrollSettings.overtimeMultiplier;
    
    // Gross salary
    const grossSalary = adjustedSalary + (salaryStructure.hra || 0) + (salaryStructure.allowances || 0) + 
                       (salaryStructure.variableComponent || 0) + overtimePay;
    
    // Deductions
    const pfDeduction = grossSalary >= payrollSettings.pfApplicableFromSalary ? 
                       (salaryStructure.basicSalary * payrollSettings.pfRate) / 100 : 0;
    
    // FIXED: Use correct ESI rate (0.75%) consistent with routes.ts
    const esiDeduction = grossSalary >= payrollSettings.esiApplicableFromSalary ? 0 :
                        (grossSalary * 0.75) / 100;
    
    const tdsDeduction = (grossSalary * payrollSettings.tdsRate) / 100;
    
    // Get salary advances
    const advances = await this.listSalaryAdvances({ 
      userId, 
      status: 'approved' 
    });
    
    const advanceDeduction = advances
      .filter(advance => {
        const startDate = new Date(advance.deductionStartYear, advance.deductionStartMonth - 1);
        const currentDate = new Date(year, month - 1);
        return startDate <= currentDate && advance.remainingAmount > 0;
      })
      .reduce((total, advance) => total + advance.monthlyDeduction, 0);
    
    const totalDeductions = pfDeduction + esiDeduction + tdsDeduction + advanceDeduction;
    const netSalary = grossSalary - totalDeductions;

    return {
      userId,
      employeeId: salaryStructure.employeeId,
      month,
      year,
      workingDays,
      presentDays,
      absentDays,
      overtimeHours,
      leaveDays,
      fixedSalary: salaryStructure.fixedSalary,
      basicSalary: salaryStructure.basicSalary,
      hra: salaryStructure.hra || 0,
      allowances: salaryStructure.allowances || 0,
      variableComponent: salaryStructure.variableComponent || 0,
      overtimePay,
      grossSalary,
      pfDeduction,
      esiDeduction,
      tdsDeduction,
      advanceDeduction,
      loanDeduction: 0,
      otherDeductions: 0,
      totalDeductions,
      netSalary,
      status: 'draft' as const,
      processedBy: '',
      remarks: ''
    };
  }

  async getMonthlyAttendanceSummary(userId: string, month: number, year: number): Promise<{
    workingDays: number;
    presentDays: number;
    absentDays: number;
    overtimeHours: number;
    leaveDays: number;
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Get attendance records for the month
    const attendanceRecords = await this.listAttendance({
      userId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
    
    // Calculate working days (excluding weekends)
    let workingDays = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        workingDays++;
      }
    }
    
    const presentDays = attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentDays = workingDays - presentDays;
    const overtimeHours = attendanceRecords.reduce((total, r) => total + (r.overtimeHours || 0), 0);
    const leaveDays = attendanceRecords.filter(r => r.status === 'leave').length;
    
    return {
      workingDays,
      presentDays,
      absentDays,
      overtimeHours,
      leaveDays
    };
  }

  // Department timing management
  async getDepartmentTiming(departmentId: string): Promise<any | null> {
    try {
      const querySnapshot = await this.db.collection('departmentTimings')
        .where('departmentId', '==', departmentId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        // Return department-specific default timing if none exists
        const defaultTimings: Record<string, any> = {
          "operations": {
            departmentId: "operations",
            checkInTime: "09:00",
            checkOutTime: "18:00",
            workingHours: 9,
            overtimeThresholdMinutes: 30,
            lateThresholdMinutes: 15,
            isFlexibleTiming: false,
            breakDurationMinutes: 60,
            weeklyOffDays: [0],
            isActive: true
          },
          "admin": {
            departmentId: "admin",
            checkInTime: "09:30",
            checkOutTime: "18:30",
            workingHours: 8,
            overtimeThresholdMinutes: 30,
            lateThresholdMinutes: 15,
            isFlexibleTiming: true,
            breakDurationMinutes: 60,
            weeklyOffDays: [0],
            isActive: true
          },
          "hr": {
            departmentId: "hr",
            checkInTime: "09:00",
            checkOutTime: "18:00",
            workingHours: 8,
            overtimeThresholdMinutes: 30,
            lateThresholdMinutes: 10,
            isFlexibleTiming: false,
            breakDurationMinutes: 60,
            weeklyOffDays: [0],
            isActive: true
          },
          "marketing": {
            departmentId: "marketing",
            checkInTime: "09:30",
            checkOutTime: "18:30",
            workingHours: 8,
            overtimeThresholdMinutes: 30,
            lateThresholdMinutes: 15,
            isFlexibleTiming: false,
            breakDurationMinutes: 60,
            weeklyOffDays: [0],
            isActive: true
          },
          "sales": {
            departmentId: "sales",
            checkInTime: "09:00",
            checkOutTime: "18:00",
            workingHours: 8,
            overtimeThresholdMinutes: 30,
            lateThresholdMinutes: 15,
            isFlexibleTiming: false,
            breakDurationMinutes: 60,
            weeklyOffDays: [0],
            isActive: true
          },
          "technical": {
            departmentId: "technical",
            checkInTime: "10:00",
            checkOutTime: "19:00",
            workingHours: 8,
            overtimeThresholdMinutes: 30,
            lateThresholdMinutes: 15,
            isFlexibleTiming: false,
            breakDurationMinutes: 60,
            weeklyOffDays: [0],
            isActive: true
          },
          "operations": {
            departmentId: "operations",
            checkInTime: "09:00",
            checkOutTime: "18:00",
            workingHours: 9,
            overtimeThresholdMinutes: 30,
            lateThresholdMinutes: 15,
            isFlexibleTiming: false,
            breakDurationMinutes: 60,
            weeklyOffDays: [0],
            isActive: true
          },
          "admin": {
            departmentId: "admin",
            checkInTime: "09:30",
            checkOutTime: "18:30",
            workingHours: 8,
            overtimeThresholdMinutes: 30,
            lateThresholdMinutes: 15,
            isFlexibleTiming: true,
            breakDurationMinutes: 60,
            weeklyOffDays: [0],
            isActive: true
          },
          "marketing": {
            departmentId: "marketing",
            checkInTime: "09:30",
            checkOutTime: "18:30",
            workingHours: 8,
            overtimeThresholdMinutes: 30,
            lateThresholdMinutes: 15,
            isFlexibleTiming: false,
            breakDurationMinutes: 60,
            weeklyOffDays: [0],
            isActive: true
          },
          "sales": {
            departmentId: "sales",
            checkInTime: "09:00",
            checkOutTime: "18:00",
            workingHours: 8,
            overtimeThresholdMinutes: 30,
            lateThresholdMinutes: 15,
            isFlexibleTiming: false,
            breakDurationMinutes: 60,
            weeklyOffDays: [0],
            isActive: true
          },
          "housekeeping": {
            departmentId: "housekeeping",
            checkInTime: "08:00",
            checkOutTime: "17:00",
            workingHours: 8,
            overtimeThresholdMinutes: 30,
            lateThresholdMinutes: 10,
            isFlexibleTiming: false,
            breakDurationMinutes: 60,
            weeklyOffDays: [0],
            isActive: true
          }
        };

        return defaultTimings[departmentId] || {
          departmentId,
          workingHours: 8,
          checkInTime: "09:00",
          checkOutTime: "18:00",
          lateThresholdMinutes: 15,
          overtimeThresholdMinutes: 30,
          isFlexibleTiming: false,
          breakDurationMinutes: 60,
          weeklyOffDays: [0],
          allowRemoteWork: true,
          allowFieldWork: true,
          allowEarlyCheckOut: false,
          isActive: true
        };
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        departmentId: data.departmentId,
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        workingHours: data.workingHours,
        overtimeThresholdMinutes: data.overtimeThresholdMinutes,
        lateThresholdMinutes: data.lateThresholdMinutes,
        isFlexibleTiming: data.isFlexibleTiming,
        flexibleCheckInStart: data.flexibleCheckInStart,
        flexibleCheckInEnd: data.flexibleCheckInEnd,
        breakDurationMinutes: data.breakDurationMinutes,
        weeklyOffDays: data.weeklyOffDays,
        allowRemoteWork: data.allowRemoteWork !== undefined ? data.allowRemoteWork : true,
        allowFieldWork: data.allowFieldWork !== undefined ? data.allowFieldWork : true,
        allowEarlyCheckOut: data.allowEarlyCheckOut !== undefined ? data.allowEarlyCheckOut : false,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    } catch (error) {
      console.error("Error getting department timing:", error);
      return null;
    }
  }

  async createDepartmentTiming(timingData: any): Promise<any> {
    try {
      // Deactivate existing timing for this department
      const existingQuery = await this.db.collection('departmentTimings')
        .where('departmentId', '==', timingData.departmentId)
        .get();

      const batch = this.db.batch();
      existingQuery.docs.forEach(doc => {
        batch.update(doc.ref, { isActive: false, updatedAt: Timestamp.now() });
      });

      // Create new timing record
      const timingRef = this.db.collection('departmentTimings').doc();
      const newTiming = {
        ...timingData,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Filter out undefined values to prevent Firestore errors
      const cleanTiming = Object.fromEntries(
        Object.entries(newTiming).filter(([_, value]) => value !== undefined)
      );

      batch.set(timingRef, cleanTiming);
      await batch.commit();

      return {
        id: timingRef.id,
        ...timingData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error("Error creating department timing:", error);
      throw error;
    }
  }

  async updateDepartmentTiming(departmentId: string, timingData: any): Promise<any> {
    try {
      // Get current active timing
      const querySnapshot = await this.db.collection('departmentTimings')
        .where('departmentId', '==', departmentId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        // Create new if doesn't exist
        return this.createDepartmentTiming({ ...timingData, departmentId });
      }

      const doc = querySnapshot.docs[0];
      const updateData = {
        ...timingData,
        updatedAt: Timestamp.now()
      };

      await doc.ref.update(updateData);

      return {
        id: doc.id,
        departmentId,
        ...timingData,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error("Error updating department timing:", error);
      throw error;
    }
  }

  async getUserAttendanceForDate(userId: string, date: string): Promise<any | null> {
    try {
      const querySnapshot = await this.db.collection('attendance')
        .where('userId', '==', userId)
        .where('dateString', '==', date)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        checkInTime: data.checkInTime?.toDate() || null,
        checkOutTime: data.checkOutTime?.toDate() || null,
        date: data.date?.toDate() || new Date()
      };
    } catch (error) {
      console.error("Error getting user attendance for date:", error);
      return null;
    }
  }

  // Enhanced Payroll Management Methods
  async getEnhancedPayroll(id: string): Promise<EnhancedPayroll | undefined> {
    try {
      const doc = await this.db.collection('enhanced_payrolls').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data()!;
      return {
        id: doc.id,
        ...data,
        processedAt: data.processedAt?.toDate() || undefined,
        approvedAt: data.approvedAt?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as EnhancedPayroll;
    } catch (error) {
      console.error("Error getting enhanced payroll:", error);
      return undefined;
    }
  }

  async getEnhancedPayrollByUserAndMonth(userId: string, month: number, year: number): Promise<EnhancedPayroll | undefined> {
    try {
      const querySnapshot = await this.db.collection('enhanced_payrolls')
        .where('userId', '==', userId)
        .where('month', '==', month)
        .where('year', '==', year)
        .limit(1)
        .get();

      if (querySnapshot.empty) return undefined;

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        processedAt: data.processedAt?.toDate() || undefined,
        approvedAt: data.approvedAt?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as EnhancedPayroll;
    } catch (error) {
      console.error("Error getting enhanced payroll by user and month:", error);
      return undefined;
    }
  }

  async createEnhancedPayroll(data: any): Promise<EnhancedPayroll> {
    try {
      const id = this.db.collection('enhanced_payrolls').doc().id;
      const now = new Date();
      
      const payrollData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      };

      await this.db.collection('enhanced_payrolls').doc(id).set(payrollData);
      return payrollData as EnhancedPayroll;
    } catch (error) {
      console.error("Error creating enhanced payroll:", error);
      throw error;
    }
  }

  // Enterprise HR Management Storage Methods

  // Employee management
  async getEmployee(id: string): Promise<Employee | undefined> {
    try {
      const doc = await this.db.collection('employees').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data()!;
      return {
        id: doc.id,
        ...data,
        employmentInfo: {
          ...data.employmentInfo,
          joinDate: data.employmentInfo?.joinDate?.toDate() || new Date(),
          confirmationDate: data.employmentInfo?.confirmationDate?.toDate() || undefined,
        },
        personalInfo: {
          ...data.personalInfo,
          dateOfBirth: data.personalInfo?.dateOfBirth?.toDate() || undefined,
        },
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Employee;
    } catch (error) {
      console.error("Error getting employee:", error);
      return undefined;
    }
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    try {
      const querySnapshot = await this.db.collection('employees')
        .where('employeeId', '==', employeeId)
        .limit(1)
        .get();

      if (querySnapshot.empty) return undefined;

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        employmentInfo: {
          ...data.employmentInfo,
          joinDate: data.employmentInfo?.joinDate?.toDate() || new Date(),
          confirmationDate: data.employmentInfo?.confirmationDate?.toDate() || undefined,
        },
        personalInfo: {
          ...data.personalInfo,
          dateOfBirth: data.personalInfo?.dateOfBirth?.toDate() || undefined,
        },
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Employee;
    } catch (error) {
      console.error("Error getting employee by employee ID:", error);
      return undefined;
    }
  }

  async getEmployeeBySystemUserId(systemUserId: string): Promise<Employee | undefined> {
    try {
      const querySnapshot = await this.db.collection('employees')
        .where('systemUserId', '==', systemUserId)
        .limit(1)
        .get();

      if (querySnapshot.empty) return undefined;

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        employmentInfo: {
          ...data.employmentInfo,
          joinDate: data.employmentInfo?.joinDate?.toDate() || new Date(),
          confirmationDate: data.employmentInfo?.confirmationDate?.toDate() || undefined,
        },
        personalInfo: {
          ...data.personalInfo,
          dateOfBirth: data.personalInfo?.dateOfBirth?.toDate() || undefined,
        },
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Employee;
    } catch (error) {
      console.error("Error getting employee by system user ID:", error);
      return undefined;
    }
  }

  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    try {
      const querySnapshot = await this.db.collection('employees')
        .where('employmentInfo.department', '==', department)
        .where('isActive', '==', true)
        .orderBy('personalInfo.displayName')
        .get();

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          employmentInfo: {
            ...data.employmentInfo,
            joinDate: data.employmentInfo?.joinDate?.toDate() || new Date(),
            confirmationDate: data.employmentInfo?.confirmationDate?.toDate() || undefined,
          },
          personalInfo: {
            ...data.personalInfo,
            dateOfBirth: data.personalInfo?.dateOfBirth?.toDate() || undefined,
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Employee;
      });
    } catch (error) {
      console.error("Error getting employees by department:", error);
      return [];
    }
  }

  async getEmployeesByDesignation(designation: string): Promise<Employee[]> {
    try {
      const querySnapshot = await this.db.collection('employees')
        .where('employmentInfo.designation', '==', designation)
        .where('isActive', '==', true)
        .orderBy('personalInfo.displayName')
        .get();

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          employmentInfo: {
            ...data.employmentInfo,
            joinDate: data.employmentInfo?.joinDate?.toDate() || new Date(),
            confirmationDate: data.employmentInfo?.confirmationDate?.toDate() || undefined,
          },
          personalInfo: {
            ...data.personalInfo,
            dateOfBirth: data.personalInfo?.dateOfBirth?.toDate() || undefined,
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Employee;
      });
    } catch (error) {
      console.error("Error getting employees by designation:", error);
      return [];
    }
  }

  async getEmployeesByManager(managerId: string): Promise<Employee[]> {
    try {
      const querySnapshot = await this.db.collection('employees')
        .where('employmentInfo.reportingManagerId', '==', managerId)
        .where('isActive', '==', true)
        .orderBy('personalInfo.displayName')
        .get();

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          employmentInfo: {
            ...data.employmentInfo,
            joinDate: data.employmentInfo?.joinDate?.toDate() || new Date(),
            confirmationDate: data.employmentInfo?.confirmationDate?.toDate() || undefined,
          },
          personalInfo: {
            ...data.personalInfo,
            dateOfBirth: data.personalInfo?.dateOfBirth?.toDate() || undefined,
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Employee;
      });
    } catch (error) {
      console.error("Error getting employees by manager:", error);
      return [];
    }
  }

  async getEmployeesByStatus(status: string): Promise<Employee[]> {
    try {
      const querySnapshot = await this.db.collection('employees')
        .where('status', '==', status)
        .orderBy('personalInfo.displayName')
        .get();

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          employmentInfo: {
            ...data.employmentInfo,
            joinDate: data.employmentInfo?.joinDate?.toDate() || new Date(),
            confirmationDate: data.employmentInfo?.confirmationDate?.toDate() || undefined,
          },
          personalInfo: {
            ...data.personalInfo,
            dateOfBirth: data.personalInfo?.dateOfBirth?.toDate() || undefined,
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Employee;
      });
    } catch (error) {
      console.error("Error getting employees by status:", error);
      return [];
    }
  }

  async listEmployees(filters?: {
    department?: string;
    status?: string;
    designation?: string;
    search?: string;
  }): Promise<Employee[]> {
    try {
      let query = this.db.collection('employees') as any;

      // Apply filters
      if (filters?.department) {
        query = query.where('employmentInfo.department', '==', filters.department);
      }
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters?.designation) {
        query = query.where('employmentInfo.designation', '==', filters.designation);
      }

      query = query.orderBy('personalInfo.displayName');
      const querySnapshot = await query.get();

      let employees = querySnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          employmentInfo: {
            ...data.employmentInfo,
            joinDate: data.employmentInfo?.joinDate?.toDate() || new Date(),
            confirmationDate: data.employmentInfo?.confirmationDate?.toDate() || undefined,
          },
          personalInfo: {
            ...data.personalInfo,
            dateOfBirth: data.personalInfo?.dateOfBirth?.toDate() || undefined,
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Employee;
      });

      // Apply search filter client-side for better text matching
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        employees = employees.filter(emp => 
          emp.personalInfo.displayName.toLowerCase().includes(searchTerm) ||
          emp.employeeId.toLowerCase().includes(searchTerm) ||
          emp.contactInfo.primaryEmail.toLowerCase().includes(searchTerm) ||
          emp.employmentInfo.department.toLowerCase().includes(searchTerm) ||
          emp.employmentInfo.designation.toLowerCase().includes(searchTerm)
        );
      }

      return employees;
    } catch (error) {
      console.error("Error listing employees:", error);
      return [];
    }
  }

  async createEmployee(data: z.infer<typeof insertEmployeeSchema>): Promise<Employee> {
    try {
      const id = this.db.collection('employees').doc().id;
      const now = new Date();
      
      const employeeData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      };

      await this.db.collection('employees').doc(id).set(employeeData);
      return employeeData as Employee;
    } catch (error) {
      console.error("Error creating employee:", error);
      throw error;
    }
  }

  async updateEmployee(id: string, data: Partial<z.infer<typeof insertEmployeeSchema>>): Promise<Employee> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date()
      };

      await this.db.collection('employees').doc(id).update(updateData);
      
      // Return updated employee
      const updated = await this.getEmployee(id);
      if (!updated) throw new Error('Employee not found after update');
      return updated;
    } catch (error) {
      console.error("Error updating employee:", error);
      throw error;
    }
  }

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      // Soft delete by setting isActive to false
      await this.db.collection('employees').doc(id).update({
        isActive: false,
        status: 'terminated',
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error("Error deleting employee:", error);
      return false;
    }
  }

  // Employee Document management
  async getEmployeeDocument(id: string): Promise<EmployeeDocument | undefined> {
    try {
      const doc = await this.db.collection('employee_documents').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data()!;
      return {
        id: doc.id,
        ...data,
        expiryDate: data.expiryDate?.toDate() || undefined,
        verifiedAt: data.verifiedAt?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as EmployeeDocument;
    } catch (error) {
      console.error("Error getting employee document:", error);
      return undefined;
    }
  }

  async getEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]> {
    try {
      const querySnapshot = await this.db.collection('employee_documents')
        .where('employeeId', '==', employeeId)
        .orderBy('createdAt', 'desc')
        .get();

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          expiryDate: data.expiryDate?.toDate() || undefined,
          verifiedAt: data.verifiedAt?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as EmployeeDocument;
      });
    } catch (error) {
      console.error("Error getting employee documents:", error);
      return [];
    }
  }

  async getEmployeeDocumentsByType(employeeId: string, documentType: string): Promise<EmployeeDocument[]> {
    try {
      const querySnapshot = await this.db.collection('employee_documents')
        .where('employeeId', '==', employeeId)
        .where('documentType', '==', documentType)
        .orderBy('createdAt', 'desc')
        .get();

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          expiryDate: data.expiryDate?.toDate() || undefined,
          verifiedAt: data.verifiedAt?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as EmployeeDocument;
      });
    } catch (error) {
      console.error("Error getting employee documents by type:", error);
      return [];
    }
  }

  async createEmployeeDocument(data: z.infer<typeof insertEmployeeDocumentSchema>): Promise<EmployeeDocument> {
    try {
      const id = this.db.collection('employee_documents').doc().id;
      const now = new Date();
      
      const documentData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      };

      await this.db.collection('employee_documents').doc(id).set(documentData);
      return documentData as EmployeeDocument;
    } catch (error) {
      console.error("Error creating employee document:", error);
      throw error;
    }
  }

  async updateEmployeeDocument(id: string, data: Partial<z.infer<typeof insertEmployeeDocumentSchema>>): Promise<EmployeeDocument> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date()
      };

      await this.db.collection('employee_documents').doc(id).update(updateData);
      
      const updated = await this.getEmployeeDocument(id);
      if (!updated) throw new Error('Employee document not found after update');
      return updated;
    } catch (error) {
      console.error("Error updating employee document:", error);
      throw error;
    }
  }

  async deleteEmployeeDocument(id: string): Promise<boolean> {
    try {
      await this.db.collection('employee_documents').doc(id).delete();
      return true;
    } catch (error) {
      console.error("Error deleting employee document:", error);
      return false;
    }
  }

  // Performance Review management
  async getPerformanceReview(id: string): Promise<PerformanceReview | undefined> {
    try {
      const doc = await this.db.collection('performance_reviews').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data()!;
      return {
        id: doc.id,
        ...data,
        reviewPeriod: {
          startDate: data.reviewPeriod?.startDate?.toDate() || new Date(),
          endDate: data.reviewPeriod?.endDate?.toDate() || new Date(),
        },
        nextReviewDate: data.nextReviewDate?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as PerformanceReview;
    } catch (error) {
      console.error("Error getting performance review:", error);
      return undefined;
    }
  }

  async getEmployeePerformanceReviews(employeeId: string): Promise<PerformanceReview[]> {
    try {
      const querySnapshot = await this.db.collection('performance_reviews')
        .where('employeeId', '==', employeeId)
        .orderBy('reviewPeriod.endDate', 'desc')
        .get();

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          reviewPeriod: {
            startDate: data.reviewPeriod?.startDate?.toDate() || new Date(),
            endDate: data.reviewPeriod?.endDate?.toDate() || new Date(),
          },
          nextReviewDate: data.nextReviewDate?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as PerformanceReview;
      });
    } catch (error) {
      console.error("Error getting employee performance reviews:", error);
      return [];
    }
  }

  async getPerformanceReviewsByReviewer(reviewerId: string): Promise<PerformanceReview[]> {
    try {
      const querySnapshot = await this.db.collection('performance_reviews')
        .where('reviewedBy', '==', reviewerId)
        .orderBy('reviewPeriod.endDate', 'desc')
        .get();

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          reviewPeriod: {
            startDate: data.reviewPeriod?.startDate?.toDate() || new Date(),
            endDate: data.reviewPeriod?.endDate?.toDate() || new Date(),
          },
          nextReviewDate: data.nextReviewDate?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as PerformanceReview;
      });
    } catch (error) {
      console.error("Error getting performance reviews by reviewer:", error);
      return [];
    }
  }

  async getUpcomingPerformanceReviews(): Promise<PerformanceReview[]> {
    try {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const querySnapshot = await this.db.collection('performance_reviews')
        .where('nextReviewDate', '>=', now)
        .where('nextReviewDate', '<=', nextMonth)
        .orderBy('nextReviewDate')
        .get();

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          reviewPeriod: {
            startDate: data.reviewPeriod?.startDate?.toDate() || new Date(),
            endDate: data.reviewPeriod?.endDate?.toDate() || new Date(),
          },
          nextReviewDate: data.nextReviewDate?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as PerformanceReview;
      });
    } catch (error) {
      console.error("Error getting upcoming performance reviews:", error);
      return [];
    }
  }

  async createPerformanceReview(data: z.infer<typeof insertPerformanceReviewSchema>): Promise<PerformanceReview> {
    try {
      const id = this.db.collection('performance_reviews').doc().id;
      const now = new Date();
      
      const reviewData = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      };

      await this.db.collection('performance_reviews').doc(id).set(reviewData);
      return reviewData as PerformanceReview;
    } catch (error) {
      console.error("Error creating performance review:", error);
      throw error;
    }
  }

  async updatePerformanceReview(id: string, data: Partial<z.infer<typeof insertPerformanceReviewSchema>>): Promise<PerformanceReview> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date()
      };

      await this.db.collection('performance_reviews').doc(id).update(updateData);
      
      const updated = await this.getPerformanceReview(id);
      if (!updated) throw new Error('Performance review not found after update');
      return updated;
    } catch (error) {
      console.error("Error updating performance review:", error);
      throw error;
    }
  }

  async deletePerformanceReview(id: string): Promise<boolean> {
    try {
      await this.db.collection('performance_reviews').doc(id).delete();
      return true;
    } catch (error) {
      console.error("Error deleting performance review:", error);
      return false;
    }
  }

  // Continue with existing methods
  async createEnhancedPayroll(data: any): Promise<EnhancedPayroll> {
    try {
      const id = this.db.collection('enhanced_payrolls').doc().id;
      const now = new Date();
      
      const payrollData = {
        ...data,
        id,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };

      await this.db.collection('enhanced_payrolls').doc(id).set(payrollData);
      
      return {
        ...payrollData,
        createdAt: now,
        updatedAt: now
      } as EnhancedPayroll;
    } catch (error) {
      console.error("Error creating enhanced payroll:", error);
      throw error;
    }
  }

  async updateEnhancedPayroll(id: string, data: Partial<EnhancedPayroll>): Promise<EnhancedPayroll> {
    try {
      const updateData = {
        ...data,
        updatedAt: Timestamp.fromDate(new Date())
      };

      await this.db.collection('enhanced_payrolls').doc(id).update(updateData);
      
      const updated = await this.getEnhancedPayroll(id);
      if (!updated) throw new Error('Failed to retrieve updated payroll');
      
      return updated;
    } catch (error) {
      console.error("Error updating enhanced payroll:", error);
      throw error;
    }
  }

  async listEnhancedPayrolls(filters?: { month?: number; year?: number; department?: string; status?: string }): Promise<EnhancedPayroll[]> {
    try {
      // Simplify query to avoid index requirements
      const querySnapshot = await this.db.collection('enhanced_payrolls').get();

      const payrolls = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          processedAt: data.processedAt?.toDate() || undefined,
          approvedAt: data.approvedAt?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as EnhancedPayroll;
      });

      // Filter by department if needed (requires joining with users)
      if (filters?.department && filters.department !== 'all') {
        const userIds = (await this.getUsersByDepartment(filters.department)).map(u => u.uid);
        return payrolls.filter(p => userIds.includes(p.userId));
      }

      return payrolls;
    } catch (error) {
      console.error("Error listing enhanced payrolls:", error);
      return [];
    }
  }

  async listEnhancedPayrollsByUser(userId: string): Promise<EnhancedPayroll[]> {
    try {
      const querySnapshot = await this.db.collection('enhanced_payrolls')
        .where('userId', '==', userId)
        .orderBy('year', 'desc')
        .orderBy('month', 'desc')
        .get();

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          processedAt: data.processedAt?.toDate() || undefined,
          approvedAt: data.approvedAt?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as EnhancedPayroll;
      });
    } catch (error) {
      console.error("Error listing enhanced payrolls by user:", error);
      return [];
    }
  }

  // Enhanced Salary Structure Management
  async getEnhancedSalaryStructure(id: string): Promise<EnhancedSalaryStructure | undefined> {
    try {
      const doc = await this.db.collection('enhanced_salary_structures').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data()!;
      return {
        id: doc.id,
        ...data,
        effectiveFrom: data.effectiveFrom?.toDate() || new Date(),
        effectiveTo: data.effectiveTo?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as EnhancedSalaryStructure;
    } catch (error) {
      console.error("Error getting enhanced salary structure:", error);
      return undefined;
    }
  }

  async getEnhancedSalaryStructureByUser(userId: string): Promise<EnhancedSalaryStructure | undefined> {
    try {
      // Simplify query to avoid complex index requirement
      const querySnapshot = await this.db.collection('enhanced_salary_structures')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (querySnapshot.empty) return undefined;

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        effectiveFrom: data.effectiveFrom?.toDate() || new Date(),
        effectiveTo: data.effectiveTo?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as EnhancedSalaryStructure;
    } catch (error) {
      console.error("Error getting enhanced salary structure by user:", error);
      return undefined;
    }
  }

  async createEnhancedSalaryStructure(data: any): Promise<EnhancedSalaryStructure> {
    try {
      const id = this.db.collection('enhanced_salary_structures').doc().id;
      const now = new Date();
      
      // Ensure dates are properly converted
      const effectiveFromDate = data.effectiveFrom instanceof Date ? data.effectiveFrom : new Date(data.effectiveFrom || now);
      const effectiveToDate = data.effectiveTo ? (data.effectiveTo instanceof Date ? data.effectiveTo : new Date(data.effectiveTo)) : null;
      
      const structureData = {
        ...data,
        id,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        effectiveFrom: Timestamp.fromDate(effectiveFromDate),
        effectiveTo: effectiveToDate ? Timestamp.fromDate(effectiveToDate) : null
      };

      await this.db.collection('enhanced_salary_structures').doc(id).set(structureData);
      
      return {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
        effectiveFrom: effectiveFromDate,
        effectiveTo: effectiveToDate || undefined
      } as EnhancedSalaryStructure;
    } catch (error) {
      console.error("Error creating enhanced salary structure:", error);
      throw error;
    }
  }

  async updateEnhancedSalaryStructure(id: string, data: Partial<EnhancedSalaryStructure>): Promise<EnhancedSalaryStructure> {
    try {
      const updateData: any = {
        ...data,
        updatedAt: Timestamp.fromDate(new Date())
      };

      if (data.effectiveFrom) {
        updateData.effectiveFrom = Timestamp.fromDate(data.effectiveFrom);
      }
      if (data.effectiveTo) {
        updateData.effectiveTo = Timestamp.fromDate(data.effectiveTo);
      }

      await this.db.collection('enhanced_salary_structures').doc(id).update(updateData);
      
      const updated = await this.getEnhancedSalaryStructure(id);
      if (!updated) throw new Error('Failed to retrieve updated salary structure');
      
      return updated;
    } catch (error) {
      console.error("Error updating enhanced salary structure:", error);
      throw error;
    }
  }

  async listEnhancedSalaryStructures(): Promise<EnhancedSalaryStructure[]> {
    try {
      const querySnapshot = await this.db.collection('enhanced_salary_structures')
        .orderBy('createdAt', 'desc')
        .get();

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          effectiveFrom: data.effectiveFrom?.toDate() || new Date(),
          effectiveTo: data.effectiveTo?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as EnhancedSalaryStructure;
      });
    } catch (error) {
      console.error("Error listing enhanced salary structures:", error);
      return [];
    }
  }

  // Enhanced Payroll Settings
  async getEnhancedPayrollSettings(): Promise<EnhancedPayrollSettings | undefined> {
    try {
      const querySnapshot = await this.db.collection('enhanced_payroll_settings')
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        // Return default settings if none exist
        const defaultSettings: EnhancedPayrollSettings = {
          id: 'default',
          epfEmployeeRate: 12,
          epfEmployerRate: 12,
          esiEmployeeRate: 0.75,
          esiEmployerRate: 3.25,
          epfCeiling: 15000,
          esiThreshold: 21000,
          tdsThreshold: 250000,
          standardWorkingDays: 26,
          standardWorkingHours: 8,
          overtimeThresholdHours: 8,
          companyName: "Prakash Greens Energy",
          companyAddress: "",
          companyPan: "",
          companyTan: "",
          autoCalculateStatutory: true,
          allowManualOverride: true,
          requireApprovalForProcessing: false,
          updatedBy: "system",
          updatedAt: new Date()
        };
        return defaultSettings;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as EnhancedPayrollSettings;
    } catch (error) {
      console.error("Error getting enhanced payroll settings:", error);
      return undefined;
    }
  }

  async updateEnhancedPayrollSettings(data: any): Promise<EnhancedPayrollSettings> {
    try {
      const id = data.id || 'default';
      const now = new Date();
      
      const settingsData = {
        ...data,
        id,
        updatedAt: Timestamp.fromDate(now)
      };

      await this.db.collection('enhanced_payroll_settings').doc(id).set(settingsData, { merge: true });
      
      return {
        ...data,
        id,
        updatedAt: now
      } as EnhancedPayrollSettings;
    } catch (error) {
      console.error("Error updating enhanced payroll settings:", error);
      throw error;
    }
  }

  // Payroll Field Configuration
  async getPayrollFieldConfig(id: string): Promise<PayrollFieldConfig | undefined> {
    try {
      const doc = await this.db.collection('payroll_field_configs').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data()!;
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PayrollFieldConfig;
    } catch (error) {
      console.error("Error getting payroll field config:", error);
      return undefined;
    }
  }

  async listPayrollFieldConfigs(): Promise<PayrollFieldConfig[]> {
    try {
      const querySnapshot = await this.db.collection('payroll_field_configs')
        .where('isActive', '==', true)
        .orderBy('sortOrder', 'asc')
        .get();

      if (querySnapshot.empty) {
        // Return default field configs
        return [
          {
            id: "1",
            name: "special_allowance",
            displayName: "Special Allowance",
            category: "earnings",
            dataType: "number",
            isRequired: false,
            isSystemField: false,
            defaultValue: 0,
            sortOrder: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: "2",
            name: "professional_tax",
            displayName: "Professional Tax",
            category: "deductions",
            dataType: "number",
            isRequired: false,
            isSystemField: false,
            defaultValue: 200,
            sortOrder: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
      }

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as PayrollFieldConfig;
      });
    } catch (error) {
      console.error("Error listing payroll field configs:", error);
      return [];
    }
  }

  async createPayrollFieldConfig(data: any): Promise<PayrollFieldConfig> {
    try {
      const id = this.db.collection('payroll_field_configs').doc().id;
      const now = new Date();
      
      const configData = {
        ...data,
        id,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };

      await this.db.collection('payroll_field_configs').doc(id).set(configData);
      
      return {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      } as PayrollFieldConfig;
    } catch (error) {
      console.error("Error creating payroll field config:", error);
      throw error;
    }
  }

  async updatePayrollFieldConfig(id: string, data: Partial<PayrollFieldConfig>): Promise<PayrollFieldConfig> {
    try {
      const updateData = {
        ...data,
        updatedAt: Timestamp.fromDate(new Date())
      };

      await this.db.collection('payroll_field_configs').doc(id).update(updateData);
      
      const updated = await this.getPayrollFieldConfig(id);
      if (!updated) throw new Error('Failed to retrieve updated field config');
      
      return updated;
    } catch (error) {
      console.error("Error updating payroll field config:", error);
      throw error;
    }
  }

  async deletePayrollFieldConfig(id: string): Promise<boolean> {
    try {
      await this.db.collection('payroll_field_configs').doc(id).update({
        isActive: false,
        updatedAt: Timestamp.fromDate(new Date())
      });
      return true;
    } catch (error) {
      console.error("Error deleting payroll field config:", error);
      return false;
    }
  }
}

export const storage = new FirestoreStorage();
