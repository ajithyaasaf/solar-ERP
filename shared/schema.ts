import { z } from "zod";

// Core enterprise user management schemas - Updated to match organizational chart
export const departments = [
  "operations", "admin", "hr", "marketing", "sales", "technical", "housekeeping"
] as const;

// Enterprise organizational hierarchy with levels - Updated to match organizational chart
export const designations = [
  "ceo", "gm", "officer", "executive", "cre", "team_leader", "technician", "welder", "house_man"
] as const;

// Designation hierarchy levels (higher number = more authority) - Fixed duplicates
export const designationLevels = {
  "ceo": 9,
  "gm": 8,
  "officer": 7,
  "team_leader": 6,
  "executive": 5,
  "cre": 4,
  "technician": 3,
  "welder": 2,
  "house_man": 1
} as const;

export const payrollGrades = [
  "A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"
] as const;

// Enterprise-grade granular permission system
export const systemPermissions = [
  // Dashboard access (Department-level feature access)
  "dashboard.view", "dashboard.analytics", "dashboard.full_access",
  
  // Customer Management (Sales & Marketing focus)
  "customers.view", "customers.create", "customers.edit", "customers.delete",
  "customers.export", "customers.import", "customers.archive",
  
  // Product Management (Technical & Sales focus) 
  "products.view", "products.create", "products.edit", "products.delete",
  "products.pricing", "products.specifications", "products.inventory",
  
  // Quotation Management (Sales primary, others view)
  "quotations.view", "quotations.create", "quotations.edit", "quotations.delete",
  "quotations.approve", "quotations.send", "quotations.convert",
  
  // Invoice Management (Accounts primary)
  "invoices.view", "invoices.create", "invoices.edit", "invoices.delete",
  "invoices.approve", "invoices.send", "invoices.payment_tracking",
  
  // Attendance Management (HR primary, self for employees)
  "attendance.view_own", "attendance.view_team", "attendance.view_all",
  "attendance.mark", "attendance.approve", "attendance.reports",
  
  // Leave Management (HR approvals, self requests)
  "leave.view_own", "leave.view_team", "leave.view_all",
  "leave.request", "leave.approve", "leave.reject", "leave.cancel",
  
  // User & Access Management (Admin roles)
  "users.view", "users.create", "users.edit", "users.delete",
  "users.permissions", "users.activate", "users.deactivate",
  
  // Department & Organization (Master Admin)
  "departments.view", "departments.create", "departments.edit", "departments.delete",
  "designations.view", "designations.create", "designations.edit", "designations.delete",
  "permissions.view", "permissions.manage", "permissions.assign",
  
  // Reporting & Analytics (Designation-based access levels)
  "reports.basic", "reports.advanced", "reports.financial", "reports.export",
  "analytics.view", "analytics.departmental", "analytics.enterprise",
  
  // Approval workflows (Designation-based limits)
  "approve.quotations.basic", "approve.quotations.advanced",
  "approve.invoices.basic", "approve.invoices.advanced", 
  "approve.leave.team", "approve.leave.department",
  "approve.expenses.basic", "approve.expenses.advanced",
  "approve.overtime.team", "approve.overtime.department",
  
  // System Administration (Master Admin only)
  "system.settings", "system.backup", "system.audit", "system.integrations",
  
  // Site Visit Management (Field Operations)
  "site_visit.view", "site_visit.create", "site_visit.edit", "site_visit.delete",
  "site_visit.view_own", "site_visit.view_team", "site_visit.view_all",
  "site_visit.approve", "site_visit.reports"
] as const;

export const insertUserEnhancedSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  role: z.enum(["master_admin", "admin", "employee"]).default("employee"),
  department: z.enum(departments).nullable().optional(),
  designation: z.enum(designations).nullable().optional(),
  employeeId: z.string().optional(),
  reportingManagerId: z.string().nullable().optional(),
  payrollGrade: z.enum(payrollGrades).nullable().optional(),
  joinDate: z.date().optional(),
  isActive: z.boolean().default(true),
  photoURL: z.string().nullable().optional()
});

export const insertDesignationSchema = z.object({
  name: z.string().min(2, "Designation name must be at least 2 characters"),
  level: z.number().min(1).max(10),
  description: z.string().optional(),
  permissions: z.array(z.enum(systemPermissions)).default([])
});

export const insertPermissionGroupSchema = z.object({
  name: z.string().min(2, "Permission group name must be at least 2 characters"),
  department: z.enum(departments),
  designation: z.enum(designations),
  permissions: z.array(z.enum(systemPermissions)),
  canApprove: z.boolean().default(false),
  maxApprovalAmount: z.number().nullable().optional()
});

// Enterprise HR Management Schemas

// Employee status types for comprehensive lifecycle management
export const employeeStatus = [
  "active", "inactive", "probation", "notice_period", "terminated", "on_leave"
] as const;

// Employment types for contractual management
export const employmentTypes = [
  "full_time", "part_time", "contract", "intern", "consultant", "freelancer"
] as const;

// ====== SITE VISIT MANAGEMENT SCHEMAS ======

// Site visit purpose categories
export const siteVisitPurposes = [
  "visit", "installation", "service", "purchase", "eb_office", "amc", "bank", "other"
] as const;

// Property types for customer classification
export const propertyTypes = [
  "residential", "commercial", "agri", "other"
] as const;

// Technical work types
export const technicalWorkTypes = [
  "installation", "wifi_configuration", "amc", "service", "electrical_fault",
  "inverter_fault", "solar_panel_fault", "wiring_issue", "structure", 
  "welding_work", "site_visit", "light_installation", "camera_fault",
  "light_fault", "repair", "painting", "cleaning", "others"
] as const;

// Service types for multi-selection
export const serviceTypes = [
  "on_grid", "off_grid", "hybrid", "solar_panel", "camera", "water_pump", 
  "water_heater", "lights_accessories", "others"
] as const;

// Working status
export const workingStatus = [
  "pending", "completed"
] as const;

// Visit outcome categories for business classification
export const visitOutcomes = [
  "converted", "on_process", "cancelled"
] as const;

// Solar product specifications
export const solarPanelBrands = [
  "renew", "premier", "utl_solar", "loom_solar", "kirloskar", "adani_solar", "vikram_solar"
] as const;

export const inverterMakes = [
  "growatt", "deye", "polycab", "utl", "microtech"
] as const;

export const inverterPhases = [
  "single_phase", "three_phase"
] as const;

export const earthingTypes = [
  "dc", "ac", "ac_dc"
] as const;

export const panelWatts = [
  "530", "535", "550", "590", "610"
] as const;

export const inverterWatts = [
  "3kw", "4kw", "5kw", "10kw", "15kw", "30kw"
] as const;

export const batteryBrands = [
  "exide", "utl", "exide_utl"
] as const;

export const batteryTypes = [
  "lead_acid", "lithium"
] as const;

export const batteryAHOptions = [
  "100", "120", "150", "200"
] as const;

export const waterHeaterBrands = [
  "venus", "pressurised", "non_pressurised", "hykon"
] as const;

// New schema additions for enhanced project specifications

// Floor levels for installations
export const floorLevels = [
  "0", "1", "2", "3", "4"
] as const;

// Structure types
export const structureTypes = [
  "gp_structure", "mono_rail"
] as const;

// Mono rail options
export const monoRailOptions = [
  "mini_rail", "long_rail"
] as const;

// Height ranges for structures (0 to 14)
export const heightRange = Array.from({ length: 15 }, (_, i) => i.toString()) as [string, ...string[]];

// Scope options for work assignments
export const workScopeOptions = [
  "customer_scope", "company_scope"
] as const;

// Project types for marketing department
export const marketingProjectTypes = [
  "on_grid", "off_grid", "hybrid", "water_heater", "water_pump"
] as const;

// Admin process types
export const bankProcessSteps = [
  "registration", "document_verification", "site_inspection", 
  "head_office_approval", "amount_credited"
] as const;

export const ebProcessTypes = [
  "new_connection", "tariff_change", "name_transfer", "load_upgrade",
  "inspection_before_net_meter", "net_meter_followup", 
  "inspection_after_net_meter", "subsidy"
] as const;

// ====== SITE VISIT SCHEMAS ======

// Location schema for GPS tracking
export const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  address: z.string().optional()
});

// Customer details schema
export const customerDetailsSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  address: z.string().min(3, "Address is required"),
  ebServiceNumber: z.string().optional(),
  propertyType: z.enum(propertyTypes),
  location: z.string().optional()
});

// Technical site visit schema
export const technicalSiteVisitSchema = z.object({
  serviceTypes: z.array(z.enum(serviceTypes)),
  workType: z.enum(technicalWorkTypes),
  workingStatus: z.enum(workingStatus),
  pendingRemarks: z.string().optional(),
  teamMembers: z.array(z.string()),
  description: z.string().optional()
});

// Solar system configuration schemas
export const onGridConfigSchema = z.object({
  solarPanelMake: z.array(z.enum(solarPanelBrands)).default([]),
  panelWatts: z.enum(panelWatts),
  inverterMake: z.array(z.enum(inverterMakes)).default([]),
  inverterWatts: z.enum(inverterWatts),
  inverterPhase: z.enum(inverterPhases),
  inverterKW: z.number().min(0).optional(),
  inverterQty: z.number().min(1).optional(),
  lightningArrest: z.boolean().default(false),
  earth: z.enum(earthingTypes),
  floor: z.enum(floorLevels).optional(),
  panelCount: z.number().min(1),
  structureHeight: z.number().min(0),
  projectValue: z.number().min(0),
  others: z.string().optional(),
  // New fields from client specification
  structureType: z.enum(structureTypes).optional(),
  gpStructure: z.object({
    lowerEndHeight: z.enum(heightRange as [string, ...string[]]).optional(),
    higherEndHeight: z.enum(heightRange as [string, ...string[]]).optional()
  }).optional(),
  monoRail: z.object({
    type: z.enum(monoRailOptions).optional()
  }).optional(),
  civilWorkScope: z.enum(workScopeOptions).optional(),
  netMeterScope: z.enum(workScopeOptions).optional()
});

export const offGridConfigSchema = onGridConfigSchema.extend({
  batteryBrand: z.enum(batteryBrands),
  batteryType: z.enum(batteryTypes).optional(),
  batteryAH: z.enum(batteryAHOptions).optional(),
  voltage: z.number().min(0),
  batteryCount: z.number().min(1),
  batteryStands: z.string().optional()
}).omit({ netMeterScope: true }); // Off-grid doesn't have net meter

export const hybridConfigSchema = offGridConfigSchema.extend({
  electricalWorkScope: z.enum(workScopeOptions).optional(),
  netMeterScope: z.enum(workScopeOptions).optional() // Hybrid has net meter back
});

export const waterHeaterConfigSchema = z.object({
  brand: z.enum(waterHeaterBrands),
  litre: z.number().min(1),
  heatingCoil: z.string().optional(),
  projectValue: z.number().min(0),
  others: z.string().optional(),
  // New fields from client specification
  floor: z.enum(floorLevels).optional(),
  plumbingWorkScope: z.enum(workScopeOptions).optional(),
  civilWorkScope: z.enum(workScopeOptions).optional()
});

export const waterPumpConfigSchema = z.object({
  hp: z.string(),
  drive: z.string(),
  solarPanel: z.string().optional(),
  structureHeight: z.number().min(0),
  panelBrand: z.array(z.enum(solarPanelBrands)).default([]),
  panelCount: z.number().min(1),
  projectValue: z.number().min(0),
  others: z.string().optional(),
  // New fields from client specification
  structureType: z.enum(structureTypes).optional(),
  gpStructure: z.object({
    lowerEndHeight: z.enum(heightRange as [string, ...string[]]).optional(),
    higherEndHeight: z.enum(heightRange as [string, ...string[]]).optional()
  }).optional(),
  monoRail: z.object({
    type: z.enum(monoRailOptions).optional()
  }).optional(),
  plumbingWorkScope: z.enum(workScopeOptions).optional(),
  civilWorkScope: z.enum(workScopeOptions).optional()
});

// Marketing site visit schema
export const marketingSiteVisitSchema = z.object({
  updateRequirements: z.boolean(),
  projectType: z.enum(marketingProjectTypes).optional(),
  onGridConfig: onGridConfigSchema.optional(),
  offGridConfig: offGridConfigSchema.optional(),
  hybridConfig: hybridConfigSchema.optional(),
  waterHeaterConfig: waterHeaterConfigSchema.optional(),
  waterPumpConfig: waterPumpConfigSchema.optional()
});

// Admin site visit schema
export const adminSiteVisitSchema = z.object({
  bankProcess: z.object({
    step: z.enum(bankProcessSteps),
    description: z.string().optional()
  }).optional(),
  ebProcess: z.object({
    type: z.enum(ebProcessTypes),
    description: z.string().optional()
  }).optional(),
  purchase: z.string().optional(),
  driving: z.string().optional(),
  officialCashTransactions: z.string().optional(),
  officialPersonalWork: z.string().optional(),
  others: z.string().optional()
});

// Site photo schema
export const sitePhotoSchema = z.object({
  url: z.string().url(),
  location: locationSchema,
  timestamp: z.union([z.date(), z.string()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
  description: z.string().optional()
});

// Main site visit schema
export const insertSiteVisitSchema = z.object({
  userId: z.string(),
  department: z.enum(["technical", "marketing", "admin"]),
  visitPurpose: z.enum(siteVisitPurposes),
  
  // Location & Time Tracking
  siteInTime: z.date(),
  siteInLocation: locationSchema,
  siteInPhotoUrl: z.string().url().optional(),
  siteOutTime: z.date().optional(),
  siteOutLocation: locationSchema.optional(),
  siteOutPhotoUrl: z.string().url().optional(),
  
  // Customer Information
  customer: customerDetailsSchema,
  
  // Department-specific data
  technicalData: technicalSiteVisitSchema.optional(),
  marketingData: marketingSiteVisitSchema.optional(),
  adminData: adminSiteVisitSchema.optional(),
  
  // Site Photos (1-20 photos)
  sitePhotos: z.array(sitePhotoSchema).max(20).default([]),
  
  // Checkout Site Photos (additional photos taken during checkout)
  siteOutPhotos: z.array(sitePhotoSchema).max(20).default([]).optional(),
  
  // Follow-up System Enhancement
  isFollowUp: z.boolean().default(false),
  followUpOf: z.string().optional(), // ID of original visit (if this is a follow-up)
  hasFollowUps: z.boolean().default(false), // True if this visit has follow-ups
  followUpCount: z.number().default(0), // Number of follow-ups for this site
  followUpReason: z.string().optional(), // Why follow-up was needed
  followUpDescription: z.string().optional(), // Simple description for follow-ups
  
  // Status and metadata
  status: z.enum(["in_progress", "completed", "cancelled"]).default("in_progress"),
  
  // Visit outcome for business classification (selected at checkout)
  visitOutcome: z.enum(visitOutcomes).optional(),
  outcomeNotes: z.string().optional(),
  scheduledFollowUpDate: z.date().optional(),
  outcomeSelectedAt: z.date().optional(),
  outcomeSelectedBy: z.string().optional(),
  
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// Simplified Follow-up Site Visit Schema
export const insertFollowUpSiteVisitSchema = z.object({
  originalVisitId: z.string().min(1, "Original visit ID is required"),
  
  // Essential fields for follow-ups
  userId: z.string(),
  department: z.enum(["technical", "marketing", "admin"]),
  siteInTime: z.date().default(() => new Date()),
  siteInLocation: locationSchema,
  siteInPhotoUrl: z.string().url().optional(),
  siteOutTime: z.date().optional(),
  siteOutLocation: locationSchema.optional(),
  siteOutPhotoUrl: z.string().url().optional(),
  
  // Follow-up specific data
  followUpReason: z.enum([
    "additional_work_required",
    "issue_resolution", 
    "status_check",
    "customer_request",
    "maintenance",
    "other"
  ]).default("additional_work_required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  
  // Photo documentation for follow-ups
  sitePhotos: z.array(z.string().url()).max(10).default([]), // Array of site "in" photo URLs
  siteOutPhotos: z.array(z.string().url()).max(10).default([]), // Array of site "out" photo URLs (checkout photos)
  
  // Status and metadata
  status: z.enum(["in_progress", "completed", "cancelled"]).default("in_progress"),
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  
  // Visit outcome fields - CRITICAL for tab filtering
  visitOutcome: z.enum(visitOutcomes).optional(),
  outcomeNotes: z.string().optional(),
  scheduledFollowUpDate: z.date().optional(),
  outcomeSelectedAt: z.date().optional(),
  outcomeSelectedBy: z.string().optional(),
  
  // Customer info (copied from original)
  customer: customerDetailsSchema,
});

// Follow-up visit interface
export type InsertFollowUpSiteVisit = z.infer<typeof insertFollowUpSiteVisitSchema>;

export interface FollowUpSiteVisit extends InsertFollowUpSiteVisit {
  id: string;
}

// Type definitions
export type SiteVisitPurpose = typeof siteVisitPurposes[number];
export type PropertyType = typeof propertyTypes[number];
export type TechnicalWorkType = typeof technicalWorkTypes[number];
export type ServiceType = typeof serviceTypes[number];
export type WorkingStatus = typeof workingStatus[number];
export type SolarPanelBrand = typeof solarPanelBrands[number];
export type InverterMake = typeof inverterMakes[number];
export type InverterPhase = typeof inverterPhases[number];
export type EarthingType = typeof earthingTypes[number];
export type PanelWatt = typeof panelWatts[number];
export type InverterWatt = typeof inverterWatts[number];
export type BatteryBrand = typeof batteryBrands[number];
export type BatteryType = typeof batteryTypes[number];
export type BatteryAH = typeof batteryAHOptions[number];
export type WaterHeaterBrand = typeof waterHeaterBrands[number];
export type MarketingProjectType = typeof marketingProjectTypes[number];
export type BankProcessStep = typeof bankProcessSteps[number];
export type EBProcessType = typeof ebProcessTypes[number];
export type VisitOutcome = typeof visitOutcomes[number];

export type Location = z.infer<typeof locationSchema>;
export type CustomerDetails = z.infer<typeof customerDetailsSchema>;
export type TechnicalSiteVisit = z.infer<typeof technicalSiteVisitSchema>;
export type OnGridConfig = z.infer<typeof onGridConfigSchema>;
export type OffGridConfig = z.infer<typeof offGridConfigSchema>;
export type HybridConfig = z.infer<typeof hybridConfigSchema>;
export type WaterHeaterConfig = z.infer<typeof waterHeaterConfigSchema>;
export type WaterPumpConfig = z.infer<typeof waterPumpConfigSchema>;
export type MarketingSiteVisit = z.infer<typeof marketingSiteVisitSchema>;
export type AdminSiteVisit = z.infer<typeof adminSiteVisitSchema>;
export type SitePhoto = z.infer<typeof sitePhotoSchema>;
export type InsertSiteVisit = z.infer<typeof insertSiteVisitSchema>;

export interface SiteVisit extends InsertSiteVisit {
  id: string;
}

// Quick Action Types for Site Visit Workflow Enhancement
export const quickActionTypes = [
  "convert", "cancel", "reschedule"
] as const;

export type QuickActionType = typeof quickActionTypes[number];

// Quick Update Request Schema
export const quickUpdateSiteVisitSchema = z.object({
  action: z.enum(quickActionTypes),
  scheduledFollowUpDate: z.coerce.date().optional(), // Required for reschedule action - coerce for HTTP JSON compatibility
  outcomeNotes: z.string().optional(), // Optional notes for any action
  reason: z.string().optional() // Optional reason for cancel/reschedule
});

export type QuickUpdateSiteVisit = z.infer<typeof quickUpdateSiteVisitSchema>;

// Quick Update Response Interface
export interface QuickUpdateResponse {
  success: boolean;
  data: {
    id: string;
    visitOutcome: VisitOutcome;
    scheduledFollowUpDate?: Date;
    outcomeNotes?: string;
    updatedAt: Date;
  };
  message: string;
}

// Marital status options
export const maritalStatus = [
  "single", "married", "divorced", "widowed", "separated"
] as const;

// Blood group options
export const bloodGroups = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"
] as const;

// Document types for employee document management
export const documentTypes = [
  "aadhar_card", "pan_card", "passport", "driving_license", "voter_id",
  "resume", "offer_letter", "joining_letter", "salary_certificate",
  "experience_certificate", "education_certificate", "photo", "other"
] as const;

// Comprehensive Employee Profile Schema
export const insertEmployeeSchema = z.object({
  // Basic Employee Information
  employeeId: z.string().min(1, "Employee ID is required"),
  systemUserId: z.string().optional(), // Links to User Management system
  
  // Personal Information
  personalInfo: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    middleName: z.string().optional(),
    displayName: z.string().min(2, "Display name must be at least 2 characters"),
    dateOfBirth: z.date().optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    maritalStatus: z.enum(maritalStatus).optional(),
    bloodGroup: z.enum(bloodGroups).optional(),
    nationality: z.string().optional(),
    photoURL: z.string().url().optional(),
  }),

  // Contact Information
  contactInfo: z.object({
    primaryEmail: z.string().email("Valid email is required"),
    secondaryEmail: z.string().email().optional(),
    primaryPhone: z.string().min(10, "Valid phone number is required"),
    secondaryPhone: z.string().optional(),
    permanentAddress: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
      country: z.string().default("India"),
    }).optional(),
    currentAddress: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
      country: z.string().default("India"),
      isSameAsPermanent: z.boolean().default(false),
    }).optional(),
  }),

  // Employment Information
  employmentInfo: z.object({
    department: z.enum(departments),
    designation: z.enum(designations),
    employmentType: z.enum(employmentTypes).default("full_time"),
    joinDate: z.date(),
    confirmationDate: z.date().optional(),
    probationPeriodMonths: z.number().min(0).max(24).default(6),
    reportingManagerId: z.string().optional(),
    workLocation: z.string().optional(),
    shiftPattern: z.string().optional(),
    weeklyOffDays: z.array(z.number()).default([0, 6]), // Sunday, Saturday
  }),

  // Payroll Information
  payrollInfo: z.object({
    payrollGrade: z.enum(payrollGrades).optional(),
    basicSalary: z.number().min(0).optional(),
    currency: z.string().default("INR"),
    paymentMethod: z.enum(["bank_transfer", "cash", "cheque"]).default("bank_transfer"),
    bankDetails: z.object({
      accountNumber: z.string().optional(),
      bankName: z.string().optional(),
      ifscCode: z.string().optional(),
      accountHolderName: z.string().optional(),
    }).optional(),
    pfNumber: z.string().optional(),
    esiNumber: z.string().optional(),
    panNumber: z.string().optional(),
    aadharNumber: z.string().optional(),
  }),

  // Professional Information
  professionalInfo: z.object({
    totalExperienceYears: z.number().min(0).optional(),
    relevantExperienceYears: z.number().min(0).optional(),
    highestQualification: z.string().optional(),
    skills: z.array(z.string()).default([]),
    certifications: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    previousEmployers: z.array(z.object({
      companyName: z.string(),
      designation: z.string(),
      duration: z.string(),
      reasonForLeaving: z.string().optional(),
    })).default([]),
  }),

  // Emergency Contact Information
  emergencyContacts: z.array(z.object({
    name: z.string().min(1, "Emergency contact name is required"),
    relationship: z.string().min(1, "Relationship is required"),
    primaryPhone: z.string().min(10, "Valid phone number is required"),
    secondaryPhone: z.string().optional(),
    address: z.string().optional(),
  })).default([]),

  // System Information
  status: z.enum(employeeStatus).default("active"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
  lastUpdatedBy: z.string().optional(),
});

// Employee Document Schema
export const insertEmployeeDocumentSchema = z.object({
  employeeId: z.string(),
  documentType: z.enum(documentTypes),
  documentName: z.string().min(1, "Document name is required"),
  documentUrl: z.string().url("Valid URL is required"),
  documentNumber: z.string().optional(), // For ID documents
  expiryDate: z.date().optional(),
  isVerified: z.boolean().default(false),
  verifiedBy: z.string().optional(),
  verifiedAt: z.date().optional(),
  uploadedBy: z.string(),
  notes: z.string().optional(),
});

// Employee Performance Review Schema
export const insertPerformanceReviewSchema = z.object({
  employeeId: z.string(),
  reviewPeriod: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }),
  reviewType: z.enum(["annual", "quarterly", "probation", "special"]).default("annual"),
  overallRating: z.number().min(1).max(5),
  goals: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    status: z.enum(["achieved", "partially_achieved", "not_achieved"]),
  })).default([]),
  strengths: z.array(z.string()).default([]),
  improvementAreas: z.array(z.string()).default([]),
  reviewerComments: z.string().optional(),
  employeeComments: z.string().optional(),
  reviewedBy: z.string(),
  nextReviewDate: z.date().optional(),
});

export const insertAttendanceSchema = z.object({
  userId: z.string(),
  date: z.date().optional(),
  checkInTime: z.date().optional(),
  checkOutTime: z.date().optional(),
  attendanceType: z.enum(["office", "remote", "field_work"]).default("office"),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  reason: z.string().optional(),
  checkInLatitude: z.string().optional(),
  checkInLongitude: z.string().optional(),
  checkInImageUrl: z.string().optional(),
  checkOutLatitude: z.string().optional(),
  checkOutLongitude: z.string().optional(),
  checkOutImageUrl: z.string().optional(),
  status: z.enum(["present", "absent", "late", "leave", "holiday", "half_day"]).default("present"),
  overtimeHours: z.number().optional(),
  otReason: z.string().optional(),
  otImageUrl: z.string().optional(),
  workingHours: z.number().optional(),
  breakHours: z.number().optional(),
  isLate: z.boolean().default(false),
  lateMinutes: z.number().optional(),
  approvedBy: z.string().optional(),
  remarks: z.string().optional(),
  isWithinOfficeRadius: z.boolean().default(false),
  distanceFromOffice: z.number().optional(),
  
  // Manual OT System Fields
  otStartTime: z.date().optional(),
  otEndTime: z.date().optional(),
  otStartLatitude: z.string().optional(),
  otStartLongitude: z.string().optional(),
  otStartImageUrl: z.string().optional(),
  otEndLatitude: z.string().optional(),
  otEndLongitude: z.string().optional(),
  otEndImageUrl: z.string().optional(),
  otStartAddress: z.string().optional(),
  otEndAddress: z.string().optional(),
  isManualOT: z.boolean().default(false),
  manualOTHours: z.number().optional(),
  otStatus: z.enum(["not_started", "in_progress", "completed"]).default("not_started"),
  otType: z.enum(["early_arrival", "late_departure", "weekend", "holiday"]).optional(),
});

export const insertOfficeLocationSchema = z.object({
  name: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  radius: z.number().default(100), // Default 100 meters radius
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Department timing schema for attendance calculations
export const insertDepartmentTimingSchema = z.object({
  departmentId: z.string(),
  department: z.enum(departments),
  workingHours: z.number().min(1).max(24).default(8), // Standard working hours per day
  checkInTime: z.string().regex(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i, "Time must be in 12-hour format (h:mm AM/PM)"), // e.g., "9:00 AM"
  checkOutTime: z.string().regex(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i, "Time must be in 12-hour format (h:mm AM/PM)") // e.g., "6:00 PM"
    .superRefine((checkOut, ctx) => {
      const checkIn = (ctx as any).parent.checkInTime;
      if (checkIn && checkOut) {
        // Parse 12-hour format properly for validation
        const checkInMatch = checkIn.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        const checkOutMatch = checkOut.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        
        if (checkInMatch && checkOutMatch) {
          let [, checkInHour, checkInMin, checkInPeriod] = checkInMatch;
          let [, checkOutHour, checkOutMin, checkOutPeriod] = checkOutMatch;
          
          let checkInHour24 = parseInt(checkInHour);
          let checkOutHour24 = parseInt(checkOutHour);
          
          if (checkInPeriod.toUpperCase() === 'PM' && checkInHour24 !== 12) checkInHour24 += 12;
          if (checkInPeriod.toUpperCase() === 'AM' && checkInHour24 === 12) checkInHour24 = 0;
          if (checkOutPeriod.toUpperCase() === 'PM' && checkOutHour24 !== 12) checkOutHour24 += 12;
          if (checkOutPeriod.toUpperCase() === 'AM' && checkOutHour24 === 12) checkOutHour24 = 0;
          
          const checkInMinutes = checkInHour24 * 60 + parseInt(checkInMin);
          const checkOutMinutes = checkOutHour24 * 60 + parseInt(checkOutMin);
          
          // Allow overnight shifts (checkout next day)
          if (checkOutMinutes <= checkInMinutes && checkOutMinutes >= checkInMinutes) {
            ctx.addIssue({
              code: 'custom',
              message: 'Check out time must be after check in time'
            });
          }
        }
      }
    }),
  lateThresholdMinutes: z.number().min(0).default(15), // Grace period for late arrivals (flexible input)
  overtimeThresholdMinutes: z.number().min(0).default(30), // Minimum minutes to qualify for OT (flexible input)
  isFlexibleTiming: z.boolean().default(false),
  flexibleCheckInStart: z.string().optional(), // e.g., "08:00"
  flexibleCheckInEnd: z.string().optional(),   // e.g., "10:00"
  breakDurationMinutes: z.number().min(0).default(60), // Lunch break duration
  weeklyOffDays: z.array(z.number().min(0).max(6)).default([0]), // 0=Sunday, 1=Monday, etc.
  isActive: z.boolean().default(true),
  createdBy: z.string(),
  updatedBy: z.string().optional(),
});

export const insertPermissionSchema = z.object({
  userId: z.string(),
  month: z.date(),
  minutesUsed: z.number().default(0),
});

// Phase 2: Enterprise Permission Matrix Schemas
export const insertRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional(),
  isSystemRole: z.boolean().default(false),
  department: z.enum(departments).nullable().optional(),
  designation: z.enum(designations).nullable().optional(),
  permissions: z.array(z.enum(systemPermissions)).default([]),
  approvalLimits: z.object({
    quotations: z.number().nullable().optional(),
    invoices: z.number().nullable().optional(),
    expenses: z.number().nullable().optional(),
    leave: z.boolean().default(false),
    overtime: z.boolean().default(false)
  }).optional()
});

export const insertUserRoleAssignmentSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
  assignedBy: z.string(),
  effectiveFrom: z.date().default(() => new Date()),
  effectiveTo: z.date().nullable().optional(),
  isActive: z.boolean().default(true)
});

export const insertPermissionOverrideSchema = z.object({
  userId: z.string(),
  permission: z.enum(systemPermissions),
  granted: z.boolean(),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  grantedBy: z.string(),
  effectiveFrom: z.date().default(() => new Date()),
  effectiveTo: z.date().nullable().optional()
});

export const insertAuditLogSchema = z.object({
  userId: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  changes: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  department: z.enum(departments).nullable().optional(),
  designation: z.enum(designations).nullable().optional()
});

// Payroll System Schemas
export const insertSalaryStructureSchema = z.object({
  userId: z.string(),
  employeeId: z.string(),
  fixedSalary: z.number().min(0),
  basicSalary: z.number().min(0),
  hra: z.number().min(0).optional(),
  allowances: z.number().min(0).optional(),
  variableComponent: z.number().min(0).optional(),
  effectiveFrom: z.date(),
  effectiveTo: z.date().nullable().optional(),
  isActive: z.boolean().default(true),
  createdBy: z.string(),
  approvedBy: z.string().optional()
});

export const insertPayrollSchema = z.object({
  userId: z.string(),
  employeeId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(new Date().getFullYear() + 1), // Prevent future years beyond next year
  workingDays: z.number().min(0).max(31),
  presentDays: z.number().min(0),
  absentDays: z.number().min(0),
  overtimeHours: z.number().min(0).default(0),
  leaveDays: z.number().min(0).default(0),
  
  // Salary Components
  fixedSalary: z.number().min(0),
  basicSalary: z.number().min(0),
  hra: z.number().min(0).default(0),
  allowances: z.number().min(0).default(0),
  variableComponent: z.number().min(0).default(0),
  overtimePay: z.number().min(0).default(0),
  
  // Gross Salary
  grossSalary: z.number().min(0),
  
  // Deductions
  pfDeduction: z.number().min(0).default(0),
  esiDeduction: z.number().min(0).default(0),
  tdsDeduction: z.number().min(0).default(0),
  advanceDeduction: z.number().min(0).default(0),
  loanDeduction: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
  totalDeductions: z.number().min(0),
  
  // Net Salary
  netSalary: z.number(),
  
  // Status
  status: z.enum(["draft", "pending", "approved", "paid", "cancelled"]).default("draft"),
  
  // Processing
  processedBy: z.string(),
  approvedBy: z.string().optional(),
  paidOn: z.date().optional(),
  paymentReference: z.string().optional(),
  
  // Metadata
  remarks: z.string().optional()
});

export const insertPayrollSettingsSchema = z.object({
  pfRate: z.number().min(0).max(100).default(12), // PF rate percentage
  esiRate: z.number().min(0).max(100).default(0.75), // ESI rate percentage
  tdsRate: z.number().min(0).max(100).default(0), // TDS rate percentage
  overtimeMultiplier: z.number().min(1).default(2), // Overtime pay multiplier
  standardWorkingHours: z.number().min(1).default(8), // Standard working hours per day
  standardWorkingDays: z.number().min(1).default(26), // Standard working days per month
  leaveDeductionRate: z.number().min(0).max(100).default(100), // Percentage deduction for leaves
  
  // Salary calculation rules
  pfApplicableFromSalary: z.number().min(0).default(15000), // PF applicable from this salary amount
  esiApplicableFromSalary: z.number().min(0).default(21000), // ESI applicable from this salary amount
  
  // Company details
  companyName: z.string().default("Prakash Greens Energy"),
  companyAddress: z.string().optional(),
  companyPan: z.string().optional(),
  companyTan: z.string().optional(),
  
  updatedBy: z.string()
});

export const insertSalaryAdvanceSchema = z.object({
  userId: z.string(),
  employeeId: z.string(),
  amount: z.number().min(0),
  reason: z.string(),
  requestDate: z.date().default(() => new Date()),
  approvedDate: z.date().optional(),
  deductionStartMonth: z.number().min(1).max(12),
  deductionStartYear: z.number().min(2020),
  numberOfInstallments: z.number().min(1).default(1),
  monthlyDeduction: z.number().min(0),
  remainingAmount: z.number().min(0),
  status: z.enum(["pending", "approved", "rejected", "completed"]).default("pending"),
  approvedBy: z.string().optional(),
  remarks: z.string().optional()
});

export const insertAttendancePolicySchema = z.object({
  name: z.string(),
  department: z.enum(departments).nullable().optional(),
  designation: z.enum(designations).nullable().optional(),
  
  // Timing policies
  checkInTime: z.string().default("9:30 AM"), // 12-hour format (h:mm AM/PM)
  checkOutTime: z.string().default("6:30 PM"), // 12-hour format (h:mm AM/PM)
  flexibleTiming: z.boolean().default(false),
  flexibilityMinutes: z.number().min(0).default(0),
  
  // Overtime policies
  overtimeAllowed: z.boolean().default(true),
  maxOvertimeHours: z.number().min(0).default(4),
  overtimeApprovalRequired: z.boolean().default(true),
  
  // Leave policies
  lateMarkAfterMinutes: z.number().min(0).default(15),
  halfDayMarkAfterMinutes: z.number().min(0).default(240), // 4 hours
  
  // Weekend and holiday policies
  weekendDays: z.array(z.number().min(0).max(6)).default([0, 6]), // 0=Sunday, 6=Saturday
  holidayPolicy: z.enum(["paid", "unpaid", "optional"]).default("paid"),
  
  isActive: z.boolean().default(true),
  createdBy: z.string()
});

// Enhanced Payroll System Schemas
export const insertPayrollFieldConfigSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  displayName: z.string().min(1, "Display name is required"),
  category: z.enum(["earnings", "deductions", "attendance"]),
  dataType: z.enum(["number", "percentage", "boolean", "text"]),
  isRequired: z.boolean().default(false),
  isSystemField: z.boolean().default(false),
  defaultValue: z.number().optional(),
  department: z.enum(departments).optional(),
  sortOrder: z.number().min(1).default(1),
  isActive: z.boolean().default(true)
});

export const insertEnhancedSalaryStructureSchema = z.object({
  userId: z.string(),
  employeeId: z.string(),
  fixedBasic: z.number().min(0),
  fixedHRA: z.number().min(0),
  fixedConveyance: z.number().min(0),
  customEarnings: z.record(z.number()).default({}),
  customDeductions: z.record(z.number()).default({}),
  perDaySalaryBase: z.enum(["basic", "basic_hra", "gross"]).default("basic_hra"),
  overtimeRate: z.number().min(0).default(1.5),
  epfApplicable: z.boolean().default(true),
  esiApplicable: z.boolean().default(true),
  vptAmount: z.number().min(0).default(0),
  templateId: z.string().optional(),
  effectiveFrom: z.date(),
  effectiveTo: z.date().optional(),
  isActive: z.boolean().default(true)
});

export const insertEnhancedPayrollSchema = z.object({
  userId: z.string(),
  employeeId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(new Date().getFullYear() + 1),
  monthDays: z.number().min(1).max(31),
  presentDays: z.number().min(0),
  paidLeaveDays: z.number().min(0).default(0),
  overtimeHours: z.number().min(0).default(0),
  perDaySalary: z.number().min(0),
  earnedBasic: z.number().min(0),
  earnedHRA: z.number().min(0),
  earnedConveyance: z.number().min(0),
  overtimePay: z.number().min(0).default(0),
  betta: z.number().min(0).default(0), // BETTA allowance from manual system
  dynamicEarnings: z.record(z.number()).default({}),
  grossSalary: z.number().min(0), // Gross before BETTA
  finalGross: z.number().min(0), // Final gross after BETTA
  dynamicDeductions: z.record(z.number()).default({}),
  epfDeduction: z.number().min(0).default(0),
  esiDeduction: z.number().min(0).default(0),
  vptDeduction: z.number().min(0).default(0),
  tdsDeduction: z.number().min(0).default(0),
  fineDeduction: z.number().min(0).default(0), // FINE from manual system
  salaryAdvance: z.number().min(0).default(0), // SALARY ADVANCE from manual system
  creditAdjustment: z.number().min(0).default(0), // CREDIT from manual system
  esiEligible: z.boolean().default(true), // ESI eligibility status
  totalEarnings: z.number().min(0),
  totalDeductions: z.number().min(0),
  netSalary: z.number(),
  status: z.enum(["draft", "processed", "approved", "paid"]).default("draft"),
  processedBy: z.string().optional(),
  processedAt: z.date().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  remarks: z.string().optional()
});

export const insertEnhancedPayrollSettingsSchema = z.object({
  epfEmployeeRate: z.number().min(0).max(100).default(12),
  epfEmployerRate: z.number().min(0).max(100).default(12),
  esiEmployeeRate: z.number().min(0).max(100).default(0.75),
  esiEmployerRate: z.number().min(0).max(100).default(3.25),
  epfCeiling: z.number().min(0).default(15000),
  esiThreshold: z.number().min(0).default(21000),
  tdsThreshold: z.number().min(0).default(250000),
  standardWorkingDays: z.number().min(1).default(26),
  standardWorkingHours: z.number().min(1).default(8),
  overtimeThresholdHours: z.number().min(0).default(8),
  companyName: z.string().default("Prakash Greens Energy"),
  companyAddress: z.string().optional(),
  companyPan: z.string().optional(),
  companyTan: z.string().optional(),
  autoCalculateStatutory: z.boolean().default(true),
  allowManualOverride: z.boolean().default(true),
  requireApprovalForProcessing: z.boolean().default(false)
});

// Enterprise user types
export type Department = typeof departments[number];
export type Designation = typeof designations[number];
export type PayrollGrade = typeof payrollGrades[number];
export type SystemPermission = typeof systemPermissions[number];
export type DesignationLevel = typeof designationLevels[keyof typeof designationLevels];

// Phase 1 types (backward compatible)
export type InsertUserEnhanced = z.infer<typeof insertUserEnhancedSchema>;
export type InsertDesignation = z.infer<typeof insertDesignationSchema>;
export type InsertPermissionGroup = z.infer<typeof insertPermissionGroupSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type InsertOfficeLocation = z.infer<typeof insertOfficeLocationSchema>;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

// Phase 2 types (enterprise RBAC)
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type InsertUserRoleAssignment = z.infer<typeof insertUserRoleAssignmentSchema>;
export type InsertPermissionOverride = z.infer<typeof insertPermissionOverrideSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Payroll System Types
export type InsertSalaryStructure = z.infer<typeof insertSalaryStructureSchema>;
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type InsertPayrollSettings = z.infer<typeof insertPayrollSettingsSchema>;
export type InsertSalaryAdvance = z.infer<typeof insertSalaryAdvanceSchema>;
export type InsertAttendancePolicy = z.infer<typeof insertAttendancePolicySchema>;

// Enterprise permission checking utilities
export const getDesignationLevel = (designation: Designation): number => {
  return designationLevels[designation];
};

export const canApproveForDesignation = (userDesignation: Designation, targetDesignation: Designation): boolean => {
  return getDesignationLevel(userDesignation) > getDesignationLevel(targetDesignation);
};

export const getDepartmentModuleAccess = (department: Department): SystemPermission[] => {
  const baseAccess: SystemPermission[] = ["dashboard.view"];
  
  switch (department) {
    case "operations":
      return [...baseAccess, "dashboard.full_access", "analytics.enterprise", "reports.advanced", "reports.export", "users.view", "departments.view"];
    case "admin":
      return [...baseAccess, "users.view", "users.create", "users.edit", "departments.view", "designations.view", "analytics.departmental", "reports.basic", "site_visit.view", "site_visit.create", "site_visit.edit", "site_visit.view_team", "site_visit.reports"];
    case "hr":
      return [...baseAccess, "attendance.view_all", "leave.view_all", "leave.approve", "users.view", "users.create", "users.edit", "customers.view", "products.view", "quotations.view", "invoices.view"];
    case "marketing":
      return [...baseAccess, "customers.view", "customers.create", "customers.edit", "products.view", "quotations.view", "reports.basic", "site_visit.view", "site_visit.create", "site_visit.edit", "site_visit.view_team", "site_visit.reports"];
    case "sales":
      return [...baseAccess, "customers.view", "customers.create", "customers.edit", "quotations.view", "quotations.create", "quotations.edit", "products.view", "reports.basic"];
    case "technical":
      return [...baseAccess, "products.view", "products.create", "products.edit", "products.specifications", "products.inventory", "site_visit.view", "site_visit.create", "site_visit.edit", "site_visit.view_team", "site_visit.reports"];
    case "housekeeping":
      return [...baseAccess, "attendance.view_own"];
    default:
      return baseAccess;
  }
};

// Designation-based Action Permissions (what actions they can perform within modules)
export const getDesignationActionPermissions = (designation: Designation): SystemPermission[] => {
  const level = getDesignationLevel(designation);
  
  // Higher designation = more action permissions
  const permissions: SystemPermission[] = [];
  
  // Basic permissions for all designations
  permissions.push("dashboard.view", "attendance.view_own", "leave.view_own", "leave.request");
  
  // Level 1 (House Man)
  if (level >= 1) {
    permissions.push("attendance.mark");
  }
  
  // Level 2+ (Welder and above)
  if (level >= 2) {
    permissions.push("products.view");
  }
  
  // Level 3+ (Technician and above)
  if (level >= 3) {
    permissions.push("products.create", "products.edit");
  }
  
  // Level 4+ (CRE and above)
  if (level >= 4) {
    permissions.push("customers.create", "customers.edit", "quotations.create", "quotations.edit");
  }
  
  // Level 5+ (Executive and above)
  if (level >= 5) {
    permissions.push("invoices.create", "approve.quotations.basic", "attendance.view_team");
  }
  
  // Level 6+ (Team Leader and above)
  if (level >= 6) {
    permissions.push("approve.quotations.advanced", "approve.leave.team", "users.view", "reports.advanced");
  }
  
  // Level 7+ (Officer and above)
  if (level >= 7) {
    permissions.push("approve.invoices.basic", "approve.leave.department", "users.create", "users.edit", "analytics.departmental");
  }
  
  // Level 8+ (GM and above)
  if (level >= 8) {
    permissions.push("approve.invoices.advanced", "users.permissions", "analytics.enterprise", "system.settings");
  }
  
  // Level 9 (CEO)
  if (level >= 9) {
    permissions.push("system.backup", "system.audit", "system.integrations", "users.delete", "departments.create", "departments.edit", "departments.delete");
  }
  
  return permissions;
};

// Default permissions for new employees without department/designation
export const getNewEmployeePermissions = (): SystemPermission[] => {
  return [
    "dashboard.view",
    "attendance.view_own",
    "leave.view_own",
    "leave.request"
  ];
};

// Combined Department + Designation permissions
export const getEffectivePermissions = (department: Department | null, designation: Designation | null): SystemPermission[] => {
  // If new employee without department or designation, return basic attendance permissions
  if (!department || !designation) {
    return getNewEmployeePermissions();
  }
  
  const departmentPermissions = getDepartmentModuleAccess(department);
  const designationPermissions = getDesignationActionPermissions(designation);
  
  // Combine and deduplicate permissions
  const combinedPermissions = new Set([...departmentPermissions, ...designationPermissions]);
  return Array.from(combinedPermissions);
};


