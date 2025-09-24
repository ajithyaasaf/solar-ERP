import { storage } from "../storage";
import { calculatePricing, generateQuotationFinancials } from "../pricing-engine";
import { QuotationProjectType } from "@shared/schema";
import { normalizeCapacityForPricing, getStandardizedUnit } from "./capacity-normalizer";
import { generateBOM } from "./bom-generator";

// Service type to quotation project type mapping
export const SERVICE_TYPE_MAPPING: Record<string, QuotationProjectType> = {
  'on_grid': 'on_grid',
  'off_grid': 'off_grid', 
  'hybrid': 'hybrid',
  'water_heater': 'water_heater',
  'water_pump': 'water_pump',
  'solar_panel': 'solar_panel',
  'camera': 'camera',
  'lights_accessories': 'lights_accessories',
  'others': 'others'
} as const;

// Default system specifications based on project type and customer requirements
export const DEFAULT_SYSTEM_SPECS = {
  on_grid: {
    defaultCapacity: "3kW",
    title: "On-Grid Solar Power Generation System",
    isPerUnit: false
  },
  off_grid: {
    defaultCapacity: "5kW", 
    title: "Off-Grid Solar Power Generation System",
    isPerUnit: false
  },
  hybrid: {
    defaultCapacity: "5kW",
    title: "Hybrid Solar Power Generation System",
    isPerUnit: false
  },
  water_heater: {
    defaultCapacity: "200L",
    title: "Solar Water Heater System",
    isPerUnit: true // Per unit pricing regardless of capacity
  },
  water_pump: {
    defaultCapacity: "3HP",
    title: "Solar Water Pump System",
    isPerUnit: true // Per unit pricing regardless of capacity
  },
  solar_panel: {
    defaultCapacity: "1kW",
    title: "Solar Panel Installation",
    isPerUnit: false
  },
  camera: {
    defaultCapacity: "1Unit",
    title: "Security Camera Installation",
    isPerUnit: true
  },
  lights_accessories: {
    defaultCapacity: "1Set",
    title: "Lights & Accessories Installation",
    isPerUnit: true
  },
  others: {
    defaultCapacity: "1Unit",
    title: "Other Solar Equipment",
    isPerUnit: true
  }
} as const;

export interface SiteVisitQuotationMapping {
  siteVisitId: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail?: string;
  serviceTypes: string[];
  requirements: {
    monthlyBill?: number;
    roofArea?: number;
    dailyWaterUsage?: number;
    pumpCapacity?: string;
    additionalRequirements?: string;
  };
  siteConditions: {
    roofType?: string;
    shadingIssues?: boolean;
    electricalConnection?: string;
    waterSource?: string;
  };
  visitDate: Date;
  visitedBy: string;
  notes?: string;
}

export interface QuotationGenerationRequest {
  siteVisitId: string;
  selectedProjects: {
    projectType: QuotationProjectType;
    systemCapacity: string;
    customTitle?: string;
    additionalRequirements?: string;
  }[];
  createdBy: string;
  includeSubsidy?: boolean;
}

export interface QuotationGenerationResult {
  success: boolean;
  quotations: any[];
  errors: any[];
  summary: {
    totalGenerated: number;
    totalFailed: number;
    totalValue: number;
    bulkDiscountApplied: number;
  };
}

/**
 * Extract quotation-relevant data from site visit
 */
export async function extractSiteVisitData(siteVisitId: string): Promise<SiteVisitQuotationMapping | null> {
  try {
    // Get site visit data (placeholder - will be implemented when site visit structure is available)
    const siteVisit = await storage.getSiteVisit?.(siteVisitId);
    
    // Fallback for development - return mock data if getSiteVisit not available
    if (!storage.getSiteVisit) {
      console.warn("getSiteVisit not implemented, using mock data for development");
      return {
        siteVisitId,
        customerId: "mock-customer-id",
        customerName: "Mock Customer",
        customerAddress: "Mock Address",
        customerPhone: "1234567890",
        customerEmail: "mock@example.com",
        serviceTypes: ["on_grid", "water_heater"],
        requirements: { monthlyBill: 3000, roofArea: 500 },
        siteConditions: { roofType: "concrete", shadingIssues: false },
        visitDate: new Date(),
        visitedBy: "mock-technician"
      };
    }
    
    if (!siteVisit) {
      return null;
    }

    // Extract customer information
    const customer = siteVisit.customer || await storage.getCustomer(siteVisit.customerId);
    
    if (!customer) {
      throw new Error("Customer not found for site visit");
    }

    // Map site visit data to quotation mapping structure
    const mapping: SiteVisitQuotationMapping = {
      siteVisitId,
      customerId: customer.id,
      customerName: customer.name,
      customerAddress: customer.address || '',
      customerPhone: customer.phone || '',
      customerEmail: customer.email,
      serviceTypes: siteVisit.serviceTypes || [],
      requirements: {
        monthlyBill: siteVisit.monthlyElectricityBill,
        roofArea: siteVisit.roofArea,
        dailyWaterUsage: siteVisit.dailyWaterUsage,
        pumpCapacity: siteVisit.pumpCapacity,
        additionalRequirements: siteVisit.additionalRequirements
      },
      siteConditions: {
        roofType: siteVisit.roofType,
        shadingIssues: siteVisit.shadingIssues,
        electricalConnection: siteVisit.electricalConnection,
        waterSource: siteVisit.waterSource
      },
      visitDate: siteVisit.scheduledDate || new Date(),
      visitedBy: siteVisit.assignedTo || '',
      notes: siteVisit.notes
    };

    return mapping;
  } catch (error) {
    console.error("Error extracting site visit data:", error);
    return null;
  }
}

/**
 * Generate recommended project specifications based on site visit requirements
 */
export function generateRecommendedProjects(mapping: SiteVisitQuotationMapping): QuotationGenerationRequest['selectedProjects'] {
  const recommendations: QuotationGenerationRequest['selectedProjects'] = [];
  
  for (const serviceType of mapping.serviceTypes) {
    const projectType = SERVICE_TYPE_MAPPING[serviceType];
    if (!projectType) continue;
    
    const defaultSpec = DEFAULT_SYSTEM_SPECS[projectType];
    let recommendedCapacity = defaultSpec.defaultCapacity;
    let customTitle = defaultSpec.title;
    
    // Customize based on requirements
    switch (projectType) {
      case 'on_grid':
      case 'off_grid':
      case 'hybrid':
        if (mapping.requirements.monthlyBill) {
          // Rough calculation: ₹1000/month ≈ 1kW system
          const estimatedCapacity = Math.ceil(mapping.requirements.monthlyBill / 1000);
          recommendedCapacity = `${Math.max(1, Math.min(10, estimatedCapacity))}kW`;
        }
        customTitle = `${recommendedCapacity} ${defaultSpec.title}`;
        break;
        
      case 'water_heater':
        if (mapping.requirements.dailyWaterUsage) {
          // Rough calculation: 100L per person per day
          const estimatedCapacity = Math.ceil(mapping.requirements.dailyWaterUsage / 100) * 100;
          recommendedCapacity = `${Math.max(100, Math.min(500, estimatedCapacity))}L`;
        }
        customTitle = `${recommendedCapacity} ${defaultSpec.title}`;
        break;
        
      case 'water_pump':
        if (mapping.requirements.pumpCapacity) {
          recommendedCapacity = mapping.requirements.pumpCapacity;
        }
        customTitle = `${recommendedCapacity} ${defaultSpec.title}`;
        break;
    }
    
    recommendations.push({
      projectType,
      systemCapacity: recommendedCapacity,
      customTitle,
      additionalRequirements: mapping.requirements.additionalRequirements
    });
  }
  
  return recommendations;
}

/**
 * Generate multiple quotations from site visit data
 */
export async function generateQuotationsFromSiteVisit(
  request: QuotationGenerationRequest
): Promise<QuotationGenerationResult> {
  const result: QuotationGenerationResult = {
    success: false,
    quotations: [],
    errors: [],
    summary: {
      totalGenerated: 0,
      totalFailed: 0,
      totalValue: 0,
      bulkDiscountApplied: 0
    }
  };
  
  try {
    // Extract site visit data
    const siteVisitMapping = await extractSiteVisitData(request.siteVisitId);
    if (!siteVisitMapping) {
      result.errors.push({ error: "Site visit not found or inaccessible" });
      return result;
    }
    
    // Get next quotation numbers
    const allQuotations = await storage.listQuotations();
    let lastNumber = allQuotations
      .map(q => q.quotationNumber)
      .filter(num => num && num.startsWith('Q-'))
      .map(num => parseInt(num.split('-')[1]) || 0)
      .reduce((max, current) => Math.max(max, current), 1050);
    
    // Calculate pricing for all projects together for bulk discounts
    const pricingInputs = request.selectedProjects.map(project => {
      const { capacityValue, capacityUnit } = normalizeCapacityForPricing(
        project.projectType, 
        project.systemCapacity
      );
      return {
        projectType: project.projectType,
        capacityValue,
        capacityUnit,
        systemCapacity: project.systemCapacity,
        includeSubsidy: request.includeSubsidy ?? true
      };
    });
    
    // Calculate total value for bulk discount
    const totalValue = pricingInputs.reduce((sum, input) => {
      const pricing = calculatePricing({
        ...input,
        customerProjectCount: 1,
        totalCustomerValue: 0
      });
      return sum + pricing.basePrice;
    }, 0);
    
    // Generate quotations with bulk pricing
    for (let i = 0; i < request.selectedProjects.length; i++) {
      try {
        const project = request.selectedProjects[i];
        const pricingInput = pricingInputs[i];
        
        // Normalize capacity for pricing
        const normalizedCapacity = normalizeCapacityForPricing(project.projectType, project.systemCapacity);
        
        // Calculate pricing with bulk discounts
        const pricingResult = calculatePricing({
          projectType: project.projectType,
          capacityValue: normalizedCapacity.capacityValue,
          capacityUnit: normalizedCapacity.capacityUnit,
          systemCapacity: project.systemCapacity,
          includeSubsidy: request.includeSubsidy ?? true,
          customerProjectCount: request.selectedProjects.length,
          totalCustomerValue: totalValue
        });
        
        // Generate Bill of Materials
        const bomData = generateBOM(project.projectType, project.systemCapacity);
        
        // Create quotation data with required fields
        const quotationData = {
          quotationNumber: `Q-${++lastNumber}`,
          customerId: siteVisitMapping.customerId,
          siteVisitId: request.siteVisitId,
          projectType: project.projectType,
          systemCapacity: project.systemCapacity,
          projectTitle: project.customTitle || normalizedCapacity.displayCapacity,
          capacityValue: normalizedCapacity.capacityValue,
          capacityUnit: getStandardizedUnit(normalizedCapacity.capacityUnit),
          financials: generateQuotationFinancials(pricingResult),
          createdBy: request.createdBy,
          status: 'draft' as const,
          notes: `Generated from site visit ${request.siteVisitId}. ${siteVisitMapping.notes || ''}\n\nSystem includes: ${bomData.totalComponents} components, ${bomData.systemCapacity} capacity`,
          billOfMaterials: bomData.components.map(comp => ({
            id: comp.id,
            name: comp.name,
            category: comp.category,
            quantity: comp.quantity,
            unit: comp.unit,
            unitPrice: comp.unitPrice,
            totalPrice: comp.totalPrice,
            specifications: comp.specifications,
            warranty: comp.warranty,
            make: comp.make || '',
            model: comp.model || ''
          })),
          warranties: [],
          paymentTerms: {
            advance: 90,
            onInstallation: 10,
            description: "90% advance, 10% on installation completion"
          },
          // Required fields with defaults
          deliveryPeriod: "2-3 weeks",
          companyScope: "Complete installation and commissioning of solar system",
          customerScope: "Provide site access and electrical connection point",
          templateData: {},
          generatedDocuments: []
        };
        
        // Create quotation
        const quotation = await storage.createQuotation(quotationData);
        result.quotations.push(quotation);
        result.summary.totalGenerated++;
        result.summary.totalValue += pricingResult.finalCustomerPayment;
        result.summary.bulkDiscountApplied += pricingResult.bulkDiscount;
        
      } catch (error) {
        result.errors.push({
          project: request.selectedProjects[i],
          error: error instanceof Error ? error.message : "Unknown error"
        });
        result.summary.totalFailed++;
      }
    }
    
    result.success = result.summary.totalGenerated > 0;
    return result;
    
  } catch (error) {
    result.errors.push({
      error: error instanceof Error ? error.message : "Failed to generate quotations"
    });
    return result;
  }
}

/**
 * Generate quotations with recommended specifications
 */
export async function generateRecommendedQuotations(
  siteVisitId: string,
  createdBy: string
): Promise<QuotationGenerationResult> {
  try {
    // Extract site visit data and generate recommendations
    const siteVisitMapping = await extractSiteVisitData(siteVisitId);
    if (!siteVisitMapping) {
      return {
        success: false,
        quotations: [],
        errors: [{ error: "Site visit not found" }],
        summary: { totalGenerated: 0, totalFailed: 1, totalValue: 0, bulkDiscountApplied: 0 }
      };
    }
    
    const recommendedProjects = generateRecommendedProjects(siteVisitMapping);
    
    if (recommendedProjects.length === 0) {
      return {
        success: false,
        quotations: [],
        errors: [{ error: "No valid service types found in site visit" }],
        summary: { totalGenerated: 0, totalFailed: 1, totalValue: 0, bulkDiscountApplied: 0 }
      };
    }
    
    // Generate quotations with recommendations
    return await generateQuotationsFromSiteVisit({
      siteVisitId,
      selectedProjects: recommendedProjects,
      createdBy,
      includeSubsidy: true
    });
    
  } catch (error) {
    return {
      success: false,
      quotations: [],
      errors: [{ error: error instanceof Error ? error.message : "Failed to generate recommended quotations" }],
      summary: { totalGenerated: 0, totalFailed: 1, totalValue: 0, bulkDiscountApplied: 0 }
    };
  }
}