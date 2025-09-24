import { EnterpriseQuotation, QuotationProjectType } from "@shared/schema";

// Real business pricing rates (₹ per kW)
export const PRICING_RATES = {
  on_grid: 68000,      // ₹68,000/kW for on-grid systems
  off_grid: 85000,     // ₹85,000/kW for off-grid systems
  hybrid: 95000,       // ₹95,000/kW for hybrid systems
  water_heater: 25000, // ₹25,000 per unit for water heater
  water_pump: 35000,   // ₹35,000 per unit for water pump
  ev_charger: 45000,   // ₹45,000 per unit for EV charger
  battery_storage: 55000, // ₹55,000/kWh for battery storage
  grid_tie_inverter: 8000, // ₹8,000/kW for grid tie inverter
} as const;

// Government subsidy rates
export const SUBSIDY_RATES = {
  on_grid: 26000,      // ₹26,000/kW government subsidy for on-grid
  off_grid: 30000,     // ₹30,000/kW for off-grid
  hybrid: 28000,       // ₹28,000/kW for hybrid
  water_heater: 5000,  // ₹5,000 per unit
  water_pump: 8000,    // ₹8,000 per unit
  ev_charger: 10000,   // ₹10,000 per unit
  battery_storage: 15000, // ₹15,000/kWh for battery
  grid_tie_inverter: 2000, // ₹2,000/kW for inverter
} as const;

// Bulk discount tiers (exact business rules)
export const BULK_DISCOUNT_TIERS = [
  { minAmount: 500000, discount: 0.08, description: "8% for ₹5L+" },
  { minAmount: 200000, discount: 0.05, description: "5% for ₹2L+" },
] as const;

// Additional discount for multiple projects
export const MULTI_PROJECT_DISCOUNT = {
  minProjects: 3,
  discount: 0.02,
  description: "2% for 3+ projects"
} as const;

// GST rates
export const GST_RATE = 0.12; // 12% GST

// Payment terms
export const DEFAULT_PAYMENT_TERMS = {
  advance: 0.90,        // 90% advance
  installation: 0.10,   // 10% on installation
} as const;

// QuotationFinancials interface to match schema
export interface QuotationFinancials {
  basePrice: number;
  discounts: number;
  subsidyAmount: number;
  installationCharges: number;
  maintenanceCharges: number;
  otherCharges: number;
  subtotal: number;
  gstAmount: number;
  finalCustomerPayment: number;
  advancePayment: number;
  balancePayment: number;
}

export interface PricingInput {
  projectType: QuotationProjectType;
  capacityValue: number;
  capacityUnit: string;
  systemCapacity: string;
  location?: string;
  installationType?: 'residential' | 'commercial' | 'industrial';
  includeSubsidy?: boolean;
  customerProjectCount?: number;
  totalCustomerValue?: number;
}

export interface PricingResult {
  basePrice: number;
  subsidyAmount: number;
  priceAfterSubsidy: number;
  bulkDiscount: number;
  discountedPrice: number;
  gstAmount: number;
  finalCustomerPayment: number;
  advancePayment: number;
  installationPayment: number;
  breakdown: {
    ratePerUnit: number;
    capacityUsed: number;
    subsidyPerUnit: number;
    bulkDiscountPercentage: number;
    applicableDiscount: string;
  };
}

/**
 * Parse system capacity string to extract capacity value and unit
 */
export function parseSystemCapacity(systemCapacity: string): { value: number; unit: string } {
  const match = systemCapacity.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
  if (!match) {
    throw new Error(`Invalid system capacity format: ${systemCapacity}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  return { value, unit };
}

/**
 * Calculate bulk discount based on customer's total value and project count
 * Business rules: 8% for ₹5L+, 5% for ₹2L+, 2% for 3+ projects
 */
export function calculateBulkDiscount(
  totalValue: number, 
  projectCount: number
): { discount: number; description: string } {
  let valueDiscount = 0;
  let valueDescription = "";
  
  // Check value-based discounts (highest takes precedence)
  for (const tier of BULK_DISCOUNT_TIERS) {
    if (totalValue >= tier.minAmount) {
      valueDiscount = tier.discount;
      valueDescription = tier.description;
      break;
    }
  }
  
  // Check project count discount (only if no value discount applies)
  let projectDiscount = 0;
  let projectDescription = "";
  if (projectCount >= MULTI_PROJECT_DISCOUNT.minProjects && valueDiscount === 0) {
    projectDiscount = MULTI_PROJECT_DISCOUNT.discount;
    projectDescription = MULTI_PROJECT_DISCOUNT.description;
  }
  
  // Return the higher discount
  if (valueDiscount >= projectDiscount) {
    return { discount: valueDiscount, description: valueDescription };
  } else {
    return { discount: projectDiscount, description: projectDescription };
  }
}

/**
 * Main pricing calculation engine
 */
export function calculatePricing(input: PricingInput): PricingResult {
  const { projectType, capacityValue, includeSubsidy = true } = input;
  
  // Get pricing rates
  const ratePerUnit = PRICING_RATES[projectType as keyof typeof PRICING_RATES] || 0;
  const subsidyPerUnit = includeSubsidy ? (SUBSIDY_RATES[projectType as keyof typeof SUBSIDY_RATES] || 0) : 0;
  
  if (ratePerUnit === 0) {
    throw new Error(`Pricing not available for project type: ${projectType}`);
  }
  
  // Calculate base pricing
  const basePrice = ratePerUnit * capacityValue;
  const subsidyAmount = subsidyPerUnit * capacityValue;
  const priceAfterSubsidy = basePrice - subsidyAmount;
  
  // Calculate bulk discount
  const { discount: bulkDiscountPercentage, description: applicableDiscount } = 
    calculateBulkDiscount(
      input.totalCustomerValue || basePrice,
      input.customerProjectCount || 1
    );
  
  const bulkDiscount = priceAfterSubsidy * bulkDiscountPercentage;
  const discountedPrice = priceAfterSubsidy - bulkDiscount;
  
  // Calculate GST and final amounts
  const gstAmount = discountedPrice * GST_RATE;
  const finalCustomerPayment = discountedPrice + gstAmount;
  
  // Calculate payment terms
  const advancePayment = finalCustomerPayment * DEFAULT_PAYMENT_TERMS.advance;
  const installationPayment = finalCustomerPayment * DEFAULT_PAYMENT_TERMS.installation;
  
  return {
    basePrice,
    subsidyAmount,
    priceAfterSubsidy,
    bulkDiscount,
    discountedPrice,
    gstAmount,
    finalCustomerPayment,
    advancePayment,
    installationPayment,
    breakdown: {
      ratePerUnit,
      capacityUsed: capacityValue,
      subsidyPerUnit,
      bulkDiscountPercentage,
      applicableDiscount
    }
  };
}

/**
 * Generate QuotationFinancials object from pricing result
 */
export function generateQuotationFinancials(
  pricingResult: PricingResult,
  additionalCharges: { installation?: number; maintenance?: number; other?: number } = {}
): QuotationFinancials {
  const installationCharges = additionalCharges.installation || 0;
  const maintenanceCharges = additionalCharges.maintenance || 0;
  const otherCharges = additionalCharges.other || 0;
  
  const totalAdditionalCharges = installationCharges + maintenanceCharges + otherCharges;
  
  // Correct GST calculation: subtotal first, then GST, then final
  const subtotal = pricingResult.discountedPrice + totalAdditionalCharges;
  const gstAmount = subtotal * GST_RATE;
  const finalCustomerPayment = subtotal + gstAmount;
  
  return {
    basePrice: pricingResult.basePrice,
    discounts: pricingResult.bulkDiscount,
    subsidyAmount: pricingResult.subsidyAmount,
    installationCharges,
    maintenanceCharges,
    otherCharges,
    subtotal,
    gstAmount,
    finalCustomerPayment,
    advancePayment: finalCustomerPayment * DEFAULT_PAYMENT_TERMS.advance,
    balancePayment: finalCustomerPayment * DEFAULT_PAYMENT_TERMS.installation
  };
}

/**
 * Calculate pricing for multiple projects (bulk quotation)
 */
export function calculateMultiProjectPricing(
  projects: PricingInput[],
  customerId: string
): PricingResult[] {
  // Calculate total customer value first for bulk discount calculation
  const totalValue = projects.reduce((sum, project) => {
    const baseCalc = calculatePricing({
      ...project,
      customerProjectCount: 1,
      totalCustomerValue: 0
    });
    return sum + baseCalc.basePrice;
  }, 0);
  
  // Now calculate each project with the total customer value
  return projects.map(project => 
    calculatePricing({
      ...project,
      customerProjectCount: projects.length,
      totalCustomerValue: totalValue
    })
  );
}

/**
 * Generate pricing breakdown text for quotation display
 */
export function generatePricingBreakdownText(pricingResult: PricingResult): string {
  const { breakdown } = pricingResult;
  
  let text = `System Capacity: ${breakdown.capacityUsed} units\n`;
  text += `Rate per unit: ₹${breakdown.ratePerUnit.toLocaleString('en-IN')}\n`;
  text += `Base Price: ₹${pricingResult.basePrice.toLocaleString('en-IN')}\n`;
  
  if (pricingResult.subsidyAmount > 0) {
    text += `Government Subsidy: -₹${pricingResult.subsidyAmount.toLocaleString('en-IN')}\n`;
    text += `Price after Subsidy: ₹${pricingResult.priceAfterSubsidy.toLocaleString('en-IN')}\n`;
  }
  
  if (pricingResult.bulkDiscount > 0) {
    text += `Bulk Discount (${(breakdown.bulkDiscountPercentage * 100).toFixed(1)}%): -₹${pricingResult.bulkDiscount.toLocaleString('en-IN')}\n`;
    text += `${breakdown.applicableDiscount}\n`;
  }
  
  text += `GST (${(GST_RATE * 100)}%): ₹${pricingResult.gstAmount.toLocaleString('en-IN')}\n`;
  text += `Final Amount: ₹${pricingResult.finalCustomerPayment.toLocaleString('en-IN')}\n\n`;
  text += `Payment Terms:\n`;
  text += `Advance (${(DEFAULT_PAYMENT_TERMS.advance * 100)}%): ₹${pricingResult.advancePayment.toLocaleString('en-IN')}\n`;
  text += `On Installation (${(DEFAULT_PAYMENT_TERMS.installation * 100)}%): ₹${pricingResult.installationPayment.toLocaleString('en-IN')}`;
  
  return text;
}