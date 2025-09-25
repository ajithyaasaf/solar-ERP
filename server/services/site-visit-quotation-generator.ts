/**
 * SiteVisitQuotationGenerator Service
 * Orchestrates the complete workflow from site visit data to final quotation
 * 
 * Core Features:
 * - Site visit data analysis and extraction
 * - Smart defaults application
 * - BOM generation with pricing
 * - Complete quotation assembly
 * - Data validation and recommendations
 */

import {
  type SiteVisit,
  type InsertQuotationDraft,
  type QuotationProjectType,
  type SmartDefaultsResult,
  type BOMItem,
  type Pricing,
  type Warranty,
} from "@shared/schema";

import { SmartDefaultEngine } from "./quotation-smart-defaults";
import { PrecisePricingEngine } from "./quotation-pricing-engine";
import { BOMGenerator } from "./quotation-bom-generator";
import { SiteVisitDataAnalyzer } from "./site-visit-data-analyzer";

interface QuotationGenerationOptions {
  includeCompetitiveAnalysis?: boolean;
  overridePricing?: Partial<Pricing>;
  customBOMItems?: BOMItem[];
  skipValidation?: boolean;
  forceProjectType?: QuotationProjectType;
}

interface QuotationGenerationResult {
  quotationDraft: InsertQuotationDraft;
  dataAnalysis: {
    completenessScore: number;
    missingCriticalFields: string[];
    recommendations: string[];
    appliedDefaults: any[];
  };
  pricingBreakdown: any;
  bomValidation: {
    isComplete: boolean;
    missingItems: string[];
    recommendations: string[];
  };
  validationResults: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  };
  metadata: {
    generatedAt: Date;
    sourceVisitId: string;
    systemCapacity: string;
    projectValue: number;
    processingSteps: string[];
  };
}

export class SiteVisitQuotationGenerator {

  /**
   * Generate complete quotation from site visit data
   */
  static async generateQuotation(
    siteVisit: SiteVisit,
    options: QuotationGenerationOptions = {}
  ): Promise<QuotationGenerationResult> {
    const processingSteps: string[] = [];
    
    try {
      processingSteps.push("Starting quotation generation from site visit");

      // Step 1: Analyze site visit data completeness
      processingSteps.push("Analyzing site visit data completeness");
      const dataAnalysisReport = SiteVisitDataAnalyzer.analyzeSiteVisitData(siteVisit);
      
      // Step 2: Apply smart defaults to create initial quotation draft
      processingSteps.push("Applying smart defaults to create quotation draft");
      const smartDefaultsResult = SmartDefaultEngine.applySmartDefaults(siteVisit);
      
      // Check if we can proceed with quotation generation
      if (smartDefaultsResult.completenessScore < 0.3) {
        throw new Error("Insufficient site visit data for quotation generation. Please complete more fields.");
      }

      // Step 3: Override project type if specified
      if (options.forceProjectType) {
        smartDefaultsResult.quotationDraft.projectType = options.forceProjectType;
        processingSteps.push(`Forced project type to ${options.forceProjectType}`);
      }

      // Step 4: Generate BOM
      processingSteps.push("Generating Bill of Materials");
      const bomItems = BOMGenerator.generateBOM(smartDefaultsResult.quotationDraft);
      smartDefaultsResult.quotationDraft.billOfMaterials = bomItems;

      // Step 5: Add custom BOM items if provided
      if (options.customBOMItems && options.customBOMItems.length > 0) {
        processingSteps.push("Adding custom BOM items");
        smartDefaultsResult.quotationDraft.billOfMaterials = [
          ...bomItems,
          ...options.customBOMItems
        ];
      }

      // Step 6: Calculate detailed pricing
      processingSteps.push("Calculating detailed pricing");
      const pricingResult = PrecisePricingEngine.calculateDetailedPricing(smartDefaultsResult.quotationDraft);
      
      // Step 7: Apply pricing overrides if provided
      if (options.overridePricing) {
        processingSteps.push("Applying pricing overrides");
        Object.assign(pricingResult.pricing, options.overridePricing);
      }

      // Step 8: Update BOM with pricing
      processingSteps.push("Updating BOM with pricing information");
      const updatedBOM = BOMGenerator.updateBOMWithPricing(
        smartDefaultsResult.quotationDraft.billOfMaterials || [],
        pricingResult
      );

      // Step 9: Assemble final quotation draft
      processingSteps.push("Assembling final quotation draft");
      const finalQuotationDraft = this.assembleFinalQuotation(
        smartDefaultsResult.quotationDraft,
        pricingResult.pricing,
        updatedBOM,
        siteVisit
      );

      // Step 10: Validate BOM completeness
      processingSteps.push("Validating BOM completeness");
      const bomValidation = BOMGenerator.validateBOM(
        updatedBOM,
        finalQuotationDraft.projectType!
      );

      // Step 11: Validate final quotation
      processingSteps.push("Validating final quotation");
      const validationResults = SmartDefaultEngine.validateQuotationDraft(finalQuotationDraft);

      // Step 12: Competitive analysis (if requested)
      if (options.includeCompetitiveAnalysis) {
        processingSteps.push("Performing competitive analysis");
        await this.addCompetitiveAnalysis(finalQuotationDraft, pricingResult);
      }

      processingSteps.push("Quotation generation completed successfully");

      return {
        quotationDraft: finalQuotationDraft,
        dataAnalysis: {
          completenessScore: smartDefaultsResult.completenessScore,
          missingCriticalFields: smartDefaultsResult.missingCriticalFields,
          recommendations: smartDefaultsResult.recommendations,
          appliedDefaults: smartDefaultsResult.appliedDefaults
        },
        pricingBreakdown: pricingResult,
        bomValidation,
        validationResults,
        metadata: {
          generatedAt: new Date(),
          sourceVisitId: siteVisit.id,
          systemCapacity: finalQuotationDraft.systemCapacity || "Unknown",
          projectValue: pricingResult.pricing.customerPayment,
          processingSteps
        }
      };

    } catch (error) {
      processingSteps.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Quotation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assemble final quotation draft with all components
   */
  private static assembleFinalQuotation(
    baseDraft: Partial<InsertQuotationDraft>,
    pricing: Pricing,
    bomItems: BOMItem[],
    siteVisit: SiteVisit
  ): InsertQuotationDraft {
    
    // Generate quotation number if not present
    const quotationNumber = baseDraft.quotationNumber || 
      this.generateQuotationNumber(siteVisit, baseDraft.projectType!);

    // Extract technical requirements
    const technicalRequirements = SmartDefaultEngine.extractTechnicalRequirements(siteVisit);

    // Set data completeness metrics
    const totalFields = 25; // Key fields count
    const explicitFields = Object.keys(baseDraft).filter(key => 
      baseDraft[key as keyof typeof baseDraft] !== undefined
    ).length;
    const dataCompleteness = Math.min(explicitFields / totalFields, 1.0);

    const finalDraft: InsertQuotationDraft = {
      // Customer information
      customerId: baseDraft.customerId || siteVisit.customer.name,
      customerName: baseDraft.customerName || siteVisit.customer.name,
      customerMobile: baseDraft.customerMobile || siteVisit.customer.mobile,
      customerAddress: baseDraft.customerAddress || siteVisit.customer.address,
      customerEmail: baseDraft.customerEmail || siteVisit.customer.email,
      propertyType: baseDraft.propertyType || siteVisit.customer.propertyType,
      ebServiceNumber: baseDraft.ebServiceNumber || siteVisit.customer.ebServiceNumber,

      // Site visit linkage
      siteVisitId: siteVisit.id,
      sourceVisitDate: siteVisit.siteInTime,
      sourceVisitPurpose: siteVisit.visitPurpose,

      // Project configuration
      projectType: baseDraft.projectType!,
      systemCapacity: baseDraft.systemCapacity!,
      projectTitle: baseDraft.projectTitle!,
      quotationNumber,
      systemConfiguration: baseDraft.systemConfiguration!,

      // Technical requirements
      technicalRequirements,
      installationScope: baseDraft.installationScope,

      // Financial information
      pricing,

      // Generated components
      billOfMaterials: bomItems,
      warranties: baseDraft.warranties || this.generateStandardWarranties(baseDraft.projectType!),

      // Terms and conditions
      deliveryPeriod: baseDraft.deliveryPeriod || "2-3 Weeks from order confirmation",
      validityPeriod: baseDraft.validityPeriod || "30 days",
      paymentTerms: baseDraft.paymentTerms || [
        "90% Advance Along with Purchase Order",
        "10% After completion of work"
      ],

      // Completion tracking
      dataCompleteness,
      missingFields: [],
      needsReview: dataCompleteness < 0.8,

      // Status and workflow
      status: "draft",
      projectStatus: "not_started",

      // Internal tracking
      internalNotes: this.generateInternalNotes(siteVisit, pricing),
      competitorAnalysis: baseDraft.competitorAnalysis,
      followUpSchedule: [],

      // User tracking
      createdBy: baseDraft.createdBy || siteVisit.userId,
      assignedTo: baseDraft.assignedTo,
      approvedBy: baseDraft.approvedBy,
      approvedAt: baseDraft.approvedAt
    };

    return finalDraft;
  }

  /**
   * Generate unique quotation number
   */
  private static generateQuotationNumber(siteVisit: SiteVisit, projectType: QuotationProjectType): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const projectCode = {
      'on_grid': 'OG',
      'off_grid': 'OF',
      'hybrid': 'HY',
      'water_heater': 'WH',
      'water_pump': 'WP'
    }[projectType];

    // Use customer name initials and visit ID for uniqueness
    const customerInitials = siteVisit.customer.name
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .slice(0, 3);

    const visitIdSuffix = siteVisit.id.slice(-4).toUpperCase();

    return `PGE-${projectCode}-${year}${month}${day}-${customerInitials}-${visitIdSuffix}`;
  }

  /**
   * Generate standard warranties for project type
   */
  private static generateStandardWarranties(projectType: QuotationProjectType): Warranty[] {
    const warranties: Warranty[] = [
      {
        component: "Solar Panels",
        manufacturingWarranty: "25 years manufacturing defects",
        serviceWarranty: "1 year free service",
        performanceWarranty: "25 years performance warranty - 80% power output"
      },
      {
        component: "Inverter",
        manufacturingWarranty: "5 years manufacturing defects",
        serviceWarranty: "2 years free service"
      },
      {
        component: "Structure",
        manufacturingWarranty: "10 years rust protection",
        serviceWarranty: "1 year free service"
      },
      {
        component: "Installation",
        manufacturingWarranty: "1 year workmanship warranty",
        serviceWarranty: "1 year free service and repair"
      }
    ];

    // Add project-specific warranties
    if (projectType === "off_grid" || projectType === "hybrid") {
      warranties.push({
        component: "Battery",
        manufacturingWarranty: "3 years manufacturing defects",
        serviceWarranty: "1 year free service"
      });
    }

    if (projectType === "water_heater") {
      warranties.push({
        component: "Water Heater",
        manufacturingWarranty: "5 years manufacturing defects",
        serviceWarranty: "2 years free service"
      });
    }

    if (projectType === "water_pump") {
      warranties.push({
        component: "Water Pump",
        manufacturingWarranty: "2 years manufacturing defects",
        serviceWarranty: "1 year free service"
      });
    }

    return warranties;
  }

  /**
   * Generate internal notes for quotation tracking
   */
  private static generateInternalNotes(siteVisit: SiteVisit, pricing: Pricing): string {
    const notes: string[] = [];
    
    notes.push(`Generated from Site Visit ID: ${siteVisit.id}`);
    notes.push(`Visit Date: ${siteVisit.siteInTime.toLocaleDateString()}`);
    notes.push(`Visit Purpose: ${siteVisit.visitPurpose}`);
    notes.push(`System Value: ₹${pricing.customerPayment.toLocaleString()}`);
    
    if (siteVisit.technicalData?.workType) {
      notes.push(`Work Type: ${siteVisit.technicalData.workType}`);
    }
    
    if (siteVisit.technicalData?.description) {
      notes.push(`Technical Notes: ${siteVisit.technicalData.description}`);
    }

    // Add profitability analysis
    if (pricing.marginPercentage && pricing.marginPercentage > 0) {
      notes.push(`Profit Margin: ${pricing.marginPercentage}%`);
    }

    return notes.join('\n');
  }

  /**
   * Add competitive analysis to quotation
   */
  private static async addCompetitiveAnalysis(
    quotationDraft: InsertQuotationDraft,
    pricingResult: any
  ): Promise<void> {
    const analysisNotes: string[] = [];
    
    // Basic competitive positioning
    const effectiveRate = pricingResult.calculations.effectiveRate;
    const marketRange = this.getMarketPriceRange(quotationDraft.projectType!);
    
    if (effectiveRate < marketRange.low) {
      analysisNotes.push("Price positioned below market average - highly competitive");
    } else if (effectiveRate > marketRange.high) {
      analysisNotes.push("Price positioned above market average - premium positioning");
    } else {
      analysisNotes.push("Price positioned within market range - competitive");
    }

    // Value proposition analysis
    if (pricingResult.subsidyInfo.isEligible) {
      analysisNotes.push("Subsidy eligible - strong value proposition");
    }

    if (pricingResult.calculations.marginPercentage > 20) {
      analysisNotes.push("Healthy profit margin maintained");
    }

    quotationDraft.competitorAnalysis = analysisNotes.join('. ');
  }

  /**
   * Get market price range for competitive analysis
   */
  private static getMarketPriceRange(projectType: QuotationProjectType): { low: number; high: number } {
    const ranges = {
      'on_grid': { low: 55000, high: 75000 },
      'off_grid': { low: 75000, high: 95000 },
      'hybrid': { low: 85000, high: 105000 },
      'water_heater': { low: 60, high: 100 },
      'water_pump': { low: 20000, high: 30000 }
    };

    return ranges[projectType] || { low: 50000, high: 80000 };
  }

  /**
   * Generate quotation from specific site visit project type
   */
  static async generateProjectSpecificQuotation(
    siteVisit: SiteVisit,
    projectType: QuotationProjectType,
    overrides: Partial<InsertQuotationDraft> = {}
  ): Promise<QuotationGenerationResult> {
    
    const options: QuotationGenerationOptions = {
      forceProjectType: projectType,
      includeCompetitiveAnalysis: true
    };

    const result = await this.generateQuotation(siteVisit, options);
    
    // Apply any overrides
    if (Object.keys(overrides).length > 0) {
      Object.assign(result.quotationDraft, overrides);
      
      // Recalculate pricing if significant overrides
      if (overrides.systemConfiguration || overrides.billOfMaterials) {
        const newPricingResult = PrecisePricingEngine.calculateDetailedPricing(result.quotationDraft);
        result.quotationDraft.pricing = newPricingResult.pricing;
        result.pricingBreakdown = newPricingResult;
      }
    }

    return result;
  }

  /**
   * Quick quotation estimate for immediate pricing
   */
  static generateQuickEstimate(
    siteVisit: SiteVisit,
    projectType: QuotationProjectType,
    systemCapacity: number
  ): {
    estimatedPrice: number;
    subsidyAmount: number;
    finalPrice: number;
    monthlyEMI: number;
    quotationId: string;
  } {
    const estimate = PrecisePricingEngine.calculateQuickEstimate(projectType, systemCapacity);
    
    return {
      estimatedPrice: estimate.basePrice,
      subsidyAmount: estimate.subsidyAmount,
      finalPrice: estimate.finalPrice,
      monthlyEMI: estimate.monthlyEMI,
      quotationId: this.generateQuotationNumber(siteVisit, projectType)
    };
  }

  /**
   * Validate site visit readiness for quotation generation
   */
  static validateSiteVisitForQuotation(siteVisit: SiteVisit): {
    isReady: boolean;
    completenessScore: number;
    blockers: string[];
    recommendations: string[];
  } {
    const blockers: string[] = [];
    const recommendations: string[] = [];

    // Check essential customer information
    if (!siteVisit.customer.name) blockers.push("Customer name is required");
    if (!siteVisit.customer.mobile) blockers.push("Customer mobile is required");
    if (!siteVisit.customer.address) blockers.push("Customer address is required");

    // Check marketing data
    if (!siteVisit.marketingData) {
      blockers.push("Marketing data is required for quotation generation");
    } else {
      const hasAnyConfig = !!(
        siteVisit.marketingData.onGridConfig ||
        siteVisit.marketingData.offGridConfig ||
        siteVisit.marketingData.hybridConfig ||
        siteVisit.marketingData.waterHeaterConfig ||
        siteVisit.marketingData.waterPumpConfig
      );

      if (!hasAnyConfig) {
        blockers.push("At least one project configuration is required");
      }
    }

    // Generate recommendations
    if (!siteVisit.customer.email) {
      recommendations.push("Add customer email for better communication");
    }

    if (!siteVisit.customer.ebServiceNumber && siteVisit.marketingData?.onGridConfig) {
      recommendations.push("EB service number recommended for on-grid systems");
    }

    // Calculate completeness score
    const analysis = SiteVisitDataAnalyzer.analyzeSiteVisitData(siteVisit);
    const completenessScore = analysis.overallCompleteness;

    return {
      isReady: blockers.length === 0 && completenessScore >= 0.3,
      completenessScore,
      blockers,
      recommendations
    };
  }
}