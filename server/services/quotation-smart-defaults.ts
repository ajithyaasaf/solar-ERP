/**
 * SmartDefaultEngine Service
 * Intelligent defaults for missing quotation fields from site visit data
 * 
 * Features:
 * - Derive kW calculations from panel specifications
 * - Smart inverter sizing and quantities based on system capacity
 * - Intelligent earthing, structure, and scope defaults
 * - Conservative brand selections when missing
 * - Respect explicit user values, flag inferred values
 */

import {
  type SiteVisit,
  type OnGridConfig,
  type OffGridConfig,
  type HybridConfig,
  type WaterHeaterConfig,
  type WaterPumpConfig,
  type QuotationProjectType,
  type InsertQuotationDraft,
  type BOMItem,
  type Warranty,
  type Pricing,
  solarPanelBrands,
  inverterMakes,
  inverterPhases,
  earthingTypes,
  panelWatts,
  inverterWatts,
  batteryBrands,
  batteryTypes,
  batteryAHOptions,
  waterHeaterBrands,
  structureTypes,
  monoRailOptions,
  workScopeOptions,
} from "@shared/schema";

interface DefaultsApplied {
  field: string;
  value: any;
  source: "explicit" | "inferred" | "default";
  confidence: "high" | "medium" | "low";
  reason: string;
}

interface SmartDefaultsResult {
  quotationDraft: Partial<InsertQuotationDraft>;
  appliedDefaults: DefaultsApplied[];
  completenessScore: number;
  missingCriticalFields: string[];
  recommendations: string[];
}

export class SmartDefaultEngine {
  
  /**
   * Apply intelligent defaults to create a quotation draft from site visit data
   */
  static applySmartDefaults(siteVisit: SiteVisit): SmartDefaultsResult {
    const appliedDefaults: DefaultsApplied[] = [];
    const missingCriticalFields: string[] = [];
    const recommendations: string[] = [];

    // Extract project configurations
    const projectConfigs = this.extractProjectConfigurations(siteVisit);
    
    if (projectConfigs.length === 0) {
      return {
        quotationDraft: {},
        appliedDefaults: [],
        completenessScore: 0,
        missingCriticalFields: ["No project configurations found in site visit"],
        recommendations: ["Complete site visit marketing data before generating quotation"]
      };
    }

    // Process the primary project configuration (first one with most data)
    const primaryConfig = this.selectPrimaryConfiguration(projectConfigs);
    const quotationDraft = this.buildQuotationDraft(siteVisit, primaryConfig, appliedDefaults);

    // Apply smart defaults for missing fields
    this.applySystemCapacityDefaults(quotationDraft, primaryConfig, appliedDefaults);
    this.applyTechnicalDefaults(quotationDraft, primaryConfig, appliedDefaults);
    this.applyBOMDefaults(quotationDraft, primaryConfig, appliedDefaults);
    this.applyWarrantyDefaults(quotationDraft, primaryConfig, appliedDefaults);
    this.applyInstallationScopeDefaults(quotationDraft, primaryConfig, appliedDefaults);
    this.applyPricingDefaults(quotationDraft, primaryConfig, appliedDefaults);

    // Calculate completeness and generate recommendations
    const completenessScore = this.calculateCompleteness(quotationDraft, appliedDefaults);
    this.generateRecommendations(quotationDraft, primaryConfig, recommendations, missingCriticalFields);

    return {
      quotationDraft,
      appliedDefaults,
      completenessScore,
      missingCriticalFields,
      recommendations
    };
  }

  /**
   * Extract project configurations from site visit marketing data
   */
  private static extractProjectConfigurations(siteVisit: SiteVisit): Array<{
    type: QuotationProjectType;
    config: OnGridConfig | OffGridConfig | HybridConfig | WaterHeaterConfig | WaterPumpConfig;
    completeness: number;
  }> {
    const configs = [];

    if (!siteVisit.marketingData) return configs;

    const { marketingData } = siteVisit;

    // On-grid configuration
    if (marketingData.onGridConfig) {
      configs.push({
        type: "on_grid" as QuotationProjectType,
        config: marketingData.onGridConfig,
        completeness: this.calculateConfigCompleteness(marketingData.onGridConfig, "on_grid")
      });
    }

    // Off-grid configuration
    if (marketingData.offGridConfig) {
      configs.push({
        type: "off_grid" as QuotationProjectType,
        config: marketingData.offGridConfig,
        completeness: this.calculateConfigCompleteness(marketingData.offGridConfig, "off_grid")
      });
    }

    // Hybrid configuration
    if (marketingData.hybridConfig) {
      configs.push({
        type: "hybrid" as QuotationProjectType,
        config: marketingData.hybridConfig,
        completeness: this.calculateConfigCompleteness(marketingData.hybridConfig, "hybrid")
      });
    }

    // Water heater configuration
    if (marketingData.waterHeaterConfig) {
      configs.push({
        type: "water_heater" as QuotationProjectType,
        config: marketingData.waterHeaterConfig,
        completeness: this.calculateConfigCompleteness(marketingData.waterHeaterConfig, "water_heater")
      });
    }

    // Water pump configuration
    if (marketingData.waterPumpConfig) {
      configs.push({
        type: "water_pump" as QuotationProjectType,
        config: marketingData.waterPumpConfig,
        completeness: this.calculateConfigCompleteness(marketingData.waterPumpConfig, "water_pump")
      });
    }

    return configs.sort((a, b) => b.completeness - a.completeness);
  }

  /**
   * Calculate completeness of a project configuration
   */
  private static calculateConfigCompleteness(config: any, type: QuotationProjectType): number {
    const requiredFields = this.getRequiredFieldsForType(type);
    const filledFields = requiredFields.filter(field => 
      config[field] !== undefined && config[field] !== null && config[field] !== ""
    );

    return filledFields.length / requiredFields.length;
  }

  /**
   * Get required fields for each project type
   */
  private static getRequiredFieldsForType(type: QuotationProjectType): string[] {
    switch (type) {
      case "on_grid":
        return ["solarPanelMake", "panelWatts", "panelCount", "inverterMake", "inverterWatts", "earth"];
      case "off_grid":
        return ["solarPanelMake", "panelWatts", "panelCount", "inverterMake", "inverterWatts", "batteryMake", "batteryAH", "earth"];
      case "hybrid":
        return ["solarPanelMake", "panelWatts", "panelCount", "inverterMake", "inverterWatts", "batteryMake", "batteryAH", "earth"];
      case "water_heater":
        return ["waterHeaterMake", "litre"];
      case "water_pump":
        return ["hp"];
      default:
        return [];
    }
  }

  /**
   * Select the primary configuration (most complete one)
   */
  private static selectPrimaryConfiguration(configs: Array<{
    type: QuotationProjectType;
    config: any;
    completeness: number;
  }>) {
    return configs[0]; // Already sorted by completeness
  }

  /**
   * Build initial quotation draft from site visit data
   */
  private static buildQuotationDraft(
    siteVisit: SiteVisit, 
    primaryConfig: any, 
    appliedDefaults: DefaultsApplied[]
  ): Partial<InsertQuotationDraft> {
    const draft: Partial<InsertQuotationDraft> = {};

    // Customer information from site visit
    if (siteVisit.customerId) {
      draft.customerId = siteVisit.customerId;
      this.addDefault(appliedDefaults, "customerId", siteVisit.customerId, "explicit", "high", "From site visit data");
    }

    if (siteVisit.customerName) {
      draft.customerName = siteVisit.customerName;
      this.addDefault(appliedDefaults, "customerName", siteVisit.customerName, "explicit", "high", "From site visit data");
    }

    if (siteVisit.customerMobile) {
      draft.customerMobile = siteVisit.customerMobile;
      this.addDefault(appliedDefaults, "customerMobile", siteVisit.customerMobile, "explicit", "high", "From site visit data");
    }

    if (siteVisit.customerAddress) {
      draft.customerAddress = siteVisit.customerAddress;
      this.addDefault(appliedDefaults, "customerAddress", siteVisit.customerAddress, "explicit", "high", "From site visit data");
    }

    if (siteVisit.customerEmail) {
      draft.customerEmail = siteVisit.customerEmail;
      this.addDefault(appliedDefaults, "customerEmail", siteVisit.customerEmail, "explicit", "high", "From site visit data");
    }

    // Property and service information
    if (siteVisit.propertyType) {
      draft.propertyType = siteVisit.propertyType;
      this.addDefault(appliedDefaults, "propertyType", siteVisit.propertyType, "explicit", "high", "From site visit data");
    }

    if (siteVisit.ebServiceNumber) {
      draft.ebServiceNumber = siteVisit.ebServiceNumber;
      this.addDefault(appliedDefaults, "ebServiceNumber", siteVisit.ebServiceNumber, "explicit", "high", "From site visit data");
    }

    // Site visit linkage
    draft.siteVisitId = siteVisit.id;
    draft.sourceVisitDate = siteVisit.visitDate;
    draft.sourceVisitPurpose = siteVisit.purpose;
    this.addDefault(appliedDefaults, "siteVisitId", siteVisit.id, "explicit", "high", "Site visit reference");

    // Project configuration
    draft.projectType = primaryConfig.type;
    draft.systemConfiguration = primaryConfig.config;
    this.addDefault(appliedDefaults, "projectType", primaryConfig.type, "explicit", "high", "Most complete configuration from site visit");

    // Default status and tracking
    draft.status = "draft";
    draft.projectStatus = "not_started";
    draft.dataCompleteness = 0; // Will be calculated later
    draft.missingFields = [];
    draft.needsReview = true;

    // User tracking
    if (siteVisit.createdBy) {
      draft.createdBy = siteVisit.createdBy;
      this.addDefault(appliedDefaults, "createdBy", siteVisit.createdBy, "explicit", "high", "From site visit creator");
    }

    return draft;
  }

  /**
   * Apply system capacity defaults based on panel specifications
   */
  private static applySystemCapacityDefaults(
    draft: Partial<InsertQuotationDraft>,
    primaryConfig: any,
    appliedDefaults: DefaultsApplied[]
  ) {
    const config = primaryConfig.config;

    // Calculate system capacity from panel specs
    if (config.panelCount && config.panelWatts) {
      const panelWattsNum = parseInt(config.panelWatts);
      const systemCapacityKW = (config.panelCount * panelWattsNum) / 1000;
      
      draft.systemCapacity = `${systemCapacityKW}kW`;
      this.addDefault(appliedDefaults, "systemCapacity", draft.systemCapacity, "inferred", "high", 
        `Calculated from ${config.panelCount} panels × ${config.panelWatts}W`);

      // Generate project title
      const projectTitle = `${systemCapacityKW}kW ${primaryConfig.type.replace('_', ' ').toUpperCase()} Solar System`;
      draft.projectTitle = projectTitle;
      this.addDefault(appliedDefaults, "projectTitle", projectTitle, "inferred", "medium", 
        "Generated from system capacity and project type");
    }

    // Default inverter sizing if missing
    if (!config.inverterKW && config.panelCount && config.panelWatts) {
      const panelWattsNum = parseInt(config.panelWatts);
      const totalWatts = config.panelCount * panelWattsNum;
      const recommendedInverterKW = Math.ceil(totalWatts / 1000);
      
      // Find closest available inverter size
      const availableInverterKW = [3, 4, 5, 10, 15, 30];
      const closestInverterKW = availableInverterKW.find(kw => kw >= recommendedInverterKW) || availableInverterKW[availableInverterKW.length - 1];
      
      config.inverterKW = closestInverterKW;
      this.addDefault(appliedDefaults, "inverterKW", closestInverterKW, "inferred", "medium", 
        `Sized based on ${totalWatts}W solar capacity`);
    }

    // Default inverter quantity
    if (!config.inverterQty && config.inverterKW) {
      config.inverterQty = 1; // Most common case
      this.addDefault(appliedDefaults, "inverterQty", 1, "default", "medium", 
        "Single inverter is most common configuration");
    }
  }

  /**
   * Apply technical defaults for earthing, structure, etc.
   */
  private static applyTechnicalDefaults(
    draft: Partial<InsertQuotationDraft>,
    primaryConfig: any,
    appliedDefaults: DefaultsApplied[]
  ) {
    const config = primaryConfig.config;

    // Smart earthing defaults
    if (!config.earth) {
      if (primaryConfig.type === "on_grid") {
        config.earth = "ac_dc"; // On-grid typically needs both AC and DC earthing
        this.addDefault(appliedDefaults, "earth", "ac_dc", "default", "high", 
          "On-grid systems typically require both AC and DC earthing");
      } else {
        config.earth = "dc"; // Off-grid systems primarily need DC earthing
        this.addDefault(appliedDefaults, "earth", "dc", "default", "medium", 
          "Off-grid systems typically require DC earthing");
      }
    }

    // Structure defaults
    if (!config.structureType) {
      config.structureType = "gp_structure"; // Most common
      this.addDefault(appliedDefaults, "structureType", "gp_structure", "default", "medium", 
        "GP structure is most common installation type");
    }

    // Height defaults
    if (!config.structureHeight) {
      config.structureHeight = 6; // Standard 6 feet height
      this.addDefault(appliedDefaults, "structureHeight", 6, "default", "medium", 
        "Standard 6 feet installation height");
    }

    // Floor level defaults
    if (!config.floor) {
      config.floor = "0"; // Ground level most common
      this.addDefault(appliedDefaults, "floor", "0", "default", "medium", 
        "Ground level installation is most common");
    }

    // Lightning arrestor default for safety
    if (config.lightningArrest === undefined) {
      config.lightningArrest = true; // Safety first
      this.addDefault(appliedDefaults, "lightningArrest", true, "default", "high", 
        "Lightning arrestor recommended for safety");
    }

    // Inverter phase defaults
    if (!config.inverterPhase) {
      if (config.inverterKW && config.inverterKW >= 5) {
        config.inverterPhase = "three_phase";
        this.addDefault(appliedDefaults, "inverterPhase", "three_phase", "inferred", "high", 
          "Three-phase recommended for systems ≥5kW");
      } else {
        config.inverterPhase = "single_phase";
        this.addDefault(appliedDefaults, "inverterPhase", "single_phase", "default", "medium", 
          "Single-phase default for smaller systems");
      }
    }
  }

  /**
   * Apply conservative brand defaults when missing
   */
  private static applyBrandDefaults(
    config: any,
    appliedDefaults: DefaultsApplied[]
  ) {
    // Solar panel brand defaults
    if (!config.solarPanelMake || config.solarPanelMake.length === 0) {
      config.solarPanelMake = ["renew"]; // Conservative, reliable brand
      this.addDefault(appliedDefaults, "solarPanelMake", ["renew"], "default", "low", 
        "Renew is a reliable, cost-effective solar panel brand");
    }

    // Inverter brand defaults
    if (!config.inverterMake || config.inverterMake.length === 0) {
      config.inverterMake = ["growatt"]; // Popular, reliable brand
      this.addDefault(appliedDefaults, "inverterMake", ["growatt"], "default", "low", 
        "Growatt is a popular, reliable inverter brand");
    }

    // Battery brand defaults (for off-grid/hybrid)
    if ((config.batteryMake === undefined || config.batteryMake.length === 0) && 
        (config.batteryAH || config.batteryType)) {
      config.batteryMake = ["exide"]; // Trusted battery brand
      this.addDefault(appliedDefaults, "batteryMake", ["exide"], "default", "low", 
        "Exide is a trusted battery brand");
    }

    // Panel watts defaults
    if (!config.panelWatts) {
      config.panelWatts = "550"; // Modern efficient panels
      this.addDefault(appliedDefaults, "panelWatts", "550", "default", "medium", 
        "550W panels offer good efficiency and value");
    }
  }

  /**
   * Apply BOM (Bill of Materials) defaults
   */
  private static applyBOMDefaults(
    draft: Partial<InsertQuotationDraft>,
    primaryConfig: any,
    appliedDefaults: DefaultsApplied[]
  ) {
    const config = primaryConfig.config;
    const billOfMaterials: BOMItem[] = [];

    // Apply brand defaults first
    this.applyBrandDefaults(config, appliedDefaults);

    // Solar panels
    if (config.panelCount && config.panelWatts && config.solarPanelMake) {
      billOfMaterials.push({
        category: "solar_panels",
        item: `${config.solarPanelMake[0]} Solar Panel`,
        specification: `${config.panelWatts}W Monocrystalline`,
        quantity: config.panelCount,
        unit: "nos",
        rate: 0, // Will be filled by pricing engine
        amount: 0
      });
    }

    // Inverter
    if (config.inverterKW && config.inverterMake) {
      billOfMaterials.push({
        category: "inverter",
        item: `${config.inverterMake[0]} Inverter`,
        specification: `${config.inverterKW}kW ${config.inverterPhase || 'Single Phase'}`,
        quantity: config.inverterQty || 1,
        unit: "nos",
        rate: 0,
        amount: 0
      });
    }

    // Batteries (for off-grid/hybrid)
    if (config.batteryAH && config.batteryMake && 
        (primaryConfig.type === "off_grid" || primaryConfig.type === "hybrid")) {
      billOfMaterials.push({
        category: "battery",
        item: `${config.batteryMake[0]} Battery`,
        specification: `${config.batteryAH}AH ${config.batteryType || 'Lead Acid'}`,
        quantity: config.batteryQty || 4,
        unit: "nos",
        rate: 0,
        amount: 0
      });
    }

    // Structure
    if (config.structureType) {
      billOfMaterials.push({
        category: "structure",
        item: "Mounting Structure",
        specification: config.structureType === "gp_structure" ? "GI Structure" : "Mono Rail",
        quantity: 1,
        unit: "set",
        rate: 0,
        amount: 0
      });
    }

    // Essential accessories
    billOfMaterials.push(
      {
        category: "accessories",
        item: "DC Cable",
        specification: "4sq mm Solar DC Cable",
        quantity: 100,
        unit: "mtr",
        rate: 0,
        amount: 0
      },
      {
        category: "accessories",
        item: "AC Cable",
        specification: "2.5sq mm AC Cable",
        quantity: 50,
        unit: "mtr",
        rate: 0,
        amount: 0
      },
      {
        category: "accessories",
        item: "Earthing Kit",
        specification: "Complete Earthing Kit",
        quantity: 1,
        unit: "set",
        rate: 0,
        amount: 0
      }
    );

    if (config.lightningArrest) {
      billOfMaterials.push({
        category: "accessories",
        item: "Lightning Arrestor",
        specification: "DC/AC Lightning Arrestor",
        quantity: 1,
        unit: "set",
        rate: 0,
        amount: 0
      });
    }

    draft.billOfMaterials = billOfMaterials;
    this.addDefault(appliedDefaults, "billOfMaterials", `${billOfMaterials.length} items`, "inferred", "high", 
      "Generated based on system configuration");
  }

  /**
   * Apply warranty defaults
   */
  private static applyWarrantyDefaults(
    draft: Partial<InsertQuotationDraft>,
    primaryConfig: any,
    appliedDefaults: DefaultsApplied[]
  ) {
    const warranties: Warranty[] = [
      {
        component: "Solar Panels",
        period: "25 years",
        coverage: "Performance warranty - 80% power output",
        conditions: "Normal weather conditions, proper installation"
      },
      {
        component: "Inverter",
        period: "5 years",
        coverage: "Complete replacement warranty",
        conditions: "Manufacturing defects, proper installation"
      },
      {
        component: "Structure",
        period: "10 years",
        coverage: "Rust and structural integrity",
        conditions: "Proper installation, regular maintenance"
      },
      {
        component: "Installation",
        period: "1 year",
        coverage: "Workmanship and installation quality",
        conditions: "Free service and repair"
      }
    ];

    // Add battery warranty for off-grid/hybrid systems
    if (primaryConfig.type === "off_grid" || primaryConfig.type === "hybrid") {
      warranties.push({
        component: "Battery",
        period: "3 years",
        coverage: "Replacement warranty for manufacturing defects",
        conditions: "Proper charging cycles, maintenance"
      });
    }

    draft.warranties = warranties;
    this.addDefault(appliedDefaults, "warranties", `${warranties.length} warranties`, "default", "high", 
      "Standard industry warranties for all components");
  }

  /**
   * Apply installation scope defaults
   */
  private static applyInstallationScopeDefaults(
    draft: Partial<InsertQuotationDraft>,
    primaryConfig: any,
    appliedDefaults: DefaultsApplied[]
  ) {
    const installationScope = {
      companyScope: [
        "Solar panel installation",
        "Inverter installation and commissioning",
        "DC and AC wiring",
        "Earthing and safety installation",
        "System testing and commissioning"
      ],
      customerScope: [
        "Civil work for structure foundation",
        "AC distribution board space",
        "Net meter installation (if required)"
      ],
      civilWork: "customer_scope" as const,
      electricalWork: "company_scope" as const,
      netMeterWork: "customer_scope" as const
    };

    // Add battery installation for off-grid/hybrid
    if (primaryConfig.type === "off_grid" || primaryConfig.type === "hybrid") {
      installationScope.companyScope.push("Battery installation and wiring");
    }

    // Add plumbing for water heater
    if (primaryConfig.type === "water_heater") {
      installationScope.customerScope.push("Plumbing connections");
      installationScope.plumbingWork = "customer_scope" as const;
    }

    draft.installationScope = installationScope;
    this.addDefault(appliedDefaults, "installationScope", "Standard scope division", "default", "high", 
      "Standard division of installation responsibilities");
  }

  /**
   * Apply basic pricing defaults (will be refined by PricingEngine)
   */
  private static applyPricingDefaults(
    draft: Partial<InsertQuotationDraft>,
    primaryConfig: any,
    appliedDefaults: DefaultsApplied[]
  ) {
    const pricing: Partial<Pricing> = {
      subtotal: 0,
      taxAmount: 0,
      totalSystemCost: 0,
      subsidyAmount: 0,
      subsidyPercentage: 0,
      customerPayment: 0,
      advancePercentage: 90,
      balancePercentage: 10
    };

    draft.pricing = pricing as Pricing;
    this.addDefault(appliedDefaults, "pricing", "Basic structure", "default", "low", 
      "Initial pricing structure - needs PricingEngine calculation");

    // Payment terms
    draft.paymentTerms = [
      "90% Advance Along with Purchase Order",
      "10% After completion of work"
    ];
    this.addDefault(appliedDefaults, "paymentTerms", "Standard terms", "default", "high", 
      "Standard payment terms for solar installations");

    // Delivery and validity
    draft.deliveryPeriod = "2-3 Weeks from order confirmation";
    draft.validityPeriod = "30 days";
    this.addDefault(appliedDefaults, "deliveryPeriod", "2-3 weeks", "default", "high", 
      "Standard delivery timeline");
  }

  /**
   * Calculate overall completeness score
   */
  private static calculateCompleteness(
    draft: Partial<InsertQuotationDraft>,
    appliedDefaults: DefaultsApplied[]
  ): number {
    const totalFields = 20; // Key fields for a complete quotation
    const explicitFields = appliedDefaults.filter(d => d.source === "explicit").length;
    const inferredFields = appliedDefaults.filter(d => d.source === "inferred").length;
    const defaultFields = appliedDefaults.filter(d => d.source === "default").length;

    // Weight explicit fields more than inferred, inferred more than defaults
    const weightedScore = (explicitFields * 1.0) + (inferredFields * 0.8) + (defaultFields * 0.5);
    return Math.min(weightedScore / totalFields, 1.0);
  }

  /**
   * Generate recommendations for improving quotation quality
   */
  private static generateRecommendations(
    draft: Partial<InsertQuotationDraft>,
    primaryConfig: any,
    recommendations: string[],
    missingCriticalFields: string[]
  ) {
    const config = primaryConfig.config;

    // Check for critical missing information
    if (!config.panelCount || !config.panelWatts) {
      missingCriticalFields.push("Solar panel specifications");
      recommendations.push("Complete solar panel count and wattage for accurate system sizing");
    }

    if (!config.inverterMake || config.inverterMake.length === 0) {
      recommendations.push("Specify preferred inverter brand for better customer confidence");
    }

    if (!draft.customerEmail) {
      recommendations.push("Add customer email for digital quotation delivery");
    }

    if (primaryConfig.type === "on_grid" && !draft.ebServiceNumber) {
      recommendations.push("EB service number required for net metering process");
    }

    if (!config.structureHeight || config.structureHeight < 3) {
      recommendations.push("Verify structure height for optimal panel positioning");
    }

    // Technical recommendations
    if (config.inverterKW && config.panelCount && config.panelWatts) {
      const totalPanelWatts = config.panelCount * parseInt(config.panelWatts);
      const inverterWatts = config.inverterKW * 1000;
      
      if (inverterWatts < totalPanelWatts * 0.8) {
        recommendations.push("Inverter may be undersized - consider larger capacity");
      }
      if (inverterWatts > totalPanelWatts * 1.2) {
        recommendations.push("Inverter may be oversized - consider optimizing for cost");
      }
    }

    // Financial recommendations
    if (!config.projectValue || config.projectValue === 0) {
      recommendations.push("Add project value for accurate pricing calculation");
    }
  }

  /**
   * Helper method to add a default value with tracking
   */
  private static addDefault(
    appliedDefaults: DefaultsApplied[],
    field: string,
    value: any,
    source: "explicit" | "inferred" | "default",
    confidence: "high" | "medium" | "low",
    reason: string
  ) {
    appliedDefaults.push({
      field,
      value,
      source,
      confidence,
      reason
    });
  }

  /**
   * Get technical requirements from site visit
   */
  static extractTechnicalRequirements(siteVisit: SiteVisit) {
    const requirements = {
      serviceTypes: [],
      workType: undefined,
      specialRequirements: ""
    };

    if (siteVisit.technicalData) {
      requirements.serviceTypes = siteVisit.technicalData.serviceType || [];
      requirements.workType = siteVisit.technicalData.workType;
      requirements.specialRequirements = siteVisit.technicalData.description || "";
    }

    return requirements;
  }

  /**
   * Validate and suggest improvements for quotation draft
   */
  static validateQuotationDraft(draft: Partial<InsertQuotationDraft>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Critical validations
    if (!draft.customerId) errors.push("Customer ID is required");
    if (!draft.customerName) errors.push("Customer name is required");
    if (!draft.customerMobile) errors.push("Customer mobile is required");
    if (!draft.systemCapacity) errors.push("System capacity is required");
    if (!draft.projectType) errors.push("Project type is required");

    // System configuration validations
    if (draft.systemConfiguration) {
      const config = draft.systemConfiguration as any;
      
      if (config.panelCount && config.panelCount < 1) {
        errors.push("Panel count must be at least 1");
      }
      
      if (config.inverterKW && config.inverterKW < 1) {
        errors.push("Inverter capacity must be at least 1kW");
      }
    }

    // Warnings for incomplete data
    if (!draft.customerEmail) warnings.push("Customer email missing - will limit communication options");
    if (!draft.ebServiceNumber && draft.projectType === "on_grid") {
      warnings.push("EB service number recommended for on-grid systems");
    }

    // Suggestions for optimization
    if (draft.billOfMaterials && draft.billOfMaterials.length < 3) {
      suggestions.push("Consider adding more accessories for complete installation");
    }

    if (draft.pricing && draft.pricing.customerPayment === 0) {
      suggestions.push("Run pricing calculation to determine customer payment");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
}