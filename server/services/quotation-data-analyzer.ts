/**
 * Quotation Data Completeness Analyzer
 * Specialized analyzer for Site Visit → Quotation workflow integration
 * Focuses on quotation-specific data requirements, pricing analysis, and workflow readiness
 */

import {
  type SiteVisit,
  type OnGridConfig,
  type OffGridConfig, 
  type HybridConfig,
  type WaterHeaterConfig,
  type WaterPumpConfig,
  type QuotationProjectType,
  type QuotationProjectConfig,
  type PricingInput,
  type PricingBreakdown,
  type SubsidyInfo,
  type DataCompletenessReport,
  type ProjectAnalysis,
  type BOMItem
} from "@shared/schema";

interface QuotationAnalysisSection {
  sectionName: string;
  completeness: number;
  missingFields: string[];
  criticalMissing: string[];
  weight: number;
  blockers: string[];
}

interface QuotationReadinessReport extends DataCompletenessReport {
  quotationReadiness: {
    canCreateDraft: boolean;
    canGeneratePricing: boolean;
    canCalculateSubsidy: boolean;
    canGenerateBOM: boolean;
    blockers: string[];
  };
  pricingAnalysis: {
    estimatedCost: number;
    confidenceLevel: number;
    missingCostComponents: string[];
  };
  subsidiaryEligibility: {
    isEligible: boolean;
    estimatedSubsidy: number;
    missingDocuments: string[];
  };
}

export class QuotationDataAnalyzer {
  /**
   * Comprehensive quotation workflow readiness analysis
   */
  static analyzeQuotationReadiness(siteVisit: SiteVisit): QuotationReadinessReport {
    // Start with basic data completeness analysis
    const baseReport = this.analyzeBasicCompleteness(siteVisit);
    
    // Analyze quotation-specific requirements
    const pricingAnalysis = this.analyzePricingDataCompleteness(siteVisit);
    const bomAnalysis = this.analyzeBOMDataCompleteness(siteVisit);
    const subsidyAnalysis = this.analyzeSubsidyEligibility(siteVisit);
    const workflowAnalysis = this.analyzeWorkflowReadiness(siteVisit);

    // Calculate quotation readiness metrics
    const quotationReadiness = this.calculateQuotationReadiness([
      pricingAnalysis,
      bomAnalysis,
      subsidyAnalysis,
      workflowAnalysis
    ]);

    // Enhanced pricing analysis
    const pricingDetails = this.calculatePricingAnalysis(siteVisit);
    const subsidyDetails = this.calculateSubsidyEligibility(siteVisit);

    return {
      ...baseReport,
      quotationReadiness,
      pricingAnalysis: pricingDetails,
      subsidiaryEligibility: subsidyDetails
    };
  }

  /**
   * Analyze basic data completeness for quotation requirements
   */
  private static analyzeBasicCompleteness(siteVisit: SiteVisit): DataCompletenessReport {
    const report: DataCompletenessReport = {
      projectTypes: [],
      overallCompleteness: 0
    };

    if (!siteVisit.marketingData) {
      return report;
    }

    const projectTypes = this.getProjectTypes(siteVisit.marketingData);
    
    for (const projectType of projectTypes) {
      const config = this.getProjectConfig(siteVisit.marketingData, projectType);
      const analysis = this.analyzeProjectQuotationReadiness(projectType, config, siteVisit);
      
      report.projectTypes.push({
        type: projectType,
        completeness: analysis.completeness,
        missingFields: analysis.missingFields,
        criticalMissing: analysis.criticalMissing,
        canGenerateQuotation: analysis.criticalMissing.length === 0
      });
    }

    // Calculate overall completeness
    if (report.projectTypes.length > 0) {
      report.overallCompleteness = report.projectTypes.reduce(
        (sum, project) => sum + project.completeness, 
        0
      ) / report.projectTypes.length;
    }

    return report;
  }

  /**
   * Analyze pricing data completeness for cost calculations
   */
  private static analyzePricingDataCompleteness(siteVisit: SiteVisit): QuotationAnalysisSection {
    if (!siteVisit.marketingData) {
      return {
        sectionName: 'Pricing Data',
        completeness: 0,
        missingFields: ['Marketing Configuration'],
        criticalMissing: ['Marketing Configuration'],
        weight: 0.4,
        blockers: ['No marketing data available']
      };
    }

    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    const blockers: string[] = [];
    let completeness = 0;

    // Check for project value in any configuration
    let hasProjectValue = false;
    const configs = [
      siteVisit.marketingData.onGridConfig,
      siteVisit.marketingData.offGridConfig,
      siteVisit.marketingData.hybridConfig,
      siteVisit.marketingData.waterHeaterConfig,
      siteVisit.marketingData.waterPumpConfig
    ].filter(Boolean);

    for (const config of configs) {
      if (config && 'projectValue' in config && config.projectValue && config.projectValue > 0) {
        hasProjectValue = true;
        break;
      }
    }

    if (!hasProjectValue) {
      missingFields.push('Project Value');
      criticalMissing.push('Project Value');
      blockers.push('No project value specified in any configuration');
    }

    // Check for system capacity/specifications
    let hasCapacityInfo = false;
    for (const config of configs) {
      if (config) {
        if (('panelCount' in config && config.panelCount) || 
            ('panelWatts' in config && config.panelWatts) ||
            ('inverterWatts' in config && config.inverterWatts) ||
            ('litre' in config && config.litre) ||
            ('hp' in config && config.hp)) {
          hasCapacityInfo = true;
          break;
        }
      }
    }

    if (!hasCapacityInfo) {
      missingFields.push('System Capacity Information');
      criticalMissing.push('System Capacity Information');
      blockers.push('No system capacity specifications found');
    }

    // Calculate completeness based on available data
    const totalChecks = 2; // Project value + capacity info
    const passedChecks = (hasProjectValue ? 1 : 0) + (hasCapacityInfo ? 1 : 0);
    completeness = passedChecks / totalChecks;

    return {
      sectionName: 'Pricing Data',
      completeness,
      missingFields,
      criticalMissing,
      weight: 0.4,
      blockers
    };
  }

  /**
   * Analyze BOM (Bill of Materials) data completeness
   */
  private static analyzeBOMDataCompleteness(siteVisit: SiteVisit): QuotationAnalysisSection {
    if (!siteVisit.marketingData) {
      return {
        sectionName: 'BOM Data',
        completeness: 0,
        missingFields: ['Marketing Configuration'],
        criticalMissing: ['Marketing Configuration'],
        weight: 0.3,
        blockers: ['No marketing data for BOM generation']
      };
    }

    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    const blockers: string[] = [];
    let completeness = 0;

    const configs = [
      { type: 'on_grid', config: siteVisit.marketingData.onGridConfig },
      { type: 'off_grid', config: siteVisit.marketingData.offGridConfig },
      { type: 'hybrid', config: siteVisit.marketingData.hybridConfig },
      { type: 'water_heater', config: siteVisit.marketingData.waterHeaterConfig },
      { type: 'water_pump', config: siteVisit.marketingData.waterPumpConfig }
    ].filter(item => item.config);

    if (configs.length === 0) {
      return {
        sectionName: 'BOM Data',
        completeness: 0,
        missingFields: ['Project Configuration'],
        criticalMissing: ['Project Configuration'],
        weight: 0.3,
        blockers: ['No project configurations found']
      };
    }

    let totalFields = 0;
    let filledFields = 0;

    for (const { type, config } of configs) {
      const bomFields = this.getBOMRequiredFields(type as QuotationProjectType);
      
      for (const field of bomFields) {
        totalFields++;
        if (config && field in config && this.isFieldFilled(config[field as keyof typeof config])) {
          filledFields++;
        } else {
          missingFields.push(`${type}: ${this.getFieldDisplayName(field)}`);
          if (this.isCriticalBOMField(field)) {
            criticalMissing.push(`${type}: ${this.getFieldDisplayName(field)}`);
          }
        }
      }
    }

    completeness = totalFields > 0 ? filledFields / totalFields : 0;

    if (criticalMissing.length > 0) {
      blockers.push('Critical BOM specifications missing');
    }

    return {
      sectionName: 'BOM Data',
      completeness,
      missingFields,
      criticalMissing,
      weight: 0.3,
      blockers
    };
  }

  /**
   * Analyze subsidy eligibility and documentation
   */
  private static analyzeSubsidyEligibility(siteVisit: SiteVisit): QuotationAnalysisSection {
    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    const blockers: string[] = [];
    let completeness = 0.7; // Base score for having customer data

    // Check customer information required for subsidy
    if (!siteVisit.customer.ebServiceNumber) {
      missingFields.push('EB Service Number');
      criticalMissing.push('EB Service Number');
      completeness -= 0.3;
    }

    if (!siteVisit.customer.propertyType) {
      missingFields.push('Property Type');
      completeness -= 0.2;
    }

    if (!siteVisit.customer.address || siteVisit.customer.address.length < 10) {
      missingFields.push('Complete Address');
      criticalMissing.push('Complete Address');
      completeness -= 0.2;
    }

    // Check for system specifications (required for subsidy calculation)
    if (siteVisit.marketingData) {
      const hasSystemSpecs = this.hasSystemSpecifications(siteVisit.marketingData);
      if (!hasSystemSpecs) {
        missingFields.push('System Capacity Specifications');
        criticalMissing.push('System Capacity Specifications');
        completeness -= 0.3;
      }
    } else {
      missingFields.push('Marketing Configuration');
      criticalMissing.push('Marketing Configuration');
      completeness -= 0.5;
    }

    if (criticalMissing.length > 0) {
      blockers.push('Critical subsidy documentation missing');
    }

    return {
      sectionName: 'Subsidy Eligibility',
      completeness: Math.max(0, completeness),
      missingFields,
      criticalMissing,
      weight: 0.2,
      blockers
    };
  }

  /**
   * Analyze workflow readiness for quotation generation
   */
  private static analyzeWorkflowReadiness(siteVisit: SiteVisit): QuotationAnalysisSection {
    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    const blockers: string[] = [];
    let completeness = 1.0;

    // Check if site visit is completed
    if (siteVisit.status !== 'completed') {
      missingFields.push('Site Visit Completion');
      criticalMissing.push('Site Visit Completion');
      blockers.push('Site visit must be completed before generating quotation');
      completeness -= 0.4;
    }

    // Check for visit outcome
    if (!siteVisit.visitOutcome) {
      missingFields.push('Visit Outcome');
      completeness -= 0.2;
    } else if (siteVisit.visitOutcome === 'cancelled') {
      blockers.push('Visit outcome is cancelled - quotation not applicable');
      completeness = 0;
    }

    // Check for customer contact verification
    if (!siteVisit.customer.mobile || siteVisit.customer.mobile.length < 10) {
      missingFields.push('Valid Customer Mobile');
      criticalMissing.push('Valid Customer Mobile');
      completeness -= 0.2;
    }

    // Check for site photos (helpful for quotation validation)
    if (!siteVisit.sitePhotos || siteVisit.sitePhotos.length === 0) {
      missingFields.push('Site Photos');
      completeness -= 0.1;
    }

    return {
      sectionName: 'Workflow Readiness',
      completeness: Math.max(0, completeness),
      missingFields,
      criticalMissing,
      weight: 0.1,
      blockers
    };
  }

  /**
   * Calculate overall quotation readiness
   */
  private static calculateQuotationReadiness(sections: QuotationAnalysisSection[]) {
    const allBlockers = sections.flatMap(section => section.blockers);
    const allCriticalMissing = sections.flatMap(section => section.criticalMissing);

    return {
      canCreateDraft: allCriticalMissing.length === 0,
      canGeneratePricing: !allBlockers.some(b => b.includes('pricing') || b.includes('value')),
      canCalculateSubsidy: !allBlockers.some(b => b.includes('subsidy')),
      canGenerateBOM: !allBlockers.some(b => b.includes('BOM')),
      blockers: allBlockers
    };
  }

  /**
   * Calculate detailed pricing analysis
   */
  private static calculatePricingAnalysis(siteVisit: SiteVisit) {
    let estimatedCost = 0;
    let confidenceLevel = 0;
    const missingCostComponents: string[] = [];

    if (siteVisit.marketingData) {
      const configs = [
        siteVisit.marketingData.onGridConfig,
        siteVisit.marketingData.offGridConfig,
        siteVisit.marketingData.hybridConfig,
        siteVisit.marketingData.waterHeaterConfig,
        siteVisit.marketingData.waterPumpConfig
      ].filter(Boolean);

      for (const config of configs) {
        if (config && 'projectValue' in config && config.projectValue) {
          estimatedCost = config.projectValue as number;
          confidenceLevel = 0.8; // High confidence if project value is specified
          break;
        }
      }

      if (estimatedCost === 0) {
        // Try to estimate based on system capacity
        estimatedCost = this.estimateCostFromCapacity(configs[0]);
        confidenceLevel = 0.4; // Lower confidence for estimates
        missingCostComponents.push('Project Value');
      }
    }

    return {
      estimatedCost,
      confidenceLevel,
      missingCostComponents
    };
  }

  /**
   * Calculate subsidy eligibility details
   */
  private static calculateSubsidyEligibility(siteVisit: SiteVisit) {
    let isEligible = false;
    let estimatedSubsidy = 0;
    const missingDocuments: string[] = [];

    // Basic eligibility check
    if (siteVisit.customer.ebServiceNumber && 
        siteVisit.customer.propertyType === 'residential' &&
        siteVisit.marketingData) {
      
      isEligible = true;
      
      // Estimate subsidy based on system capacity (typical rates)
      const systemCapacity = this.getSystemCapacity(siteVisit.marketingData);
      if (systemCapacity > 0) {
        // Typical subsidy rates (these should be configurable)
        const subsidyPerKW = systemCapacity <= 3 ? 14588 : (systemCapacity <= 10 ? 14588 : 0);
        estimatedSubsidy = Math.min(systemCapacity * subsidyPerKW, systemCapacity <= 3 ? 43764 : 146880);
      }
    }

    if (!siteVisit.customer.ebServiceNumber) {
      missingDocuments.push('EB Service Number');
    }
    if (siteVisit.customer.propertyType !== 'residential') {
      missingDocuments.push('Residential Property Verification');
    }

    return {
      isEligible,
      estimatedSubsidy,
      missingDocuments
    };
  }

  // Helper methods
  private static getProjectTypes(marketingData: any): QuotationProjectType[] {
    const types: QuotationProjectType[] = [];
    
    if (marketingData.projectType) {
      types.push(marketingData.projectType);
    }
    
    // Fallback to config-based detection
    if (types.length === 0) {
      if (marketingData.onGridConfig) types.push('on_grid');
      if (marketingData.offGridConfig) types.push('off_grid');
      if (marketingData.hybridConfig) types.push('hybrid');
      if (marketingData.waterHeaterConfig) types.push('water_heater');
      if (marketingData.waterPumpConfig) types.push('water_pump');
    }
    
    return types;
  }

  private static getProjectConfig(marketingData: any, projectType: QuotationProjectType): any {
    switch (projectType) {
      case 'on_grid': return marketingData.onGridConfig;
      case 'off_grid': return marketingData.offGridConfig;
      case 'hybrid': return marketingData.hybridConfig;
      case 'water_heater': return marketingData.waterHeaterConfig;
      case 'water_pump': return marketingData.waterPumpConfig;
      default: return null;
    }
  }

  private static analyzeProjectQuotationReadiness(
    projectType: QuotationProjectType,
    config: any,
    siteVisit: SiteVisit
  ) {
    if (!config) {
      return {
        completeness: 0,
        missingFields: [`${projectType} configuration`],
        criticalMissing: [`${projectType} configuration`]
      };
    }

    const requiredFields = this.getRequiredFieldsForQuotation(projectType);
    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    let filledFields = 0;

    for (const field of requiredFields) {
      if (this.isFieldFilled(config[field])) {
        filledFields++;
      } else {
        const displayName = this.getFieldDisplayName(field);
        missingFields.push(displayName);
        if (this.isCriticalForQuotation(field)) {
          criticalMissing.push(displayName);
        }
      }
    }

    const completeness = requiredFields.length > 0 ? filledFields / requiredFields.length : 0;

    return {
      completeness,
      missingFields,
      criticalMissing
    };
  }

  private static getRequiredFieldsForQuotation(projectType: QuotationProjectType): string[] {
    switch (projectType) {
      case 'on_grid':
        return ['panelCount', 'panelWatts', 'inverterWatts', 'solarPanelMake', 'inverterMake', 'projectValue'];
      case 'off_grid':
        return ['panelCount', 'panelWatts', 'inverterWatts', 'batteryCount', 'batteryAH', 'batteryBrand', 'projectValue'];
      case 'hybrid':
        return ['panelCount', 'panelWatts', 'inverterWatts', 'batteryCount', 'batteryAH', 'batteryBrand', 'projectValue'];
      case 'water_heater':
        return ['brand', 'litre', 'projectValue'];
      case 'water_pump':
        return ['hp', 'drive', 'panelCount', 'projectValue'];
      default:
        return [];
    }
  }

  private static getBOMRequiredFields(projectType: QuotationProjectType): string[] {
    switch (projectType) {
      case 'on_grid':
        return ['solarPanelMake', 'panelWatts', 'panelCount', 'inverterMake', 'inverterWatts', 'structureHeight'];
      case 'off_grid':
      case 'hybrid':
        return ['solarPanelMake', 'panelWatts', 'panelCount', 'inverterMake', 'inverterWatts', 'batteryBrand', 'batteryAH', 'batteryCount'];
      case 'water_heater':
        return ['brand', 'litre'];
      case 'water_pump':
        return ['hp', 'drive', 'panelBrand', 'panelCount'];
      default:
        return [];
    }
  }

  private static isCriticalForQuotation(field: string): boolean {
    const criticalFields = ['projectValue', 'panelCount', 'panelWatts', 'inverterWatts', 'litre', 'hp', 'batteryCount'];
    return criticalFields.includes(field);
  }

  private static isCriticalBOMField(field: string): boolean {
    const criticalBOMFields = ['solarPanelMake', 'inverterMake', 'batteryBrand', 'brand'];
    return criticalBOMFields.includes(field);
  }

  private static hasSystemSpecifications(marketingData: any): boolean {
    const configs = [
      marketingData.onGridConfig,
      marketingData.offGridConfig,
      marketingData.hybridConfig,
      marketingData.waterHeaterConfig,
      marketingData.waterPumpConfig
    ].filter(Boolean);

    for (const config of configs) {
      if (config) {
        if (('panelCount' in config && config.panelCount) ||
            ('panelWatts' in config && config.panelWatts) ||
            ('litre' in config && config.litre) ||
            ('hp' in config && config.hp)) {
          return true;
        }
      }
    }
    return false;
  }

  private static getSystemCapacity(marketingData: any): number {
    const configs = [
      marketingData.onGridConfig,
      marketingData.offGridConfig,
      marketingData.hybridConfig
    ].filter(Boolean);

    for (const config of configs) {
      if (config && config.panelCount && config.panelWatts) {
        const panelWattsNum = parseInt(config.panelWatts.toString());
        return (config.panelCount * panelWattsNum) / 1000; // Convert to kW
      }
    }
    return 0;
  }

  private static estimateCostFromCapacity(config: any): number {
    if (!config) return 0;

    // Basic cost estimation logic (should be configurable)
    if ('panelCount' in config && 'panelWatts' in config && config.panelCount && config.panelWatts) {
      const capacityKW = (config.panelCount * parseInt(config.panelWatts.toString())) / 1000;
      return capacityKW * 50000; // ₹50,000 per kW estimate
    }
    
    if ('litre' in config && config.litre) {
      return config.litre * 150; // ₹150 per litre for water heater
    }
    
    if ('hp' in config && config.hp) {
      const hpNum = parseFloat(config.hp.toString());
      return hpNum * 25000; // ₹25,000 per HP for water pump
    }

    return 0;
  }

  private static isFieldFilled(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return value > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return true;
    return false;
  }

  private static getFieldDisplayName(field: string): string {
    const displayNames: Record<string, string> = {
      panelCount: 'Panel Count',
      panelWatts: 'Panel Watts',
      inverterWatts: 'Inverter Watts',
      solarPanelMake: 'Solar Panel Brand',
      inverterMake: 'Inverter Brand',
      batteryBrand: 'Battery Brand',
      batteryAH: 'Battery AH',
      batteryCount: 'Battery Count',
      projectValue: 'Project Value',
      brand: 'Brand',
      litre: 'Capacity (Litres)',
      hp: 'HP Rating',
      drive: 'Drive Type',
      structureHeight: 'Structure Height'
    };
    return displayNames[field] || field.charAt(0).toUpperCase() + field.slice(1);
  }
}