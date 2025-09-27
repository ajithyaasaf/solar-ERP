/**
 * Quotation Template Service
 * Generates professional quotations matching the exact reference format
 */

import { Quotation, QuotationProject } from "@shared/schema";

export interface CompanyDetails {
  name: string;
  logo: string;
  contact: {
    phone: string[];
    email: string;
    website: string;
    address: string;
  };
}

export interface BillOfMaterialsItem {
  slNo: number;
  description: string;
  type: string;
  volt: string;
  rating: string;
  make: string;
  qty: number;
  unit: string;
}

export interface QuotationTemplate {
  header: CompanyDetails;
  quotationNumber: string;
  quotationDate: string;
  quoteRevision: number;
  quoteValidity: string;
  preparedBy: string;
  customer: {
    name: string;
    address: string;
    contactNumber: string;
  };
  reference: string;
  pricingBreakdown: {
    description: string;
    kw: number;
    ratePerKw: number;
    gstPerKw: number;
    gstPercentage: number;
    valueWithGST: number;
    totalCost: number;
    subsidyAmount: number;
    customerPayment: number;
  };
  billOfMaterials: BillOfMaterialsItem[];
  termsAndConditions: {
    warrantyDetails: string[];
    solarInverterWarranty: string[];
    paymentDetails: {
      advancePercentage: number;
      balancePercentage: number;
      bankDetails: {
        name: string;
        bank: string;
        branch: string;
        accountNo: string;
        ifscCode: string;
      };
    };
    deliveryPeriod: string;
  };
  scopeOfWork: {
    structure: string[];
    netBiDirectionalMeter: string[];
    customerScope: {
      civilWork: string[];
      netBiDirectionalMeter: string[];
    };
  };
  documentsRequiredForSubsidy: {
    list: string[];
    note: string;
  };
}

export class QuotationTemplateService {
  private static readonly COMPANY_DETAILS: CompanyDetails = {
    name: "Prakash Greens Energy",
    logo: "/assets/company-logo.png",
    contact: {
      phone: ["6379049160", "9843577336", "8903465511"],
      email: "support@prakashgreenenergy.com",
      website: "www.prakashgreenenergy.com",
      address: "338 OPP SARVESH, Pankaj Complex, Besant Avenue Road, Adyar, Chennai - 600036, Madurai, Tamil Nadu, India - 625 011."
    }
  };

  private static readonly TERMS_AND_CONDITIONS = {
    warrantyDetails: [
      "***Physical Damage will not be Covered***",
      "1. Solar (PV)Panel Module (30 Years)",
      "   • 12 Years Manufacturing defect Warranty",
      "   • 25 Years Service Warranty",
      "   • 30% Power Output Warranty till the end of 25 Years",
      "   • 90% Performance Warranty till the end of 25 Years"
    ],
    solarInverterWarranty: [
      "2. Solar Inverter (Grid Tie)",
      "   • Replacement Warranty for 10 Years",
      "   • Service Warranty for 5 Years"
    ],
    paymentDetails: {
      advancePercentage: 90,
      balancePercentage: 10,
      bankDetails: {
        name: "Prakash Green Energy",
        bank: "ICICI",
        branch: "Subramaniapuram, Madurai",
        accountNo: "6156000140",
        ifscCode: "ICIC0006156"
      }
    },
    deliveryPeriod: "2-3 Weeks from the date of confirmation of order"
  };

  private static readonly SCOPE_OF_WORK = {
    structure: [
      "1) Structure:",
      "   • Foot For Solar South Pole 3 char consisting of lower and big Shift 4 feet",
      "   • & 3 feet of Higher over (1') Floor"
    ],
    netBiDirectionalMeter: [
      "2) Net (Bi-directional) Meter:",
      "   • We will take the responsibility of applying to EB as customer's expenses."
    ],
    customerScope: {
      civilWork: [
        "1) Civil work:",
        "   • Earth pit digging",
        "   • 1 Feet Chamber with concretes (For Structure)"
      ],
      netBiDirectionalMeter: [
        "2) Net (Bi-directional) Meter:",
        "   • Application and Installation charges for net meter to be paid by Customer."
      ]
    }
  };

  private static readonly DOCUMENTS_REQUIRED = {
    list: [
      "1) EB Number",
      "2) EB Register Mobile Number",
      "3) Aadhaar Card",
      "4) Pan Card", 
      "6) Passport Size Photo -1",
      "7) Property Tax Copy",
      "8) Bank Passbook",
      "9) Cancelled Cheque"
    ],
    note: "All Required Documents should be in the same name as mentions the EB Service Number."
  };

  /**
   * Generate quotation number in format Q-04-1052
   */
  static generateQuotationNumber(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sequence = Math.floor(Math.random() * 9999) + 1000; // Random 4-digit number
    return `Q-${month}-${sequence}`;
  }

  /**
   * Generate bill of materials based on project configuration
   */
  static generateBillOfMaterials(project: QuotationProject): BillOfMaterialsItem[] {
    const items: BillOfMaterialsItem[] = [];
    let slNo = 1;

    if (project.type === 'on_grid' && project.onGridConfig) {
      const config = project.onGridConfig;
      
      // Solar Panel
      items.push({
        slNo: slNo++,
        description: "Solar Panel",
        type: "Bifacial",
        volt: "24",
        rating: "540 WATTS",
        make: config.solarPanelMake || "Topsun / Rayzon",
        qty: config.panelCount || 24,
        unit: "Nos"
      });

      // Structure components
      items.push({
        slNo: slNo++,
        description: "Structure Aluminium",
        type: "Module Mounting Structure",
        volt: "NA",
        rating: "1",
        make: "Standard",
        qty: 1,
        unit: "Set"
      });

      // DC Cable
      items.push({
        slNo: slNo++,
        description: "DC CABLE",
        type: "DC",
        volt: "1000V",
        rating: "4SQMM",
        make: "Polycab",
        qty: 50,
        unit: "MTR"
      });

      // AC Cable  
      items.push({
        slNo: slNo++,
        description: "AC CABLE",
        type: "AC",
        volt: "1000V",
        rating: "4SQMM",
        make: "Polycab",
        qty: 30,
        unit: "MTR"
      });

      // Inverter
      items.push({
        slNo: slNo++,
        description: "Grid Tie Inverter",
        type: "Grid Connected",
        volt: "415V",
        rating: `${config.inverterKW}KW`,
        make: config.inverterMake || "As per MNRE LIST",
        qty: 1,
        unit: "Nos"
      });

      // Additional components
      items.push({
        slNo: slNo++,
        description: "Lightening Arrestor",
        type: "LA",
        volt: "1000V",
        rating: "40KA",
        make: "As per MNRE LIST",
        qty: 1,
        unit: "Set"
      });

      items.push({
        slNo: slNo++,
        description: "Earthing",
        type: "Complete",
        volt: "NA",
        rating: "1 Set",
        make: "As per MNRE LIST",
        qty: 1,
        unit: "Set"
      });

      items.push({
        slNo: slNo++,
        description: "Generation Meter",
        type: "WHI WH_SPEM-Static Electronic",
        volt: "Single Phase",
        rating: "As per MNRE LIST",
        make: "As per MNRE LIST",
        qty: 1,
        unit: "Nos"
      });

      items.push({
        slNo: slNo++,
        description: "Installation & Commissioning",
        type: "MNRE Hand Manual and Specification",
        volt: "Service",
        rating: "As per MNRE LIST",
        make: "As per MNRE LIST",
        qty: 1,
        unit: "Nos"
      });
    }

    return items;
  }

  /**
   * Calculate pricing breakdown with GST and subsidy
   */
  static calculatePricingBreakdown(project: QuotationProject): any {
    if (project.type === 'on_grid' && project.onGridConfig) {
      const config = project.onGridConfig;
      const kw = config.inverterKW || 3;
      const ratePerKw = 68000; // ₹68,000 per kW
      const gstPercentage = 18;
      
      const totalCostBeforeGST = kw * ratePerKw;
      const gstAmount = totalCostBeforeGST * (gstPercentage / 100);
      const totalCostWithGST = totalCostBeforeGST + gstAmount;
      
      // Subsidy calculation
      const subsidyPerKw = 26000; // ₹26,000 per kW
      const subsidyAmount = kw * subsidyPerKw;
      
      const customerPayment = totalCostWithGST - subsidyAmount;

      return {
        description: `Supply and Installation of ${kw}kw Solar Grid Tie 5kW Inverter 1 Phase On GRID Solar System`,
        kw,
        ratePerKw: totalCostBeforeGST / kw,
        gstPerKw: gstAmount / kw,
        gstPercentage,
        valueWithGST: totalCostWithGST,
        totalCost: totalCostWithGST,
        subsidyAmount,
        customerPayment
      };
    }

    return null;
  }

  /**
   * Generate complete quotation template
   */
  static generateQuotationTemplate(
    quotation: Quotation, 
    project: QuotationProject,
    customer: any
  ): QuotationTemplate {
    const pricingBreakdown = this.calculatePricingBreakdown(project);
    const billOfMaterials = this.generateBillOfMaterials(project);
    
    return {
      header: this.COMPANY_DETAILS,
      quotationNumber: quotation.quotationNumber || this.generateQuotationNumber(),
      quotationDate: new Date().toLocaleDateString('en-GB'),
      quoteRevision: 0,
      quoteValidity: "7 Days",
      preparedBy: "SM",
      customer: {
        name: customer.name,
        address: customer.address,
        contactNumber: customer.mobile
      },
      reference: `${pricingBreakdown?.kw}kw ${project.type.replace('_', '-')} Solar Power Generation System - Big`,
      pricingBreakdown,
      billOfMaterials,
      termsAndConditions: this.TERMS_AND_CONDITIONS,
      scopeOfWork: this.SCOPE_OF_WORK,
      documentsRequiredForSubsidy: this.DOCUMENTS_REQUIRED
    };
  }
}