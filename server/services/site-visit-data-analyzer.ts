/**
 * Site Visit Data Analyzer
 * Comprehensive analysis of site visit data completeness for quotation generation
 * Covers customer data, technical requirements, admin processes, and project configurations
 */

import {
  type SiteVisit,
  type OnGridConfig,
  type OffGridConfig,
  type HybridConfig,
  type WaterHeaterConfig,
  type WaterPumpConfig,
  type DataCompletenessReport,
  type ProjectAnalysis,
  type MarketingProjectType
} from "@shared/schema";

interface SectionAnalysis {
  sectionName: string;
  completeness: number;
  missingFields: string[];
  criticalMissing: string[];
  weight: number; // Importance weight for overall calculation
}

export class SiteVisitDataAnalyzer {
  /**
   * Comprehensive analysis of site visit data for quotation generation
   */
  static analyzeCompleteness(siteVisit: SiteVisit): DataCompletenessReport {
    const report: DataCompletenessReport = {
      projectTypes: [],
      overallCompleteness: 0
    };

    // First analyze foundational data sections
    const customerAnalysis = this.analyzeCustomerDataCompleteness(siteVisit);
    const siteVisitAnalysis = this.analyzeSiteVisitDataCompleteness(siteVisit);
    const technicalAnalysis = this.analyzeTechnicalDataCompleteness(siteVisit);
    const adminAnalysis = this.analyzeAdminDataCompleteness(siteVisit);

    // Calculate base completeness from foundational sections
    const foundationalSections = [customerAnalysis, siteVisitAnalysis, technicalAnalysis, adminAnalysis];
    const foundationalCompleteness = this.calculateWeightedCompleteness(foundationalSections);

    // If no marketing data exists, we can't generate quotations but we can report foundational completeness
    if (!siteVisit.marketingData) {
      report.overallCompleteness = foundationalCompleteness * 0.4; // Only foundational data available
      return report;
    }

    // Get all declared project types from marketing data
    const declaredProjectTypes = this.getDeclaredProjectTypes(siteVisit.marketingData);
    
    // If no project types are declared but marketing data exists, check for any config objects
    if (declaredProjectTypes.length === 0) {
      const configBasedTypes = this.getProjectTypesFromConfigs(siteVisit.marketingData);
      declaredProjectTypes.push(...configBasedTypes);
    }

    // Analyze each declared project type (whether config exists or not)
    for (const projectType of declaredProjectTypes) {
      const config = this.getProjectConfig(siteVisit.marketingData, projectType);
      const projectAnalysis = this.analyzeProjectCompleteness(
        projectType, 
        config, // May be null/undefined for missing configs
        foundationalSections
      );
      
      report.projectTypes.push({
        type: projectType,
        completeness: projectAnalysis.completeness,
        missingFields: projectAnalysis.missingFields,
        criticalMissing: projectAnalysis.criticalMissing,
        canGenerateQuotation: projectAnalysis.criticalMissing.length === 0
      });
    }

    // Calculate overall completeness including project-specific data
    if (report.projectTypes.length > 0) {
      const projectCompleteness = report.projectTypes.reduce(
        (sum, project) => sum + project.completeness, 
        0
      ) / report.projectTypes.length;
      
      // Combine foundational (40%) + project-specific (60%) completeness
      report.overallCompleteness = foundationalCompleteness * 0.4 + projectCompleteness * 0.6;
    } else {
      // Only foundational data available
      report.overallCompleteness = foundationalCompleteness * 0.4;
    }

    return report;
  }

  /**
   * Analyze customer data completeness for quotation generation
   */
  private static analyzeCustomerDataCompleteness(siteVisit: SiteVisit): SectionAnalysis {
    const requiredFields = ['name', 'mobile', 'address'];
    const optionalFields = ['ebServiceNumber', 'propertyType', 'location'];
    
    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    let filledRequired = 0;
    let filledOptional = 0;

    // Check required customer fields
    requiredFields.forEach(field => {
      const fieldValue = siteVisit.customer[field as keyof typeof siteVisit.customer];
      if (this.isFieldFilled(fieldValue)) {
        filledRequired++;
      } else {
        const displayName = this.getFieldDisplayName(field);
        missingFields.push(displayName);
        criticalMissing.push(displayName);
      }
    });

    // Check optional customer fields
    optionalFields.forEach(field => {
      const fieldValue = siteVisit.customer[field as keyof typeof siteVisit.customer];
      if (this.isFieldFilled(fieldValue)) {
        filledOptional++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
      }
    });

    const completeness = (filledRequired / requiredFields.length) * 0.8 + 
                        (filledOptional / optionalFields.length) * 0.2;

    return {
      sectionName: 'Customer Data',
      completeness,
      missingFields,
      criticalMissing,
      weight: 0.3 // High importance for quotation generation
    };
  }

  /**
   * Analyze site visit data completeness (location, photos, timing)
   */
  private static analyzeSiteVisitDataCompleteness(siteVisit: SiteVisit): SectionAnalysis {
    const requiredFields = ['siteInTime', 'siteInLocation', 'status'];
    const optionalFields = ['siteInPhotoUrl', 'siteOutTime', 'siteOutLocation', 'siteOutPhotoUrl', 'notes'];
    
    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    let filledRequired = 0;
    let filledOptional = 0;

    // Check required site visit fields
    requiredFields.forEach(field => {
      const fieldValue = siteVisit[field as keyof SiteVisit];
      if (this.isFieldFilled(fieldValue)) {
        filledRequired++;
      } else {
        const displayName = this.getFieldDisplayName(field);
        missingFields.push(displayName);
        criticalMissing.push(displayName);
      }
    });

    // Check optional site visit fields
    optionalFields.forEach(field => {
      const fieldValue = siteVisit[field as keyof SiteVisit];
      if (this.isFieldFilled(fieldValue)) {
        filledOptional++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
      }
    });

    const completeness = (filledRequired / requiredFields.length) * 0.7 + 
                        (filledOptional / optionalFields.length) * 0.3;

    return {
      sectionName: 'Site Visit Data',
      completeness,
      missingFields,
      criticalMissing,
      weight: 0.2 // Moderate importance
    };
  }

  /**
   * Analyze technical data completeness
   */
  private static analyzeTechnicalDataCompleteness(siteVisit: SiteVisit): SectionAnalysis {
    if (!siteVisit.technicalData) {
      return {
        sectionName: 'Technical Data',
        completeness: 0,
        missingFields: ['Service Types', 'Work Type', 'Working Status'],
        criticalMissing: ['Service Types', 'Work Type'],
        weight: 0.2
      };
    }

    const requiredFields = ['serviceTypes', 'workType', 'workingStatus'];
    const optionalFields = ['pendingRemarks', 'teamMembers', 'description'];
    
    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    let filledRequired = 0;
    let filledOptional = 0;

    requiredFields.forEach(field => {
      const fieldValue = siteVisit.technicalData![field as keyof typeof siteVisit.technicalData];
      if (this.isFieldFilled(fieldValue)) {
        filledRequired++;
      } else {
        const displayName = this.getFieldDisplayName(field);
        missingFields.push(displayName);
        criticalMissing.push(displayName);
      }
    });

    optionalFields.forEach(field => {
      const fieldValue = siteVisit.technicalData![field as keyof typeof siteVisit.technicalData];
      if (this.isFieldFilled(fieldValue)) {
        filledOptional++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
      }
    });

    const completeness = (filledRequired / requiredFields.length) * 0.8 + 
                        (filledOptional / optionalFields.length) * 0.2;

    return {
      sectionName: 'Technical Data',
      completeness,
      missingFields,
      criticalMissing,
      weight: 0.2
    };
  }

  /**
   * Analyze admin data completeness
   */
  private static analyzeAdminDataCompleteness(siteVisit: SiteVisit): SectionAnalysis {
    if (!siteVisit.adminData) {
      return {
        sectionName: 'Admin Data',
        completeness: 1, // Admin data is optional for quotations
        missingFields: [],
        criticalMissing: [],
        weight: 0.1
      };
    }

    const optionalFields = ['bankProcess', 'ebProcess', 'purchase', 'driving', 'officialCashTransactions', 'officialPersonalWork', 'others'];
    
    const missingFields: string[] = [];
    let filledOptional = 0;

    optionalFields.forEach(field => {
      const fieldValue = siteVisit.adminData![field as keyof typeof siteVisit.adminData];
      if (this.isFieldFilled(fieldValue)) {
        filledOptional++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
      }
    });

    const completeness = optionalFields.length > 0 ? filledOptional / optionalFields.length : 1;

    return {
      sectionName: 'Admin Data',
      completeness,
      missingFields,
      criticalMissing: [], // No critical admin fields for quotation
      weight: 0.1
    };
  }

  /**
   * Get declared project types from marketing data
   */
  private static getDeclaredProjectTypes(marketingData: any): MarketingProjectType[] {
    const projectTypes: MarketingProjectType[] = [];
    
    // Check if projectType is explicitly declared
    if (marketingData.projectType) {
      projectTypes.push(marketingData.projectType);
    }
    
    return projectTypes;
  }

  /**
   * Get project types based on existing config objects
   */
  private static getProjectTypesFromConfigs(marketingData: any): MarketingProjectType[] {
    const projectTypes: MarketingProjectType[] = [];
    
    if (marketingData.onGridConfig) projectTypes.push('on_grid');
    if (marketingData.offGridConfig) projectTypes.push('off_grid');
    if (marketingData.hybridConfig) projectTypes.push('hybrid');
    if (marketingData.waterHeaterConfig) projectTypes.push('water_heater');
    if (marketingData.waterPumpConfig) projectTypes.push('water_pump');
    
    return projectTypes;
  }

  /**
   * Get project configuration for a specific project type
   */
  private static getProjectConfig(marketingData: any, projectType: MarketingProjectType): any {
    switch (projectType) {
      case 'on_grid':
        return marketingData.onGridConfig;
      case 'off_grid':
        return marketingData.offGridConfig;
      case 'hybrid':
        return marketingData.hybridConfig;
      case 'water_heater':
        return marketingData.waterHeaterConfig;
      case 'water_pump':
        return marketingData.waterPumpConfig;
      default:
        return null;
    }
  }

  /**
   * Analyze project-specific completeness combining foundational + project config data
   */
  private static analyzeProjectCompleteness(
    projectType: MarketingProjectType, 
    config: any, 
    foundationalSections: SectionAnalysis[]
  ): {
    completeness: number;
    missingFields: string[];
    criticalMissing: string[];
  } {
    // Get project-specific analysis
    let projectConfigAnalysis: { completeness: number; missingFields: string[]; criticalMissing: string[] };
    
    // If config is missing, return 0% completeness with all fields missing
    if (!config) {
      projectConfigAnalysis = this.getMissingConfigAnalysis(projectType);
    } else {
      switch (projectType) {
        case 'on_grid':
          projectConfigAnalysis = this.analyzeOnGridCompleteness(config);
          break;
        case 'off_grid':
          projectConfigAnalysis = this.analyzeOffGridCompleteness(config);
          break;
        case 'hybrid':
          projectConfigAnalysis = this.analyzeHybridCompleteness(config);
          break;
        case 'water_heater':
          projectConfigAnalysis = this.analyzeWaterHeaterCompleteness(config);
          break;
        case 'water_pump':
          projectConfigAnalysis = this.analyzeWaterPumpCompleteness(config);
          break;
        default:
          projectConfigAnalysis = { completeness: 0, missingFields: ['Unknown project type'], criticalMissing: ['Unknown project type'] };
      }
    }

    // Combine foundational missing fields with project-specific missing fields
    const allMissingFields: string[] = [];
    const allCriticalMissing: string[] = [];

    // Add critical missing from foundational sections
    foundationalSections.forEach(section => {
      allMissingFields.push(...section.missingFields.map(field => `${section.sectionName}: ${field}`));
      allCriticalMissing.push(...section.criticalMissing.map(field => `${section.sectionName}: ${field}`));
    });

    // Add project-specific missing fields
    allMissingFields.push(...projectConfigAnalysis.missingFields.map(field => `Project Config: ${field}`));
    allCriticalMissing.push(...projectConfigAnalysis.criticalMissing.map(field => `Project Config: ${field}`));

    // Calculate combined completeness: foundational (40%) + project config (60%)
    const foundationalCompleteness = this.calculateWeightedCompleteness(foundationalSections);
    const combinedCompleteness = foundationalCompleteness * 0.4 + projectConfigAnalysis.completeness * 0.6;

    return {
      completeness: combinedCompleteness,
      missingFields: allMissingFields,
      criticalMissing: allCriticalMissing
    };
  }

  /**
   * Get analysis for completely missing project configuration
   */
  private static getMissingConfigAnalysis(projectType: MarketingProjectType): {
    completeness: number;
    missingFields: string[];
    criticalMissing: string[];
  } {
    const fieldSets = this.getRequiredFieldsForProjectType(projectType);
    
    return {
      completeness: 0,
      missingFields: [...fieldSets.required, ...fieldSets.optional].map(field => this.getFieldDisplayName(field)),
      criticalMissing: fieldSets.required.map(field => this.getFieldDisplayName(field))
    };
  }

  /**
   * Get required and optional fields for each project type
   */
  private static getRequiredFieldsForProjectType(projectType: MarketingProjectType): {
    required: string[];
    optional: string[];
  } {
    switch (projectType) {
      case 'on_grid':
        return {
          required: ['solarPanelMake', 'panelWatts', 'inverterMake', 'inverterWatts', 'inverterPhase', 'panelCount', 'structureHeight', 'lightningArrest', 'earth', 'projectValue'],
          optional: ['inverterKW', 'inverterQty', 'floor', 'structureType', 'gpStructure', 'monoRail', 'civilWorkScope', 'netMeterScope', 'others']
        };
      case 'off_grid':
        return {
          required: ['solarPanelMake', 'panelWatts', 'inverterMake', 'inverterWatts', 'inverterPhase', 'panelCount', 'structureHeight', 'lightningArrest', 'earth', 'projectValue', 'batteryBrand', 'voltage', 'batteryCount'],
          optional: ['inverterKW', 'inverterQty', 'floor', 'structureType', 'gpStructure', 'monoRail', 'civilWorkScope', 'batteryType', 'batteryAH', 'batteryStands', 'others']
        };
      case 'hybrid':
        return {
          required: ['solarPanelMake', 'panelWatts', 'inverterMake', 'inverterWatts', 'inverterPhase', 'panelCount', 'structureHeight', 'lightningArrest', 'earth', 'projectValue', 'batteryBrand', 'voltage', 'batteryCount'],
          optional: ['inverterKW', 'inverterQty', 'floor', 'structureType', 'gpStructure', 'monoRail', 'civilWorkScope', 'electricalWorkScope', 'netMeterScope', 'batteryType', 'batteryAH', 'batteryStands', 'others']
        };
      case 'water_heater':
        return {
          required: ['brand', 'litre', 'projectValue'],
          optional: ['heatingCoil', 'floor', 'plumbingWorkScope', 'civilWorkScope', 'others']
        };
      case 'water_pump':
        return {
          required: ['hp', 'drive', 'structureHeight', 'panelBrand', 'panelCount', 'projectValue'],
          optional: ['solarPanel', 'structureType', 'gpStructure', 'monoRail', 'plumbingWorkScope', 'civilWorkScope', 'others']
        };
      default:
        return {
          required: ['projectConfiguration'],
          optional: []
        };
    }
  }

  /**
   * Calculate weighted completeness across multiple sections
   */
  private static calculateWeightedCompleteness(sections: SectionAnalysis[]): number {
    const totalWeight = sections.reduce((sum, section) => sum + section.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = sections.reduce((sum, section) => sum + (section.completeness * section.weight), 0);
    return weightedSum / totalWeight;
  }

  /**
   * Analyze On-Grid configuration completeness
   */
  private static analyzeOnGridCompleteness(config: OnGridConfig): {
    completeness: number;
    missingFields: string[];
    criticalMissing: string[];
  } {
    const requiredFields = [
      'solarPanelMake', 'panelWatts', 'inverterMake', 'inverterWatts', 
      'inverterPhase', 'panelCount', 'structureHeight', 'lightningArrest',
      'earth', 'projectValue'
    ];

    const optionalFields = [
      'inverterKW', 'inverterQty', 'floor', 'structureType', 
      'gpStructure', 'monoRail', 'civilWorkScope', 'netMeterScope', 'others'
    ];

    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    let filledRequired = 0;
    let filledOptional = 0;

    // Check required fields
    requiredFields.forEach(field => {
      const fieldValue = config[field as keyof OnGridConfig];
      if (this.isFieldFilled(fieldValue)) {
        filledRequired++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
        criticalMissing.push(this.getFieldDisplayName(field));
      }
    });

    // Check optional fields
    optionalFields.forEach(field => {
      const fieldValue = config[field as keyof OnGridConfig];
      if (this.isFieldFilled(fieldValue)) {
        filledOptional++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
      }
    });

    // Required fields weight 80%, optional fields weight 20%
    const completeness = (filledRequired / requiredFields.length) * 0.8 + 
                        (filledOptional / optionalFields.length) * 0.2;

    return { completeness, missingFields, criticalMissing };
  }

  /**
   * Analyze Off-Grid configuration completeness
   */
  private static analyzeOffGridCompleteness(config: OffGridConfig): {
    completeness: number;
    missingFields: string[];
    criticalMissing: string[];
  } {
    const requiredFields = [
      'solarPanelMake', 'panelWatts', 'inverterMake', 'inverterWatts', 
      'inverterPhase', 'panelCount', 'structureHeight', 'lightningArrest',
      'earth', 'projectValue', 'batteryBrand', 'voltage', 'batteryCount'
    ];

    const optionalFields = [
      'inverterKW', 'inverterQty', 'floor', 'structureType', 
      'gpStructure', 'monoRail', 'civilWorkScope', 'batteryType', 
      'batteryAH', 'batteryStands', 'others'
    ];

    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    let filledRequired = 0;
    let filledOptional = 0;

    // Check required fields
    requiredFields.forEach(field => {
      const fieldValue = config[field as keyof OffGridConfig];
      if (this.isFieldFilled(fieldValue)) {
        filledRequired++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
        criticalMissing.push(this.getFieldDisplayName(field));
      }
    });

    // Check optional fields
    optionalFields.forEach(field => {
      const fieldValue = config[field as keyof OffGridConfig];
      if (this.isFieldFilled(fieldValue)) {
        filledOptional++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
      }
    });

    const completeness = (filledRequired / requiredFields.length) * 0.8 + 
                        (filledOptional / optionalFields.length) * 0.2;

    return { completeness, missingFields, criticalMissing };
  }

  /**
   * Analyze Hybrid configuration completeness
   */
  private static analyzeHybridCompleteness(config: HybridConfig): {
    completeness: number;
    missingFields: string[];
    criticalMissing: string[];
  } {
    const requiredFields = [
      'solarPanelMake', 'panelWatts', 'inverterMake', 'inverterWatts', 
      'inverterPhase', 'panelCount', 'structureHeight', 'lightningArrest',
      'earth', 'projectValue', 'batteryBrand', 'voltage', 'batteryCount'
    ];

    const optionalFields = [
      'inverterKW', 'inverterQty', 'floor', 'structureType', 
      'gpStructure', 'monoRail', 'civilWorkScope', 'electricalWorkScope', 
      'netMeterScope', 'batteryType', 'batteryAH', 'batteryStands', 'others'
    ];

    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    let filledRequired = 0;
    let filledOptional = 0;

    // Check required fields
    requiredFields.forEach(field => {
      const fieldValue = config[field as keyof HybridConfig];
      if (this.isFieldFilled(fieldValue)) {
        filledRequired++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
        criticalMissing.push(this.getFieldDisplayName(field));
      }
    });

    // Check optional fields
    optionalFields.forEach(field => {
      const fieldValue = config[field as keyof HybridConfig];
      if (this.isFieldFilled(fieldValue)) {
        filledOptional++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
      }
    });

    const completeness = (filledRequired / requiredFields.length) * 0.8 + 
                        (filledOptional / optionalFields.length) * 0.2;

    return { completeness, missingFields, criticalMissing };
  }

  /**
   * Analyze Water Heater configuration completeness
   */
  private static analyzeWaterHeaterCompleteness(config: WaterHeaterConfig): {
    completeness: number;
    missingFields: string[];
    criticalMissing: string[];
  } {
    const requiredFields = [
      'brand', 'litre', 'projectValue'
    ];

    const optionalFields = [
      'heatingCoil', 'floor', 'plumbingWorkScope', 'civilWorkScope', 'others'
    ];

    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    let filledRequired = 0;
    let filledOptional = 0;

    // Check required fields
    requiredFields.forEach(field => {
      const fieldValue = config[field as keyof WaterHeaterConfig];
      if (this.isFieldFilled(fieldValue)) {
        filledRequired++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
        criticalMissing.push(this.getFieldDisplayName(field));
      }
    });

    // Check optional fields
    optionalFields.forEach(field => {
      const fieldValue = config[field as keyof WaterHeaterConfig];
      if (this.isFieldFilled(fieldValue)) {
        filledOptional++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
      }
    });

    const completeness = (filledRequired / requiredFields.length) * 0.8 + 
                        (filledOptional / optionalFields.length) * 0.2;

    return { completeness, missingFields, criticalMissing };
  }

  /**
   * Analyze Water Pump configuration completeness
   */
  private static analyzeWaterPumpCompleteness(config: WaterPumpConfig): {
    completeness: number;
    missingFields: string[];
    criticalMissing: string[];
  } {
    const requiredFields = [
      'hp', 'drive', 'structureHeight', 'panelBrand', 'panelCount', 'projectValue'
    ];

    const optionalFields = [
      'solarPanel', 'structureType', 'gpStructure', 'monoRail', 
      'plumbingWorkScope', 'civilWorkScope', 'others'
    ];

    const missingFields: string[] = [];
    const criticalMissing: string[] = [];
    let filledRequired = 0;
    let filledOptional = 0;

    // Check required fields
    requiredFields.forEach(field => {
      const fieldValue = config[field as keyof WaterPumpConfig];
      if (this.isFieldFilled(fieldValue)) {
        filledRequired++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
        criticalMissing.push(this.getFieldDisplayName(field));
      }
    });

    // Check optional fields
    optionalFields.forEach(field => {
      const fieldValue = config[field as keyof WaterPumpConfig];
      if (this.isFieldFilled(fieldValue)) {
        filledOptional++;
      } else {
        missingFields.push(this.getFieldDisplayName(field));
      }
    });

    const completeness = (filledRequired / requiredFields.length) * 0.8 + 
                        (filledOptional / optionalFields.length) * 0.2;

    return { completeness, missingFields, criticalMissing };
  }

  /**
   * Check if a field has meaningful data
   */
  private static isFieldFilled(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'number' && (isNaN(value) || value < 0)) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  }

  /**
   * Convert field name to display-friendly format
   */
  private static getFieldDisplayName(fieldName: string): string {
    const displayNames: Record<string, string> = {
      'solarPanelMake': 'Solar Panel Brand',
      'panelWatts': 'Panel Wattage',
      'inverterMake': 'Inverter Brand',
      'inverterWatts': 'Inverter Capacity',
      'inverterPhase': 'Inverter Phase',
      'panelCount': 'Panel Count',
      'structureHeight': 'Structure Height',
      'lightningArrest': 'Lightning Arrestor',
      'earth': 'Earthing Type',
      'projectValue': 'Project Value',
      'batteryBrand': 'Battery Brand',
      'voltage': 'Battery Voltage',
      'batteryCount': 'Battery Count',
      'batteryType': 'Battery Type',
      'batteryAH': 'Battery AH',
      'batteryStands': 'Battery Stands',
      'inverterKW': 'Inverter KW',
      'inverterQty': 'Inverter Quantity',
      'floor': 'Floor Level',
      'structureType': 'Structure Type',
      'civilWorkScope': 'Civil Work Scope',
      'electricalWorkScope': 'Electrical Work Scope',
      'netMeterScope': 'Net Meter Scope',
      'plumbingWorkScope': 'Plumbing Work Scope',
      'brand': 'Water Heater Brand',
      'litre': 'Capacity (Litres)',
      'heatingCoil': 'Heating Coil',
      'hp': 'Motor HP',
      'drive': 'Drive Type',
      'panelBrand': 'Solar Panel Brand',
      'solarPanel': 'Solar Panel Details',
      'others': 'Additional Specifications'
    };

    return displayNames[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  /**
   * Get project type from site visit data
   */
  static getProjectTypesFromSiteVisit(siteVisit: SiteVisit): MarketingProjectType[] {
    const projectTypes: MarketingProjectType[] = [];

    if (!siteVisit.marketingData) {
      return projectTypes;
    }

    if (siteVisit.marketingData.onGridConfig) projectTypes.push('on_grid');
    if (siteVisit.marketingData.offGridConfig) projectTypes.push('off_grid');
    if (siteVisit.marketingData.hybridConfig) projectTypes.push('hybrid');
    if (siteVisit.marketingData.waterHeaterConfig) projectTypes.push('water_heater');
    if (siteVisit.marketingData.waterPumpConfig) projectTypes.push('water_pump');

    return projectTypes;
  }

  /**
   * Get critical missing fields for a specific project type
   */
  static getCriticalMissingFields(siteVisit: SiteVisit, projectType: MarketingProjectType): string[] {
    if (!siteVisit.marketingData) {
      return ['All project configuration missing'];
    }

    switch (projectType) {
      case 'on_grid':
        if (!siteVisit.marketingData.onGridConfig) return ['On-grid configuration missing'];
        return this.analyzeOnGridCompleteness(siteVisit.marketingData.onGridConfig).criticalMissing;
      
      case 'off_grid':
        if (!siteVisit.marketingData.offGridConfig) return ['Off-grid configuration missing'];
        return this.analyzeOffGridCompleteness(siteVisit.marketingData.offGridConfig).criticalMissing;
      
      case 'hybrid':
        if (!siteVisit.marketingData.hybridConfig) return ['Hybrid configuration missing'];
        return this.analyzeHybridCompleteness(siteVisit.marketingData.hybridConfig).criticalMissing;
      
      case 'water_heater':
        if (!siteVisit.marketingData.waterHeaterConfig) return ['Water heater configuration missing'];
        return this.analyzeWaterHeaterCompleteness(siteVisit.marketingData.waterHeaterConfig).criticalMissing;
      
      case 'water_pump':
        if (!siteVisit.marketingData.waterPumpConfig) return ['Water pump configuration missing'];
        return this.analyzeWaterPumpCompleteness(siteVisit.marketingData.waterPumpConfig).criticalMissing;
      
      default:
        return ['Unknown project type'];
    }
  }

  /**
   * Check if site visit has sufficient data for quotation generation
   */
  static canGenerateQuotation(siteVisit: SiteVisit, projectType: MarketingProjectType): boolean {
    const criticalMissing = this.getCriticalMissingFields(siteVisit, projectType);
    return criticalMissing.length === 0;
  }

  /**
   * Get estimated project value from site visit data
   */
  static getEstimatedProjectValue(siteVisit: SiteVisit, projectType: MarketingProjectType): number | null {
    if (!siteVisit.marketingData) return null;

    switch (projectType) {
      case 'on_grid':
        return siteVisit.marketingData.onGridConfig?.projectValue || null;
      case 'off_grid':
        return siteVisit.marketingData.offGridConfig?.projectValue || null;
      case 'hybrid':
        return siteVisit.marketingData.hybridConfig?.projectValue || null;
      case 'water_heater':
        return siteVisit.marketingData.waterHeaterConfig?.projectValue || null;
      case 'water_pump':
        return siteVisit.marketingData.waterPumpConfig?.projectValue || null;
      default:
        return null;
    }
  }
}