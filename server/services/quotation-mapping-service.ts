/**
 * Site Visit Data Mapping Service for Quotation System
 * Implements comprehensive data mapping and analysis as specified in the directive
 */

import { storage } from "../storage";
import { 
  QuotationProject, 
  SiteVisitMapping, 
  InsertQuotation,
  QuotationSource,
  QuotationStatus 
} from "@shared/schema";

// Comprehensive field mapping matrix as defined in the directive
const FIELD_MAPPING_MATRIX = {
  // Critical fields - Must be present for quotation creation
  critical: [
    'customer.name',
    'customer.mobile', 
    'customer.address',
    'marketingData.projectType',
    'visitOutcome' // Must be 'converted' for quotation creation
  ],
  
  // Important fields - Significantly impact quotation quality
  important: [
    'customer.propertyType',
    'customer.ebServiceNumber',
    'marketingData.onGridConfig.inverterKW',
    'marketingData.onGridConfig.panelCount',
    'marketingData.onGridConfig.projectValue',
    'marketingData.offGridConfig.inverterKW',
    'marketingData.offGridConfig.batteryCount',
    'marketingData.hybridConfig.inverterKW',
    'marketingData.waterHeaterConfig.litre',
    'marketingData.waterPumpConfig.hp',
    'technicalData.serviceTypes',
    'technicalData.workType',
    'adminData.bankProcess',
    'adminData.ebProcess'
  ],
  
  // Optional fields - Enhance quotation completeness
  optional: [
    'customer.location',
    'marketingData.onGridConfig.solarPanelMake',
    'marketingData.onGridConfig.inverterMake',
    'marketingData.onGridConfig.structureType',
    'marketingData.onGridConfig.civilWorkScope',
    'marketingData.onGridConfig.netMeterScope',
    'technicalData.teamMembers',
    'technicalData.description',
    'technicalData.pendingRemarks',
    'adminData.purchase',
    'adminData.driving',
    'sitePhotos',
    'siteInLocation',
    'siteOutLocation',
    'notes',
    'outcomeNotes',
    'scheduledFollowUpDate'
  ]
};

// Business rules from directive
const BUSINESS_RULES = {
  pricing: {
    onGridPerKW: 68000,    // ₹68,000 per kW for on-grid systems
    offGridPerKW: 68000,   // Same rate for off-grid
    hybridPerKW: 68000     // Same rate for hybrid
  },
  subsidy: {
    onGridPerKW: 26000,    // ₹26,000 per kW government subsidy
    hybridPerKW: 26000,    // Hybrid also gets subsidy
    offGridPerKW: 0,       // Off-grid doesn't get subsidy
    waterHeater: 0,        // Water heater doesn't get subsidy
    waterPump: 0           // Water pump doesn't get subsidy
  },
  payment: {
    advancePercentage: 90, // 90% advance payment
    balancePercentage: 10  // 10% balance after completion
  },
  delivery: {
    standardWeeks: "2_3_weeks" // 2-3 weeks delivery timeframe
  }
};

export interface CompletenessAnalysis {
  completenessScore: number;
  missingCriticalFields: string[];
  missingImportantFields: string[];
  missingOptionalFields: string[];
  canCreateQuotation: boolean;
  recommendedAction: 'ready_for_quotation' | 'collect_missing_data' | 'invalid_for_quotation';
  fieldCoverage: {
    critical: number;
    important: number;
    optional: number;
  };
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface MappingResult {
  quotationData: Partial<InsertQuotation>;
  mappingMetadata: SiteVisitMapping;
  completenessAnalysis: CompletenessAnalysis;
  businessRuleWarnings: string[];
  dataTransformations: Array<{
    field: string;
    originalValue: any;
    transformedValue: any;
    reason: string;
  }>;
}

export class DataCompletenessAnalyzer {
  /**
   * Analyze site visit data completeness using comprehensive field matrix
   */
  static analyze(siteVisit: any): CompletenessAnalysis {
    const missing = {
      critical: [] as string[],
      important: [] as string[],
      optional: [] as string[]
    };

    // Check critical fields
    FIELD_MAPPING_MATRIX.critical.forEach(fieldPath => {
      if (!this.getNestedValue(siteVisit, fieldPath)) {
        missing.critical.push(fieldPath);
      }
    });

    // Check important fields
    FIELD_MAPPING_MATRIX.important.forEach(fieldPath => {
      if (!this.getNestedValue(siteVisit, fieldPath)) {
        missing.important.push(fieldPath);
      }
    });

    // Check optional fields
    FIELD_MAPPING_MATRIX.optional.forEach(fieldPath => {
      if (!this.getNestedValue(siteVisit, fieldPath)) {
        missing.optional.push(fieldPath);
      }
    });

    // Calculate field coverage percentages
    const fieldCoverage = {
      critical: Math.round(((FIELD_MAPPING_MATRIX.critical.length - missing.critical.length) / FIELD_MAPPING_MATRIX.critical.length) * 100),
      important: Math.round(((FIELD_MAPPING_MATRIX.important.length - missing.important.length) / FIELD_MAPPING_MATRIX.important.length) * 100),
      optional: Math.round(((FIELD_MAPPING_MATRIX.optional.length - missing.optional.length) / FIELD_MAPPING_MATRIX.optional.length) * 100)
    };

    // Calculate overall completeness score with weighted importance
    const weightedScore = (
      fieldCoverage.critical * 0.6 +  // Critical fields weight 60%
      fieldCoverage.important * 0.3 + // Important fields weight 30%
      fieldCoverage.optional * 0.1    // Optional fields weight 10%
    );

    // Determine quality grade
    let qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (weightedScore >= 90) qualityGrade = 'A';
    else if (weightedScore >= 80) qualityGrade = 'B';
    else if (weightedScore >= 70) qualityGrade = 'C';
    else if (weightedScore >= 60) qualityGrade = 'D';
    else qualityGrade = 'F';

    // Determine if quotation can be created
    const canCreateQuotation = missing.critical.length === 0 && 
                              siteVisit.visitOutcome === 'converted' &&
                              siteVisit.status === 'completed';

    // Determine recommended action
    let recommendedAction: 'ready_for_quotation' | 'collect_missing_data' | 'invalid_for_quotation';
    if (!canCreateQuotation) {
      if (siteVisit.visitOutcome !== 'converted') {
        recommendedAction = 'invalid_for_quotation';
      } else {
        recommendedAction = 'collect_missing_data';
      }
    } else {
      recommendedAction = 'ready_for_quotation';
    }

    return {
      completenessScore: Math.round(weightedScore),
      missingCriticalFields: missing.critical,
      missingImportantFields: missing.important,
      missingOptionalFields: missing.optional,
      canCreateQuotation,
      recommendedAction,
      fieldCoverage,
      qualityGrade
    };
  }

  /**
   * Helper function to safely get nested object values
   */
  private static getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }
}

export class SiteVisitDataMapper {
  /**
   * Map site visit data to comprehensive quotation format
   */
  static async mapToQuotation(siteVisit: any, userId: string): Promise<MappingResult> {
    // Analyze data completeness first
    const completenessAnalysis = DataCompletenessAnalyzer.analyze(siteVisit);
    
    if (!completenessAnalysis.canCreateQuotation) {
      const error = new Error(`Site visit cannot be converted to quotation: ${completenessAnalysis.recommendedAction}`);
      (error as any).completenessAnalysis = completenessAnalysis;
      (error as any).validationError = true;
      throw error;
    }

    const warnings: string[] = [];
    const transformations: Array<{field: string; originalValue: any; transformedValue: any; reason: string}> = [];

    // Generate unique quotation number with proper format
    const quotationNumber = await this.generateQuotationNumber();

    // Map customer data - ensure customer exists or create
    const customerId = await this.ensureCustomerExists(siteVisit.customer, transformations);

    // Map projects with comprehensive business rules
    const projects = await this.mapProjects(siteVisit.marketingData, warnings, transformations);
    
    if (projects.length === 0) {
      const error = new Error("No valid projects found in site visit marketing data");
      (error as any).projectValidationError = true;
      (error as any).recommendedAction = "update_marketing_data";
      (error as any).missingData = "project_configurations";
      (error as any).completenessAnalysis = completenessAnalysis; // Include completeness data
      (error as any).validationError = true; // Mark as validation error for consistent handling
      throw error;
    }

    // Calculate comprehensive pricing with business rules
    const pricingCalculation = this.calculatePricing(projects, warnings);

    // Prepare mapping metadata with enhanced tracking - keep field categories separate
    const mappingMetadata: SiteVisitMapping = {
      sourceVisitId: siteVisit.id,
      mappedAt: new Date(),
      mappedBy: userId,
      completenessScore: completenessAnalysis.completenessScore,
      missingCriticalFields: completenessAnalysis.missingCriticalFields,
      missingOptionalFields: completenessAnalysis.missingOptionalFields, // Keep only truly optional fields
      dataQualityNotes: `Auto-mapped from site visit ${siteVisit.id}. Quality Grade: ${completenessAnalysis.qualityGrade}. Important fields missing: ${completenessAnalysis.missingImportantFields.length}. ${warnings.length > 0 ? `Warnings: ${warnings.join('; ')}` : 'No warnings.'}`
    };

    // Build comprehensive quotation data
    const quotationData: Partial<InsertQuotation> = {
      quotationNumber,
      customerId,
      source: "site_visit" as QuotationSource,
      siteVisitMapping: mappingMetadata,
      projects,
      totalSystemCost: pricingCalculation.totalSystemCost,
      totalSubsidyAmount: pricingCalculation.totalSubsidyAmount,
      totalCustomerPayment: pricingCalculation.totalCustomerPayment,
      advancePaymentPercentage: BUSINESS_RULES.payment.advancePercentage,
      advanceAmount: pricingCalculation.advanceAmount,
      balanceAmount: pricingCalculation.balanceAmount,
      paymentTerms: "advance_90_balance_10",
      deliveryTimeframe: BUSINESS_RULES.delivery.standardWeeks,
      termsTemplate: this.selectTermsTemplate(siteVisit.customer.propertyType),
      status: "draft" as QuotationStatus,
      followUps: [],
      communicationPreference: "whatsapp",
      documentVersion: 1,
      preparedBy: userId,
      internalNotes: `Generated from site visit ${siteVisit.id} on ${new Date().toISOString()}. Visit outcome: ${siteVisit.visitOutcome}. Department: ${siteVisit.department}.`,
      customerNotes: this.extractCustomerNotes(siteVisit),
      attachments: []
    };

    return {
      quotationData,
      mappingMetadata,
      completenessAnalysis,
      businessRuleWarnings: warnings,
      dataTransformations: transformations
    };
  }

  /**
   * Generate properly formatted quotation number
   */
  private static async generateQuotationNumber(): Promise<string> {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `Q-${timestamp}-${randomSuffix}`;
  }

  /**
   * Ensure customer exists in system or create from site visit data
   */
  private static async ensureCustomerExists(customerData: any, transformations: any[]): Promise<string> {
    if (customerData.id) {
      return customerData.id;
    }

    // Create customer from site visit data
    const newCustomerData = {
      name: customerData.name,
      mobile: customerData.mobile,
      address: customerData.address,
      ebServiceNumber: customerData.ebServiceNumber,
      propertyType: customerData.propertyType,
      location: customerData.location,
      profileCompleteness: "full" as const,
      createdFrom: "site_visit" as const
    };

    transformations.push({
      field: 'customer',
      originalValue: 'site_visit_customer_data',
      transformedValue: 'new_customer_created',
      reason: 'Customer did not exist, created from site visit data'
    });

    const customer = await storage.createCustomer(newCustomerData);
    return customer.id;
  }

  /**
   * Map marketing data to project configurations with multi-project support
   */
  private static async mapProjects(marketingData: any, warnings: string[], transformations: any[]): Promise<QuotationProject[]> {
    const projects: QuotationProject[] = [];

    if (!marketingData) {
      warnings.push("No marketing data found");
      return projects;
    }

    // Support multi-project quotations by checking all possible project configurations
    // A single site visit can have multiple project types configured

    // Map on-grid project if configured
    if (marketingData.onGridConfig && marketingData.onGridConfig.inverterKW) {
      projects.push(this.mapOnGridProject(marketingData.onGridConfig, warnings, transformations));
      transformations.push({
        field: 'projects.on_grid',
        originalValue: 'site_visit_marketing_data',
        transformedValue: 'on_grid_project_config',
        reason: 'On-grid configuration found and mapped'
      });
    }
    
    // Map off-grid project if configured
    if (marketingData.offGridConfig && marketingData.offGridConfig.inverterKW) {
      projects.push(this.mapOffGridProject(marketingData.offGridConfig, warnings, transformations));
      transformations.push({
        field: 'projects.off_grid',
        originalValue: 'site_visit_marketing_data',
        transformedValue: 'off_grid_project_config',
        reason: 'Off-grid configuration found and mapped'
      });
    }
    
    // Map hybrid project if configured
    if (marketingData.hybridConfig && marketingData.hybridConfig.inverterKW) {
      projects.push(this.mapHybridProject(marketingData.hybridConfig, warnings, transformations));
      transformations.push({
        field: 'projects.hybrid',
        originalValue: 'site_visit_marketing_data',
        transformedValue: 'hybrid_project_config',
        reason: 'Hybrid configuration found and mapped'
      });
    }
    
    // Map water heater project if configured
    if (marketingData.waterHeaterConfig && marketingData.waterHeaterConfig.litre) {
      projects.push(this.mapWaterHeaterProject(marketingData.waterHeaterConfig, warnings, transformations));
      transformations.push({
        field: 'projects.water_heater',
        originalValue: 'site_visit_marketing_data',
        transformedValue: 'water_heater_project_config',
        reason: 'Water heater configuration found and mapped'
      });
    }
    
    // Map water pump project if configured
    if (marketingData.waterPumpConfig && marketingData.waterPumpConfig.hp) {
      projects.push(this.mapWaterPumpProject(marketingData.waterPumpConfig, warnings, transformations));
      transformations.push({
        field: 'projects.water_pump',
        originalValue: 'site_visit_marketing_data',
        transformedValue: 'water_pump_project_config',
        reason: 'Water pump configuration found and mapped'
      });
    }

    // Warn if no projects were found
    if (projects.length === 0) {
      warnings.push("No valid project configurations found in marketing data");
    } else {
      transformations.push({
        field: 'projects.total',
        originalValue: marketingData.projectType || 'unknown',
        transformedValue: `${projects.length}_projects_mapped`,
        reason: `Multi-project quotation created with ${projects.length} project(s)`
      });
    }

    return projects;
  }

  /**
   * Map on-grid solar project with business rules
   */
  private static mapOnGridProject(config: any, warnings: string[], transformations: any[]): QuotationProject {
    const systemKW = config.inverterKW || 3;
    const pricePerKW = BUSINESS_RULES.pricing.onGridPerKW;
    const subsidyPerKW = BUSINESS_RULES.subsidy.onGridPerKW;

    if (!config.inverterKW) {
      transformations.push({
        field: 'onGridConfig.inverterKW',
        originalValue: undefined,
        transformedValue: 3,
        reason: 'Default 3kW system applied due to missing inverter capacity'
      });
    }

    const projectValue = config.projectValue || (systemKW * pricePerKW);
    const subsidyAmount = systemKW * subsidyPerKW;
    const customerPayment = projectValue - subsidyAmount;

    return {
      projectType: 'on_grid',
      systemKW,
      pricePerKW,
      solarPanelMake: config.solarPanelMake || [],
      panelWatts: config.panelWatts || "530",
      panelCount: config.panelCount || Math.ceil(systemKW * 1000 / 530), // Calculate panels based on system size
      inverterMake: config.inverterMake || [],
      inverterWatts: config.inverterWatts || `${systemKW}kw`,
      inverterKW: systemKW,
      inverterQty: config.inverterQty || 1,
      inverterPhase: config.inverterPhase || "single_phase",
      lightningArrest: config.lightningArrest || false,
      earth: config.earth || "ac_dc",
      floor: config.floor,
      structureHeight: config.structureHeight || 0,
      structureType: config.structureType,
      gpStructure: config.gpStructure,
      monoRail: config.monoRail,
      civilWorkScope: config.civilWorkScope,
      netMeterScope: config.netMeterScope,
      projectValue,
      subsidyAmount,
      customerPayment,
      installationNotes: config.others,
      warranty: {
        panel: "25_years",
        inverter: "5_years",
        installation: "2_years"
      }
    };
  }

  /**
   * Map off-grid solar project with business rules
   */
  private static mapOffGridProject(config: any, warnings: string[], transformations: any[]): QuotationProject {
    const systemKW = config.inverterKW || 3;
    const pricePerKW = BUSINESS_RULES.pricing.offGridPerKW;

    const projectValue = config.projectValue || (systemKW * pricePerKW);
    const subsidyAmount = 0; // Off-grid doesn't get subsidy
    const customerPayment = projectValue;

    return {
      projectType: 'off_grid',
      systemKW,
      pricePerKW,
      solarPanelMake: config.solarPanelMake || [],
      panelWatts: config.panelWatts || "530",
      panelCount: config.panelCount || Math.ceil(systemKW * 1000 / 530),
      inverterMake: config.inverterMake || [],
      inverterWatts: config.inverterWatts || `${systemKW}kw`,
      inverterKW: systemKW,
      inverterQty: config.inverterQty || 1,
      inverterPhase: config.inverterPhase || "single_phase",
      batteryBrand: config.batteryBrand || "exide",
      batteryType: config.batteryType || "lead_acid",
      batteryAH: config.batteryAH || "150",
      voltage: config.voltage || 12,
      batteryCount: config.batteryCount || 4,
      batteryStands: config.batteryStands,
      lightningArrest: config.lightningArrest || false,
      earth: config.earth || "ac_dc",
      floor: config.floor,
      structureHeight: config.structureHeight || 0,
      structureType: config.structureType,
      gpStructure: config.gpStructure,
      monoRail: config.monoRail,
      civilWorkScope: config.civilWorkScope,
      projectValue,
      subsidyAmount,
      customerPayment,
      installationNotes: config.others,
      warranty: {
        panel: "25_years",
        inverter: "5_years",
        battery: "2_years",
        installation: "2_years"
      }
    };
  }

  /**
   * Map hybrid solar project with business rules
   */
  private static mapHybridProject(config: any, warnings: string[], transformations: any[]): QuotationProject {
    const systemKW = config.inverterKW || 3;
    const pricePerKW = BUSINESS_RULES.pricing.hybridPerKW;
    const subsidyPerKW = BUSINESS_RULES.subsidy.hybridPerKW;

    const projectValue = config.projectValue || (systemKW * pricePerKW);
    const subsidyAmount = systemKW * subsidyPerKW;
    const customerPayment = projectValue - subsidyAmount;

    return {
      projectType: 'hybrid',
      systemKW,
      pricePerKW,
      solarPanelMake: config.solarPanelMake || [],
      panelWatts: config.panelWatts || "530",
      panelCount: config.panelCount || Math.ceil(systemKW * 1000 / 530),
      inverterMake: config.inverterMake || [],
      inverterWatts: config.inverterWatts || `${systemKW}kw`,
      inverterKW: systemKW,
      inverterQty: config.inverterQty || 1,
      inverterPhase: config.inverterPhase || "single_phase",
      batteryBrand: config.batteryBrand || "exide",
      batteryType: config.batteryType || "lead_acid",
      batteryAH: config.batteryAH || "150",
      voltage: config.voltage || 12,
      batteryCount: config.batteryCount || 4,
      batteryStands: config.batteryStands,
      lightningArrest: config.lightningArrest || false,
      earth: config.earth || "ac_dc",
      floor: config.floor,
      structureHeight: config.structureHeight || 0,
      structureType: config.structureType,
      gpStructure: config.gpStructure,
      monoRail: config.monoRail,
      civilWorkScope: config.civilWorkScope,
      electricalWorkScope: config.electricalWorkScope,
      netMeterScope: config.netMeterScope,
      projectValue,
      subsidyAmount,
      customerPayment,
      installationNotes: config.others,
      warranty: {
        panel: "25_years",
        inverter: "5_years",
        battery: "2_years",
        installation: "2_years"
      }
    };
  }

  /**
   * Map water heater project
   */
  private static mapWaterHeaterProject(config: any, warnings: string[], transformations: any[]): QuotationProject {
    const projectValue = config.projectValue || 15000;
    const subsidyAmount = 0; // Water heater doesn't get subsidy
    const customerPayment = projectValue;

    return {
      projectType: 'water_heater',
      brand: config.brand || "venus",
      litre: config.litre || 100,
      heatingCoil: config.heatingCoil,
      floor: config.floor,
      plumbingWorkScope: config.plumbingWorkScope,
      civilWorkScope: config.civilWorkScope,
      projectValue,
      subsidyAmount,
      customerPayment,
      installationNotes: config.others,
      warranty: {
        heater: "5_years",
        installation: "1_year"
      }
    };
  }

  /**
   * Map water pump project
   */
  private static mapWaterPumpProject(config: any, warnings: string[], transformations: any[]): QuotationProject {
    const projectValue = config.projectValue || 50000;
    const subsidyAmount = 0; // Water pump doesn't get subsidy
    const customerPayment = projectValue;

    return {
      projectType: 'water_pump',
      hp: config.hp || "1HP",
      drive: config.drive || "AC Drive",
      solarPanel: config.solarPanel,
      structureHeight: config.structureHeight || 0,
      panelBrand: config.panelBrand || [],
      panelCount: config.panelCount || 4,
      structureType: config.structureType,
      gpStructure: config.gpStructure,
      monoRail: config.monoRail,
      plumbingWorkScope: config.plumbingWorkScope,
      civilWorkScope: config.civilWorkScope,
      projectValue,
      subsidyAmount,
      customerPayment,
      installationNotes: config.others,
      warranty: {
        pump: "2_years",
        panel: "25_years",
        installation: "1_year"
      }
    };
  }

  /**
   * Calculate comprehensive pricing with business rules
   */
  private static calculatePricing(projects: QuotationProject[], warnings: string[]) {
    const totalSystemCost = projects.reduce((sum, project) => sum + project.projectValue, 0);
    const totalSubsidyAmount = projects.reduce((sum, project) => sum + project.subsidyAmount, 0);
    const totalCustomerPayment = totalSystemCost - totalSubsidyAmount;
    
    const advanceAmount = Math.round(totalCustomerPayment * (BUSINESS_RULES.payment.advancePercentage / 100));
    const balanceAmount = totalCustomerPayment - advanceAmount;

    if (totalSystemCost === 0) {
      warnings.push("Total system cost is zero - please verify project values");
    }

    return {
      totalSystemCost,
      totalSubsidyAmount,
      totalCustomerPayment,
      advanceAmount,
      balanceAmount
    };
  }

  /**
   * Select appropriate terms template based on property type
   */
  private static selectTermsTemplate(propertyType?: string) {
    switch (propertyType) {
      case 'residential': return "residential";
      case 'commercial': return "commercial";
      case 'agri': return "agri";
      default: return "standard";
    }
  }

  /**
   * Extract customer-facing notes from site visit
   */
  private static extractCustomerNotes(siteVisit: any): string {
    const notes: string[] = [];
    
    if (siteVisit.notes) {
      notes.push(siteVisit.notes);
    }
    
    if (siteVisit.outcomeNotes) {
      notes.push(`Visit outcome: ${siteVisit.outcomeNotes}`);
    }

    if (siteVisit.technicalData?.description) {
      notes.push(`Technical notes: ${siteVisit.technicalData.description}`);
    }

    return notes.join(' | ');
  }
}