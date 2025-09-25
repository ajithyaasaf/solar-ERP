/**
 * PrecisePricingEngine Service
 * Exact business rules and calculations for quotation pricing
 * 
 * Business Rules:
 * - On-grid: ₹68,000/kW
 * - Off-grid: ₹85,000/kW  
 * - Hybrid: ₹95,000/kW
 * - Water heater: ₹80/litre
 * - Water pump: ₹25,000/HP
 * - Subsidies: ₹26,000/kW with 10kW cap for on-grid
 * - GST: 12% on total system cost
 * - Payment: 90% advance, 10% balance
 */

import {
  type QuotationProjectType,
  type OnGridConfig,
  type OffGridConfig,
  type HybridConfig,
  type WaterHeaterConfig,
  type WaterPumpConfig,
  type BOMItem,
  type Pricing,
  type PricingBreakdown,
  type SubsidyInfo,
  type InsertQuotationDraft,
} from "@shared/schema";

interface PricingConfig {
  baseRates: {
    onGrid: number;      // ₹/kW
    offGrid: number;     // ₹/kW
    hybrid: number;      // ₹/kW
    waterHeater: number; // ₹/litre
    waterPump: number;   // ₹/HP
  };
  subsidyRates: {
    onGrid: number;      // ₹/kW
    maxCapacity: number; // kW cap
  };
  taxRates: {
    gst: number;         // %
    cgst: number;        // %
    sgst: number;        // %
  };
  brandMultipliers: {
    [brand: string]: number;
  };
  structureMultipliers: {
    [type: string]: number;
  };
  heightMultipliers: {
    [range: string]: number;
  };
  paymentTerms: {
    advancePercentage: number;
    balancePercentage: number;
  };
}

const PRICING_CONFIG: PricingConfig = {
  baseRates: {
    onGrid: 68000,       // ₹68,000/kW
    offGrid: 85000,      // ₹85,000/kW
    hybrid: 95000,       // ₹95,000/kW
    waterHeater: 80,     // ₹80/litre
    waterPump: 25000,    // ₹25,000/HP
  },
  subsidyRates: {
    onGrid: 26000,       // ₹26,000/kW
    maxCapacity: 10,     // 10kW cap
  },
  taxRates: {
    gst: 12,             // 12% GST
    cgst: 6,             // 6% CGST
    sgst: 6,             // 6% SGST
  },
  brandMultipliers: {
    // Premium brands
    "adani_solar": 1.15,
    "vikram_solar": 1.10,
    "utl_solar": 1.05,
    "loom_solar": 1.03,
    // Standard brands
    "renew": 1.00,
    "premier": 0.98,
    "kirloskar": 1.02,
    // Inverter brands
    "growatt": 1.00,
    "deye": 0.95,
    "polycab": 1.08,
    "utl": 1.02,
    "microtech": 0.92,
    // Battery brands
    "exide": 1.00,
    "exide_utl": 1.05,
  },
  structureMultipliers: {
    "gp_structure": 1.00,
    "mono_rail": 1.20,
    "mini_rail": 1.15,
    "long_rail": 1.25,
  },
  heightMultipliers: {
    "0-3": 1.00,         // Ground level
    "4-6": 1.05,         // Standard height
    "7-10": 1.15,        // Elevated installation
    "11-14": 1.25,       // High installation
  },
  paymentTerms: {
    advancePercentage: 90,
    balancePercentage: 10,
  },
};

interface DetailedPricingResult {
  breakdown: PricingBreakdown;
  subsidyInfo: SubsidyInfo;
  pricing: Pricing;
  summary: {
    systemCapacityKW: number;
    baseSystemCost: number;
    structureAdjustment: number;
    heightAdjustment: number;
    brandAdjustment: number;
    subtotal: number;
    gstAmount: number;
    totalSystemCost: number;
    subsidyAmount: number;
    finalCustomerPayment: number;
    advanceAmount: number;
    balanceAmount: number;
  };
  calculations: {
    effectiveRate: number;
    marginPercentage: number;
    profitAmount: number;
  };
}

export class PrecisePricingEngine {
  
  /**
   * Calculate comprehensive pricing for quotation draft
   */
  static calculateDetailedPricing(quotationDraft: Partial<InsertQuotationDraft>): DetailedPricingResult {
    const projectType = quotationDraft.projectType!;
    const systemConfig = quotationDraft.systemConfiguration!;
    
    // Extract system specifications
    const specs = this.extractSystemSpecifications(projectType, systemConfig);
    
    // Calculate base system cost
    const baseSystemCost = this.calculateBaseSystemCost(projectType, specs);
    
    // Apply adjustments
    const adjustments = this.calculateAdjustments(systemConfig, specs);
    
    // Calculate subtotal
    const subtotal = baseSystemCost + adjustments.total;
    
    // Calculate taxes
    const taxCalculation = this.calculateTaxes(subtotal);
    
    // Calculate total system cost
    const totalSystemCost = subtotal + taxCalculation.totalTax;
    
    // Calculate subsidies
    const subsidyInfo = this.calculateSubsidies(projectType, specs.capacity);
    
    // Calculate final customer payment
    const finalCustomerPayment = totalSystemCost - subsidyInfo.calculatedSubsidy;
    
    // Calculate payment breakdown
    const paymentBreakdown = this.calculatePaymentTerms(finalCustomerPayment);
    
    // Generate detailed BOM pricing
    const bomPricing = this.calculateBOMPricing(quotationDraft.billOfMaterials || [], specs, adjustments);
    
    // Create pricing breakdown
    const breakdown: PricingBreakdown = {
      components: bomPricing,
      subtotal,
      taxes: taxCalculation,
      totalSystemCost,
      subsidyBreakdown: subsidyInfo,
      finalAmount: finalCustomerPayment,
    };
    
    // Create pricing object
    const pricing: Pricing = {
      subtotal,
      taxAmount: taxCalculation.totalTax,
      totalSystemCost,
      subsidyAmount: subsidyInfo.calculatedSubsidy,
      subsidyPercentage: (subsidyInfo.calculatedSubsidy / totalSystemCost) * 100,
      customerPayment: finalCustomerPayment,
      advancePercentage: PRICING_CONFIG.paymentTerms.advancePercentage,
      balancePercentage: PRICING_CONFIG.paymentTerms.balancePercentage,
      perKWCost: specs.capacity > 0 ? Math.round(finalCustomerPayment / specs.capacity) : 0,
      marginAmount: this.calculateMargin(finalCustomerPayment, baseSystemCost),
      marginPercentage: this.calculateMarginPercentage(finalCustomerPayment, baseSystemCost),
    };
    
    // Create summary
    const summary = {
      systemCapacityKW: specs.capacity,
      baseSystemCost,
      structureAdjustment: adjustments.structure,
      heightAdjustment: adjustments.height,
      brandAdjustment: adjustments.brand,
      subtotal,
      gstAmount: taxCalculation.totalTax,
      totalSystemCost,
      subsidyAmount: subsidyInfo.calculatedSubsidy,
      finalCustomerPayment,
      advanceAmount: paymentBreakdown.advance,
      balanceAmount: paymentBreakdown.balance,
    };
    
    // Create calculations
    const calculations = {
      effectiveRate: specs.capacity > 0 ? Math.round(finalCustomerPayment / specs.capacity) : 0,
      marginPercentage: this.calculateMarginPercentage(finalCustomerPayment, baseSystemCost),
      profitAmount: this.calculateMargin(finalCustomerPayment, baseSystemCost),
    };
    
    return {
      breakdown,
      subsidyInfo,
      pricing,
      summary,
      calculations,
    };
  }
  
  /**
   * Extract system specifications from configuration
   */
  private static extractSystemSpecifications(
    projectType: QuotationProjectType,
    systemConfig: any
  ): {
    capacity: number;
    panelCount: number;
    panelWatts: number;
    inverterKW: number;
    batteryAH: number;
    litre: number;
    hp: number;
    brands: {
      solarPanel?: string;
      inverter?: string;
      battery?: string;
      waterHeater?: string;
    };
  } {
    const specs = {
      capacity: 0,
      panelCount: 0,
      panelWatts: 0,
      inverterKW: 0,
      batteryAH: 0,
      litre: 0,
      hp: 0,
      brands: {},
    };
    
    if (projectType === "on_grid" || projectType === "off_grid" || projectType === "hybrid") {
      const config = systemConfig as OnGridConfig | OffGridConfig | HybridConfig;
      
      specs.panelCount = config.panelCount || 0;
      specs.panelWatts = parseInt(config.panelWatts || "0");
      specs.capacity = (specs.panelCount * specs.panelWatts) / 1000; // Convert to kW
      specs.inverterKW = config.inverterKW || 0;
      
      if (config.solarPanelMake && config.solarPanelMake.length > 0) {
        specs.brands.solarPanel = config.solarPanelMake[0];
      }
      
      if (config.inverterMake && config.inverterMake.length > 0) {
        specs.brands.inverter = config.inverterMake[0];
      }
      
      // Battery for off-grid/hybrid
      if ((projectType === "off_grid" || projectType === "hybrid") && "batteryAH" in config) {
        specs.batteryAH = parseInt(config.batteryAH || "0");
        if (config.batteryMake && config.batteryMake.length > 0) {
          specs.brands.battery = config.batteryMake[0];
        }
      }
    } else if (projectType === "water_heater") {
      const config = systemConfig as WaterHeaterConfig;
      specs.litre = config.litre || 0;
      
      if (config.waterHeaterMake && config.waterHeaterMake.length > 0) {
        specs.brands.waterHeater = config.waterHeaterMake[0];
      }
    } else if (projectType === "water_pump") {
      const config = systemConfig as WaterPumpConfig;
      specs.hp = config.hp || 0;
    }
    
    return specs;
  }
  
  /**
   * Calculate base system cost according to business rules
   */
  private static calculateBaseSystemCost(
    projectType: QuotationProjectType,
    specs: any
  ): number {
    switch (projectType) {
      case "on_grid":
        return specs.capacity * PRICING_CONFIG.baseRates.onGrid;
        
      case "off_grid":
        return specs.capacity * PRICING_CONFIG.baseRates.offGrid;
        
      case "hybrid":
        return specs.capacity * PRICING_CONFIG.baseRates.hybrid;
        
      case "water_heater":
        return specs.litre * PRICING_CONFIG.baseRates.waterHeater;
        
      case "water_pump":
        return specs.hp * PRICING_CONFIG.baseRates.waterPump;
        
      default:
        return 0;
    }
  }
  
  /**
   * Calculate structure, height, and brand adjustments
   */
  private static calculateAdjustments(systemConfig: any, specs: any): {
    structure: number;
    height: number;
    brand: number;
    total: number;
  } {
    let structureAdjustment = 0;
    let heightAdjustment = 0;
    let brandAdjustment = 0;
    
    const baseSystemCost = this.calculateBaseSystemCost(
      systemConfig.projectType || "on_grid",
      specs
    );
    
    // Structure adjustment
    if (systemConfig.structureType) {
      const multiplier = PRICING_CONFIG.structureMultipliers[systemConfig.structureType] || 1.0;
      structureAdjustment = baseSystemCost * (multiplier - 1.0);
    }
    
    // Height adjustment
    if (systemConfig.structureHeight) {
      const height = systemConfig.structureHeight;
      let heightRange = "0-3";
      
      if (height >= 4 && height <= 6) heightRange = "4-6";
      else if (height >= 7 && height <= 10) heightRange = "7-10";
      else if (height >= 11 && height <= 14) heightRange = "11-14";
      
      const multiplier = PRICING_CONFIG.heightMultipliers[heightRange] || 1.0;
      heightAdjustment = baseSystemCost * (multiplier - 1.0);
    }
    
    // Brand adjustment (premium for higher quality brands)
    let totalBrandMultiplier = 1.0;
    
    if (specs.brands.solarPanel) {
      totalBrandMultiplier *= PRICING_CONFIG.brandMultipliers[specs.brands.solarPanel] || 1.0;
    }
    
    if (specs.brands.inverter) {
      totalBrandMultiplier *= PRICING_CONFIG.brandMultipliers[specs.brands.inverter] || 1.0;
    }
    
    if (specs.brands.battery) {
      totalBrandMultiplier *= PRICING_CONFIG.brandMultipliers[specs.brands.battery] || 1.0;
    }
    
    brandAdjustment = baseSystemCost * (totalBrandMultiplier - 1.0);
    
    return {
      structure: Math.round(structureAdjustment),
      height: Math.round(heightAdjustment),
      brand: Math.round(brandAdjustment),
      total: Math.round(structureAdjustment + heightAdjustment + brandAdjustment),
    };
  }
  
  /**
   * Calculate GST taxes
   */
  private static calculateTaxes(subtotal: number): {
    cgst: number;
    sgst: number;
    igst?: number;
    total: number;
  } {
    const cgst = Math.round(subtotal * (PRICING_CONFIG.taxRates.cgst / 100));
    const sgst = Math.round(subtotal * (PRICING_CONFIG.taxRates.sgst / 100));
    const total = cgst + sgst;
    
    return {
      cgst,
      sgst,
      total,
    };
  }
  
  /**
   * Calculate government subsidies
   */
  private static calculateSubsidies(
    projectType: QuotationProjectType,
    capacityKW: number
  ): SubsidyInfo {
    if (projectType !== "on_grid") {
      return {
        isEligible: false,
        subsidyType: "none",
        eligibleCapacity: 0,
        subsidyPerKW: 0,
        maximumSubsidy: 0,
        calculatedSubsidy: 0,
        subsidyTerms: [],
        documentationRequired: [],
      };
    }
    
    // On-grid subsidy calculation
    const eligibleCapacity = Math.min(capacityKW, PRICING_CONFIG.subsidyRates.maxCapacity);
    const subsidyPerKW = PRICING_CONFIG.subsidyRates.onGrid;
    const maximumSubsidy = PRICING_CONFIG.subsidyRates.maxCapacity * subsidyPerKW;
    const calculatedSubsidy = eligibleCapacity * subsidyPerKW;
    
    return {
      isEligible: true,
      subsidyType: "central",
      eligibleCapacity,
      subsidyPerKW,
      maximumSubsidy,
      calculatedSubsidy,
      subsidyTerms: [
        "Central Government Subsidy under PM-KUSUM Scheme",
        `₹${subsidyPerKW.toLocaleString()}/kW for systems up to ${PRICING_CONFIG.subsidyRates.maxCapacity}kW`,
        "Subsidy credited directly to customer bank account",
        "Processing time: 3-6 months after installation completion",
      ],
      documentationRequired: [
        "Aadhaar Card",
        "Bank Account Details",
        "Electricity Bill",
        "Property Documents",
        "Installation Completion Certificate",
      ],
    };
  }
  
  /**
   * Calculate payment terms breakdown
   */
  private static calculatePaymentTerms(totalAmount: number): {
    advance: number;
    balance: number;
  } {
    const advance = Math.round(totalAmount * (PRICING_CONFIG.paymentTerms.advancePercentage / 100));
    const balance = totalAmount - advance;
    
    return { advance, balance };
  }
  
  /**
   * Calculate detailed BOM pricing
   */
  private static calculateBOMPricing(
    billOfMaterials: BOMItem[],
    specs: any,
    adjustments: any
  ): PricingBreakdown["components"] {
    const components: PricingBreakdown["components"] = {
      solarPanels: { quantity: 0, rate: 0, amount: 0 },
      inverter: { quantity: 0, rate: 0, amount: 0 },
      structure: { quantity: 0, rate: 0, amount: 0 },
      accessories: { items: [] },
      installation: { rate: 0, amount: 0 },
    };
    
    // Solar panels
    if (specs.panelCount && specs.panelWatts) {
      const panelRate = this.calculatePanelRate(specs.panelWatts, specs.brands.solarPanel);
      components.solarPanels = {
        quantity: specs.panelCount,
        rate: panelRate,
        amount: specs.panelCount * panelRate,
      };
    }
    
    // Inverter
    if (specs.inverterKW) {
      const inverterRate = this.calculateInverterRate(specs.inverterKW, specs.brands.inverter);
      components.inverter = {
        quantity: 1,
        rate: inverterRate,
        amount: inverterRate,
      };
    }
    
    // Batteries (for off-grid/hybrid)
    if (specs.batteryAH) {
      const batteryRate = this.calculateBatteryRate(specs.batteryAH, specs.brands.battery);
      components.batteries = {
        quantity: 4, // Standard battery bank
        rate: batteryRate,
        amount: 4 * batteryRate,
      };
    }
    
    // Structure
    const structureRate = this.calculateStructureRate(specs.capacity);
    components.structure = {
      quantity: 1,
      rate: structureRate + adjustments.structure,
      amount: structureRate + adjustments.structure,
    };
    
    // Accessories
    components.accessories.items = this.calculateAccessoriesPricing(specs, billOfMaterials);
    
    // Installation and commissioning
    const installationRate = this.calculateInstallationRate(specs.capacity);
    components.installation = {
      rate: installationRate,
      amount: installationRate,
    };
    
    return components;
  }
  
  /**
   * Calculate solar panel rate based on wattage and brand
   */
  private static calculatePanelRate(panelWatts: number, brand?: string): number {
    // Base rate per watt
    const baseRatePerWatt = 25; // ₹25/W baseline
    
    // Brand multiplier
    const brandMultiplier = brand ? (PRICING_CONFIG.brandMultipliers[brand] || 1.0) : 1.0;
    
    return Math.round(panelWatts * baseRatePerWatt * brandMultiplier);
  }
  
  /**
   * Calculate inverter rate based on capacity and brand
   */
  private static calculateInverterRate(inverterKW: number, brand?: string): number {
    // Base rate per kW
    const baseRatePerKW = 18000; // ₹18,000/kW baseline
    
    // Brand multiplier
    const brandMultiplier = brand ? (PRICING_CONFIG.brandMultipliers[brand] || 1.0) : 1.0;
    
    return Math.round(inverterKW * baseRatePerKW * brandMultiplier);
  }
  
  /**
   * Calculate battery rate based on AH and brand
   */
  private static calculateBatteryRate(batteryAH: number, brand?: string): number {
    // Base rate per AH
    const baseRatePerAH = 200; // ₹200/AH baseline
    
    // Brand multiplier
    const brandMultiplier = brand ? (PRICING_CONFIG.brandMultipliers[brand] || 1.0) : 1.0;
    
    return Math.round(batteryAH * baseRatePerAH * brandMultiplier);
  }
  
  /**
   * Calculate structure rate based on system capacity
   */
  private static calculateStructureRate(capacityKW: number): number {
    // Base rate per kW for structure
    const baseRatePerKW = 5000; // ₹5,000/kW baseline
    
    return Math.round(capacityKW * baseRatePerKW);
  }
  
  /**
   * Calculate installation rate based on system capacity
   */
  private static calculateInstallationRate(capacityKW: number): number {
    // Base rate per kW for installation
    const baseRatePerKW = 8000; // ₹8,000/kW baseline
    
    return Math.round(capacityKW * baseRatePerKW);
  }
  
  /**
   * Calculate accessories pricing
   */
  private static calculateAccessoriesPricing(specs: any, billOfMaterials: BOMItem[]): Array<{
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }> {
    const accessories = [];
    
    // Standard accessories based on system capacity
    const capacity = specs.capacity || 1;
    
    accessories.push(
      {
        name: "DC Cable (4sq mm)",
        quantity: Math.ceil(capacity * 20), // 20m per kW
        rate: 45,
        amount: Math.ceil(capacity * 20) * 45,
      },
      {
        name: "AC Cable (2.5sq mm)",
        quantity: Math.ceil(capacity * 10), // 10m per kW
        rate: 35,
        amount: Math.ceil(capacity * 10) * 35,
      },
      {
        name: "Earthing Kit",
        quantity: 1,
        rate: 2500,
        amount: 2500,
      },
      {
        name: "Lightning Arrestor",
        quantity: 1,
        rate: 3500,
        amount: 3500,
      },
      {
        name: "DC/AC Disconnect Switches",
        quantity: 2,
        rate: 800,
        amount: 1600,
      },
      {
        name: "Monitoring System",
        quantity: 1,
        rate: 5000,
        amount: 5000,
      }
    );
    
    return accessories;
  }
  
  /**
   * Calculate profit margin
   */
  private static calculateMargin(sellingPrice: number, costPrice: number): number {
    return Math.round(sellingPrice - costPrice);
  }
  
  /**
   * Calculate profit margin percentage
   */
  private static calculateMarginPercentage(sellingPrice: number, costPrice: number): number {
    if (costPrice === 0) return 0;
    return Math.round(((sellingPrice - costPrice) / costPrice) * 100);
  }
  
  /**
   * Quick pricing calculation for estimates
   */
  static calculateQuickEstimate(
    projectType: QuotationProjectType,
    capacity: number
  ): {
    basePrice: number;
    subsidyAmount: number;
    finalPrice: number;
    monthlyEMI: number;
  } {
    let basePrice = 0;
    
    switch (projectType) {
      case "on_grid":
        basePrice = capacity * PRICING_CONFIG.baseRates.onGrid;
        break;
      case "off_grid":
        basePrice = capacity * PRICING_CONFIG.baseRates.offGrid;
        break;
      case "hybrid":
        basePrice = capacity * PRICING_CONFIG.baseRates.hybrid;
        break;
      default:
        basePrice = capacity * PRICING_CONFIG.baseRates.onGrid;
    }
    
    // Add GST
    const gstAmount = basePrice * (PRICING_CONFIG.taxRates.gst / 100);
    const totalWithGST = basePrice + gstAmount;
    
    // Calculate subsidy
    let subsidyAmount = 0;
    if (projectType === "on_grid") {
      const eligibleCapacity = Math.min(capacity, PRICING_CONFIG.subsidyRates.maxCapacity);
      subsidyAmount = eligibleCapacity * PRICING_CONFIG.subsidyRates.onGrid;
    }
    
    const finalPrice = totalWithGST - subsidyAmount;
    
    // Calculate approximate EMI (assuming 7% interest, 5 years)
    const monthlyInterestRate = 0.07 / 12;
    const numberOfPayments = 5 * 12;
    const monthlyEMI = finalPrice * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
                      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    
    return {
      basePrice: Math.round(totalWithGST),
      subsidyAmount: Math.round(subsidyAmount),
      finalPrice: Math.round(finalPrice),
      monthlyEMI: Math.round(monthlyEMI),
    };
  }
  
  /**
   * Validate pricing calculations
   */
  static validatePricing(pricing: Pricing): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validations
    if (pricing.subtotal < 0) errors.push("Subtotal cannot be negative");
    if (pricing.taxAmount < 0) errors.push("Tax amount cannot be negative");
    if (pricing.totalSystemCost < 0) errors.push("Total system cost cannot be negative");
    if (pricing.customerPayment < 0) errors.push("Customer payment cannot be negative");
    
    // Logical validations
    if (pricing.totalSystemCost !== pricing.subtotal + pricing.taxAmount) {
      errors.push("Total system cost should equal subtotal + tax amount");
    }
    
    if (pricing.customerPayment > pricing.totalSystemCost) {
      warnings.push("Customer payment is higher than total system cost");
    }
    
    // Payment terms validation
    if (pricing.advancePercentage + pricing.balancePercentage !== 100) {
      errors.push("Advance and balance percentages must sum to 100%");
    }
    
    // Reasonable limits
    if (pricing.perKWCost && (pricing.perKWCost < 30000 || pricing.perKWCost > 200000)) {
      warnings.push("Per kW cost seems outside normal range (₹30,000 - ₹2,00,000)");
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Generate pricing summary for quotation
   */
  static generatePricingSummary(result: DetailedPricingResult): string[] {
    const summary = [];
    
    summary.push(`System Capacity: ${result.summary.systemCapacityKW}kW`);
    summary.push(`Base System Cost: ₹${result.summary.baseSystemCost.toLocaleString()}`);
    
    if (result.summary.structureAdjustment > 0) {
      summary.push(`Structure Premium: ₹${result.summary.structureAdjustment.toLocaleString()}`);
    }
    
    if (result.summary.heightAdjustment > 0) {
      summary.push(`Height Adjustment: ₹${result.summary.heightAdjustment.toLocaleString()}`);
    }
    
    if (result.summary.brandAdjustment > 0) {
      summary.push(`Brand Premium: ₹${result.summary.brandAdjustment.toLocaleString()}`);
    }
    
    summary.push(`Subtotal: ₹${result.summary.subtotal.toLocaleString()}`);
    summary.push(`GST (12%): ₹${result.summary.gstAmount.toLocaleString()}`);
    summary.push(`Total System Cost: ₹${result.summary.totalSystemCost.toLocaleString()}`);
    
    if (result.summary.subsidyAmount > 0) {
      summary.push(`Government Subsidy: -₹${result.summary.subsidyAmount.toLocaleString()}`);
    }
    
    summary.push(`Customer Payment: ₹${result.summary.finalCustomerPayment.toLocaleString()}`);
    summary.push(`Advance (90%): ₹${result.summary.advanceAmount.toLocaleString()}`);
    summary.push(`Balance (10%): ₹${result.summary.balanceAmount.toLocaleString()}`);
    summary.push(`Effective Rate: ₹${result.calculations.effectiveRate.toLocaleString()}/kW`);
    
    return summary;
  }
}