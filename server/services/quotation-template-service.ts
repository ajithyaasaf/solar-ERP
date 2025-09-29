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

  // These will be generated dynamically from quotation data
  private static generateWarrantyDetails(quotation: any) {
    const warranty = quotation.detailedWarrantyTerms;
    const exclusions = quotation.physicalDamageExclusions;
    
    let details = [];
    
    // Physical damage exclusions
    if (exclusions?.enabled) {
      details.push(exclusions.disclaimerText);
    }
    
    // Solar panels warranty
    if (warranty?.solarPanels) {
      details.push("1. Solar (PV)Panel Modules (25 Years)");
      details.push(`   • ${warranty.solarPanels.manufacturingDefect}`);
      details.push(`   • ${warranty.solarPanels.serviceWarranty}`);
      warranty.solarPanels.performanceWarranty?.forEach((item: string) => {
        details.push(`   • ${item}`);
      });
    }
    
    // Inverter warranty
    if (warranty?.inverter) {
      details.push("2. Solar On grid Inverter (15Years)");
      details.push(`   • ${warranty.inverter.replacementWarranty}`);
      details.push(`   • ${warranty.inverter.serviceWarranty}`);
    }
    
    // Installation warranty
    if (warranty?.installation) {
      details.push("3. Installation");
      details.push(`   • ${warranty.installation.warrantyPeriod}`);
      details.push(`   • ${warranty.installation.serviceWarranty}`);
    }
    
    return details;
  }
  
  private static generateAccountDetails(quotation: any) {
    const account = quotation.accountDetails;
    if (!account) return null;
    
    return {
      name: account.accountHolderName || "Prakash Green Energy",
      bank: account.bankName || "State Bank of India",
      branch: account.branch || "Madurai Main Branch",
      accountNo: account.accountNumber || "31746205818",
      ifscCode: account.ifscCode || "SBIN0001766"
    };
  }

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

  private static generateDocumentRequirements(quotation: any) {
    const docs = quotation.documentRequirements;
    if (!docs) return null;
    
    return {
      list: docs.subsidyDocuments?.map((doc: string, index: number) => `${index + 1}) ${doc}`) || [],
      note: docs.note || "All Required Documents should be in the same name as mentioned in the EB Service Number."
    };
  }

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
   * Generate bill of materials based on project configuration using real site visit data
   */
  static generateBillOfMaterials(project: QuotationProject): BillOfMaterialsItem[] {
    const items: BillOfMaterialsItem[] = [];
    let slNo = 1;

    switch (project.projectType) {
      case 'on_grid':
        return this.generateOnGridBOM(project, slNo);
      case 'off_grid':
        return this.generateOffGridBOM(project, slNo);
      case 'hybrid':
        return this.generateHybridBOM(project, slNo);
      case 'water_heater':
        return this.generateWaterHeaterBOM(project, slNo);
      case 'water_pump':
        return this.generateWaterPumpBOM(project, slNo);
      default:
        return items;
    }
  }

  /**
   * Generate BOM for On-Grid solar systems
   */
  private static generateOnGridBOM(project: any, startSlNo: number): BillOfMaterialsItem[] {
    const items: BillOfMaterialsItem[] = [];
    let slNo = startSlNo;

    // Solar Panel - using real data
    items.push({
      slNo: slNo++,
      description: "Solar Panel",
      type: "Bifacial",
      volt: "24V",
      rating: `${project.panelWatts || '530'} WATTS`,
      make: project.solarPanelMake?.length > 0 ? project.solarPanelMake.join(' / ') : "Topsun / Rayzon",
      qty: project.panelCount || Math.ceil((project.systemKW || 3) * 1000 / parseInt(project.panelWatts || '530')),
      unit: "Nos"
    });

    // Structure - based on real structure type and height
    const structureType = project.structureType === 'gp_structure' ? 'GP Structure' : 
                         project.structureType === 'mono_rail' ? 'Mono Rail' : 'Module Mounting Structure';
    items.push({
      slNo: slNo++,
      description: `Structure Aluminium - ${structureType}`,
      type: "Module Mounting Structure",
      volt: "NA",
      rating: project.structureHeight ? `${project.structureHeight}ft Height` : "Standard Height",
      make: "Standard",
      qty: 1,
      unit: "Set"
    });

    // DC Cable - calculated based on system size
    const dcCableLength = this.calculateCableLength(project.systemKW || 3, 'DC');
    items.push({
      slNo: slNo++,
      description: "DC CABLE",
      type: "DC",
      volt: "1000V",
      rating: "4SQMM",
      make: "Polycab",
      qty: dcCableLength,
      unit: "MTR"
    });

    // AC Cable - calculated based on system size
    const acCableLength = this.calculateCableLength(project.systemKW || 3, 'AC');
    items.push({
      slNo: slNo++,
      description: "AC CABLE", 
      type: "AC",
      volt: "1000V",
      rating: "4SQMM",
      make: "Polycab",
      qty: acCableLength,
      unit: "MTR"
    });

    // Inverter - using real inverter data
    const inverterVoltage = project.inverterPhase === 'three_phase' ? '415V' : '230V';
    items.push({
      slNo: slNo++,
      description: "Grid Tie Inverter",
      type: "Grid Connected",
      volt: inverterVoltage,
      rating: `${project.inverterKW || project.systemKW || 3}KW`,
      make: project.inverterMake?.length > 0 ? project.inverterMake.join(' / ') : "As per MNRE LIST",
      qty: project.inverterQty || 1,
      unit: "Nos"
    });

    // Lightning Arrestor - only if specified
    if (project.lightningArrest) {
      items.push({
        slNo: slNo++,
        description: "Lightning Arrestor",
        type: "LA",
        volt: "1000V",
        rating: "40KA",
        make: "As per MNRE LIST",
        qty: 1,
        unit: "Set"
      });
    }

    // Earthing - using real earthing type
    const earthingType = project.earth === 'dc' ? 'DC Earthing' : 
                        project.earth === 'ac' ? 'AC Earthing' : 'Complete Earthing';
    items.push({
      slNo: slNo++,
      description: `Earthing - ${earthingType}`,
      type: "Complete",
      volt: "NA",
      rating: "1 Set",
      make: "As per MNRE LIST",
      qty: 1,
      unit: "Set"
    });

    // Generation Meter
    items.push({
      slNo: slNo++,
      description: "Generation Meter",
      type: "WHI WH_SPEM-Static Electronic",
      volt: project.inverterPhase === 'three_phase' ? 'Three Phase' : 'Single Phase',
      rating: "As per MNRE LIST",
      make: "As per MNRE LIST",
      qty: 1,
      unit: "Nos"
    });

    // Installation & Commissioning
    items.push({
      slNo: slNo++,
      description: "Installation & Commissioning",
      type: "MNRE Hand Manual and Specification",
      volt: "Service",
      rating: `${project.systemKW || 3}KW System`,
      make: "As per MNRE LIST",
      qty: 1,
      unit: "Nos"
    });

    return items;
  }

  /**
   * Generate common components shared across project types
   */
  private static generateCommonComponents(project: any, slNo: number): { items: BillOfMaterialsItem[], nextSlNo: number } {
    const items: BillOfMaterialsItem[] = [];
    let currentSlNo = slNo;

    // Solar Panel - using real data
    items.push({
      slNo: currentSlNo++,
      description: "Solar Panel",
      type: "Bifacial",
      volt: "24V",
      rating: `${project.panelWatts || '530'} WATTS`,
      make: project.solarPanelMake?.length > 0 ? project.solarPanelMake.join(' / ') : "Topsun / Rayzon",
      qty: project.panelCount || Math.ceil((project.systemKW || 3) * 1000 / parseInt(project.panelWatts || '530')),
      unit: "Nos"
    });

    // Structure - based on real structure type and height
    const structureType = project.structureType === 'gp_structure' ? 'GP Structure' : 
                         project.structureType === 'mono_rail' ? 'Mono Rail' : 'Module Mounting Structure';
    items.push({
      slNo: currentSlNo++,
      description: `Structure Aluminium - ${structureType}`,
      type: "Module Mounting Structure",
      volt: "NA",
      rating: project.structureHeight ? `${project.structureHeight}ft Height` : "Standard Height",
      make: "Standard",
      qty: 1,
      unit: "Set"
    });

    // DC Cable - calculated based on system size
    const dcCableLength = this.calculateCableLength(project.systemKW || 3, 'DC');
    items.push({
      slNo: currentSlNo++,
      description: "DC CABLE",
      type: "DC",
      volt: "1000V",
      rating: "4SQMM",
      make: "Polycab",
      qty: dcCableLength,
      unit: "MTR"
    });

    // AC Cable - calculated based on system size
    const acCableLength = this.calculateCableLength(project.systemKW || 3, 'AC');
    items.push({
      slNo: currentSlNo++,
      description: "AC CABLE", 
      type: "AC",
      volt: "1000V",
      rating: "4SQMM",
      make: "Polycab",
      qty: acCableLength,
      unit: "MTR"
    });

    // Lightning Arrestor - only if specified
    if (project.lightningArrest) {
      items.push({
        slNo: currentSlNo++,
        description: "Lightning Arrestor",
        type: "LA",
        volt: "1000V",
        rating: "40KA",
        make: "As per MNRE LIST",
        qty: 1,
        unit: "Set"
      });
    }

    // Earthing - using real earthing type
    const earthingType = project.earth === 'dc' ? 'DC Earthing' : 
                        project.earth === 'ac' ? 'AC Earthing' : 'Complete Earthing';
    items.push({
      slNo: currentSlNo++,
      description: `Earthing - ${earthingType}`,
      type: "Complete",
      volt: "NA",
      rating: "1 Set",
      make: "As per MNRE LIST",
      qty: 1,
      unit: "Set"
    });

    return { items, nextSlNo: currentSlNo };
  }

  /**
   * Generate BOM for Off-Grid solar systems
   */
  private static generateOffGridBOM(project: any, startSlNo: number): BillOfMaterialsItem[] {
    const items: BillOfMaterialsItem[] = [];
    let slNo = startSlNo;

    // Add common components (panels, structure, cables, earthing)
    const commonResult = this.generateCommonComponents(project, slNo);
    items.push(...commonResult.items);
    slNo = commonResult.nextSlNo;

    // Off-Grid Inverter - using real inverter data
    const inverterVoltage = project.inverterPhase === 'three_phase' ? '415V' : '230V';
    items.push({
      slNo: slNo++,
      description: "Off-Grid Inverter (PCU)",
      type: "Pure Sine Wave",
      volt: inverterVoltage,
      rating: `${project.inverterKW || project.systemKW || 3}KW`,
      make: project.inverterMake?.length > 0 ? project.inverterMake.join(' / ') : "As per MNRE LIST",
      qty: project.inverterQty || 1,
      unit: "Nos"
    });

    // Battery components - using real battery data
    items.push({
      slNo: slNo++,
      description: `${project.batteryBrand || 'Exide'} Battery`,
      type: project.batteryType || 'Lead Acid',
      volt: `${project.voltage || 12}V`,
      rating: `${project.batteryAH || '100'}AH`,
      make: project.batteryBrand || 'Exide',
      qty: project.batteryCount || 1,
      unit: "Nos"
    });

    // Battery Stand - if specified
    if (project.batteryStands) {
      const standQty = typeof project.batteryStands === 'string' ? parseInt(project.batteryStands) : project.batteryStands;
      items.push({
        slNo: slNo++,
        description: "Battery Stand",
        type: "Metal Stand",
        volt: "NA",
        rating: `For ${project.batteryCount || 1} Batteries`,
        make: "Standard",
        qty: standQty || 1,
        unit: "Nos"
      });
    }

    // Charge Controller
    items.push({
      slNo: slNo++,
      description: "Charge Controller",
      type: "MPPT",
      volt: `${project.voltage || 12}V`,
      rating: `${Math.ceil((project.systemKW || 3) * 1000 / (project.voltage || 12))}A`,
      make: "As per MNRE LIST",
      qty: 1,
      unit: "Nos"
    });

    // Installation & Commissioning
    items.push({
      slNo: slNo++,
      description: "Installation & Commissioning",
      type: "MNRE Hand Manual and Specification",
      volt: "Service",
      rating: `${project.systemKW || 3}KW Off-Grid System`,
      make: "As per MNRE LIST",
      qty: 1,
      unit: "Nos"
    });

    return items;
  }

  /**
   * Generate BOM for Hybrid solar systems
   */
  private static generateHybridBOM(project: any, startSlNo: number): BillOfMaterialsItem[] {
    const items: BillOfMaterialsItem[] = [];
    let slNo = startSlNo;

    // Add common components (panels, structure, cables, earthing)
    const commonResult = this.generateCommonComponents(project, slNo);
    items.push(...commonResult.items);
    slNo = commonResult.nextSlNo;

    // Hybrid Inverter - using real inverter data
    const inverterVoltage = project.inverterPhase === 'three_phase' ? '415V' : '230V';
    items.push({
      slNo: slNo++,
      description: "Hybrid Inverter",
      type: "Grid-Interactive with Battery Backup",
      volt: inverterVoltage,
      rating: `${project.inverterKW || project.systemKW || 3}KW`,
      make: project.inverterMake?.length > 0 ? project.inverterMake.join(' / ') : "As per MNRE LIST",
      qty: project.inverterQty || 1,
      unit: "Nos"
    });

    // Battery components - using real battery data
    items.push({
      slNo: slNo++,
      description: `${project.batteryBrand || 'Exide'} Battery`,
      type: project.batteryType || 'Lead Acid',
      volt: `${project.voltage || 12}V`,
      rating: `${project.batteryAH || '100'}AH`,
      make: project.batteryBrand || 'Exide',
      qty: project.batteryCount || 1,
      unit: "Nos"
    });

    // Battery Stand - if specified
    if (project.batteryStands) {
      const standQty = typeof project.batteryStands === 'string' ? parseInt(project.batteryStands) : project.batteryStands;
      items.push({
        slNo: slNo++,
        description: "Battery Stand",
        type: "Metal Stand",
        volt: "NA",
        rating: `For ${project.batteryCount || 1} Batteries`,
        make: "Standard",
        qty: standQty || 1,
        unit: "Nos"
      });
    }

    // Net Meter for grid interaction
    items.push({
      slNo: slNo++,
      description: "Net Meter",
      type: "Bi-directional Meter",
      volt: project.inverterPhase === 'three_phase' ? 'Three Phase' : 'Single Phase',
      rating: "As per MNRE LIST",
      make: "As per MNRE LIST",
      qty: 1,
      unit: "Nos"
    });

    // Installation & Commissioning
    items.push({
      slNo: slNo++,
      description: "Installation & Commissioning",
      type: "MNRE Hand Manual and Specification",
      volt: "Service",
      rating: `${project.systemKW || 3}KW Hybrid System`,
      make: "As per MNRE LIST",
      qty: 1,
      unit: "Nos"
    });

    return items;
  }

  /**
   * Generate BOM for Water Heater systems
   */
  private static generateWaterHeaterBOM(project: any, startSlNo: number): BillOfMaterialsItem[] {
    const items: BillOfMaterialsItem[] = [];
    let slNo = startSlNo;

    // Water Heater - using real specifications
    items.push({
      slNo: slNo++,
      description: `Solar Water Heater`,
      type: "FPC/ETC Type",
      volt: "NA",
      rating: `${project.litre || 100} Litres`,
      make: project.brand || "Standard",
      qty: 1,
      unit: "Nos"
    });

    // Heating Coil - if specified
    if (project.heatingCoil) {
      items.push({
        slNo: slNo++,
        description: "Heating Coil",
        type: "Electric Backup",
        volt: "230V",
        rating: project.heatingCoil,
        make: "Standard",
        qty: 1,
        unit: "Nos"
      });
    }

    // Installation components
    items.push({
      slNo: slNo++,
      description: "Plumbing Materials",
      type: "Complete Kit",
      volt: "NA",
      rating: "Standard",
      make: "Standard",
      qty: 1,
      unit: "Set"
    });

    items.push({
      slNo: slNo++,
      description: "Installation & Commissioning",
      type: "Water Heater Installation",
      volt: "Service",
      rating: `${project.litre || 100}L System`,
      make: "Standard",
      qty: 1,
      unit: "Nos"
    });

    return items;
  }

  /**
   * Generate BOM for Water Pump systems
   */
  private static generateWaterPumpBOM(project: any, startSlNo: number): BillOfMaterialsItem[] {
    const items: BillOfMaterialsItem[] = [];
    let slNo = startSlNo;

    // Solar Water Pump - using real specifications
    items.push({
      slNo: slNo++,
      description: `Solar Water Pump`,
      type: project.drive || "DC Drive",
      volt: "DC",
      rating: `${project.hp || '1'} HP`,
      make: "Standard",
      qty: 1,
      unit: "Nos"
    });

    // Solar Panels for pump - using real panel data
    if (project.panelCount && project.panelCount > 0) {
      items.push({
        slNo: slNo++,
        description: "Solar Panel for Pump",
        type: "Monocrystalline",
        volt: "24V",
        rating: project.solarPanel || "540 WATTS",
        make: project.panelBrand?.length > 0 ? project.panelBrand.join(' / ') : "Standard",
        qty: project.panelCount,
        unit: "Nos"
      });
    }

    // Pump Controller
    items.push({
      slNo: slNo++,
      description: "Pump Controller",
      type: "MPPT Controller",
      volt: "DC",
      rating: `For ${project.hp || '1'} HP Pump`,
      make: "Standard",
      qty: 1,
      unit: "Nos"
    });

    // Structure for panels
    if (project.panelCount && project.panelCount > 0) {
      const structureType = project.structureType === 'gp_structure' ? 'GP Structure' : 
                           project.structureType === 'mono_rail' ? 'Mono Rail' : 'Module Mounting Structure';
      items.push({
        slNo: slNo++,
        description: `Structure for Panels - ${structureType}`,
        type: "Panel Mounting Structure",
        volt: "NA",
        rating: project.structureHeight ? `${project.structureHeight}ft Height` : "Standard Height",
        make: "Standard",
        qty: 1,
        unit: "Set"
      });
    }

    // Installation & Commissioning
    items.push({
      slNo: slNo++,
      description: "Installation & Commissioning",
      type: "Pump System Installation",
      volt: "Service",
      rating: `${project.hp || '1'}HP Pump System`,
      make: "Standard",
      qty: 1,
      unit: "Nos"
    });

    return items;
  }

  /**
   * Calculate cable length based on system size and type
   */
  private static calculateCableLength(systemKW: number, cableType: 'DC' | 'AC'): number {
    if (cableType === 'DC') {
      // DC cable length increases with system size and panel distribution
      return Math.max(30, systemKW * 15); // Minimum 30m, 15m per kW
    } else {
      // AC cable length is typically shorter
      return Math.max(20, systemKW * 8); // Minimum 20m, 8m per kW
    }
  }

  /**
   * Calculate pricing breakdown with GST and subsidy for all project types using real data
   */
  static calculatePricingBreakdown(project: QuotationProject): any {
    const gstPercentage = 18;
    let description = "";
    let totalCostBeforeGST = 0;
    let subsidyAmount = 0;

    switch (project.projectType) {
      case 'on_grid':
        const kw = project.systemKW || project.inverterKW || 3;
        const ratePerKw = project.pricePerKW || 68000; // Use real price per kW
        totalCostBeforeGST = kw * ratePerKw;
        
        // Subsidy calculation - use actual subsidy amount if available
        subsidyAmount = project.subsidyAmount || (kw * 26000); // ₹26,000 per kW default
        
        description = `Supply and Installation of ${kw}kw Solar Grid Tie ${project.inverterPhase === 'three_phase' ? '3 Phase' : '1 Phase'} On GRID Solar System`;
        break;

      case 'off_grid':
        const offGridKw = project.systemKW || project.inverterKW || 3;
        const offGridRatePerKw = project.pricePerKW || 85000; // Off-grid typically costs more
        totalCostBeforeGST = offGridKw * offGridRatePerKw;
        
        // Off-grid usually has no government subsidy
        subsidyAmount = project.subsidyAmount || 0;
        
        description = `Supply and Installation of ${offGridKw}kw Solar Off-Grid System with ${project.batteryCount || 1} x ${project.batteryAH || 100}AH Battery`;
        break;

      case 'hybrid':
        const hybridKw = project.systemKW || project.inverterKW || 3;
        const hybridRatePerKw = project.pricePerKW || 95000; // Hybrid costs more than on-grid
        totalCostBeforeGST = hybridKw * hybridRatePerKw;
        
        // Hybrid may have partial subsidy
        subsidyAmount = project.subsidyAmount || (hybridKw * 15000); // Reduced subsidy for hybrid
        
        description = `Supply and Installation of ${hybridKw}kw Solar Hybrid System with ${project.batteryCount || 1} x ${project.batteryAH || 100}AH Battery`;
        break;

      case 'water_heater':
        const litres = project.litre || 100;
        const heaterRate = project.projectValue || (litres * 350); // ₹350 per litre
        totalCostBeforeGST = heaterRate;
        
        // Water heaters may have subsidy
        subsidyAmount = project.subsidyAmount || Math.min(heaterRate * 0.3, 20000); // 30% or max ₹20,000
        
        description = `Supply and Installation of ${litres}L Solar Water Heater - ${project.brand || 'Standard'} Brand`;
        break;

      case 'water_pump':
        const hp = project.hp || '1';
        const pumpRate = project.projectValue || (parseInt(hp) * 45000); // ₹45,000 per HP
        totalCostBeforeGST = pumpRate;
        
        // Water pumps may have agricultural subsidy
        subsidyAmount = project.subsidyAmount || (pumpRate * 0.4); // 40% subsidy for agriculture
        
        description = `Supply and Installation of ${hp}HP Solar Water Pump with ${project.panelCount || 4} Solar Panels`;
        break;

      default:
        return null;
    }

    const gstAmount = totalCostBeforeGST * (gstPercentage / 100);
    const totalCostWithGST = totalCostBeforeGST + gstAmount;
    const customerPayment = totalCostWithGST - subsidyAmount;

    // For projects with systemKW, calculate per kW rates - handle different project types
    let systemKW = 1;
    if (project.projectType === 'on_grid' || project.projectType === 'off_grid' || project.projectType === 'hybrid') {
      systemKW = project.systemKW || project.inverterKW || 1;
    }

    return {
      description,
      kw: project.projectType.includes('grid') || project.projectType === 'hybrid' ? systemKW : 1,
      ratePerKw: Math.round(totalCostBeforeGST / systemKW),
      gstPerKw: Math.round(gstAmount / systemKW),
      gstPercentage,
      valueWithGST: Math.round(totalCostWithGST),
      totalCost: Math.round(totalCostWithGST),
      subsidyAmount: Math.round(subsidyAmount),
      customerPayment: Math.round(customerPayment)
    };
  }

  /**
   * Generate complete quotation template
   */
  static generateQuotationTemplate(
    quotation: Quotation, 
    project: QuotationProject,
    customer: any,
    preparedByName?: string
  ): QuotationTemplate {
    const pricingBreakdown = this.calculatePricingBreakdown(project);
    const billOfMaterials = this.generateBillOfMaterials(project);
    
    // Generate dynamic quote validity based on quotation settings
    const validityDays = quotation.validUntil ? 
      Math.ceil((new Date(quotation.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 7;
    
    // Generate proper project type name for reference
    const projectTypeName = this.getProjectTypeDisplayName(project.projectType);
    
    // Generate dynamic content from quotation data
    const warrantyDetails = this.generateWarrantyDetails(quotation);
    const accountDetails = this.generateAccountDetails(quotation);
    const documentRequirements = this.generateDocumentRequirements(quotation);
    
    return {
      header: this.COMPANY_DETAILS,
      quotationNumber: quotation.quotationNumber || this.generateQuotationNumber(),
      quotationDate: new Date().toLocaleDateString('en-GB'),
      quoteRevision: quotation.documentVersion || 0,
      quoteValidity: `${validityDays} Days`,
      preparedBy: preparedByName || quotation.preparedBy || "SM",
      customer: {
        name: customer.name,
        address: customer.address,
        contactNumber: customer.mobile
      },
      reference: `${pricingBreakdown?.kw}kw ${projectTypeName} Solar Power Generation System`,
      pricingBreakdown,
      billOfMaterials,
      termsAndConditions: {
        warrantyDetails: warrantyDetails,
        paymentDetails: {
          advancePercentage: quotation.advancePaymentPercentage || 90,
          balancePercentage: 100 - (quotation.advancePaymentPercentage || 90),
          bankDetails: accountDetails
        },
        deliveryPeriod: this.getDeliveryTimeframeText(quotation.deliveryTimeframe)
      },
      scopeOfWork: this.SCOPE_OF_WORK,
      documentsRequiredForSubsidy: documentRequirements || {
        list: [
          "1) Aadhar Card",
          "2) EB Bill (Last 3 Months)",
          "3) House Tax Receipt",
          "4) Land Patta",
          "5) Building Plan Approval",
          "6) Fire NOC (for Commercial)",
          "7) Pollution NOC (for Commercial)", 
          "8) Bank Passbook",
          "9) Cancelled Cheque"
        ],
        note: "All Required Documents should be in the same name as mentioned in the EB Service Number."
      }
    };
  }

  /**
   * Get display name for project type
   */
  private static getProjectTypeDisplayName(projectType: string): string {
    switch (projectType) {
      case 'on_grid': return 'On-Grid';
      case 'off_grid': return 'Off-Grid';
      case 'hybrid': return 'Hybrid';
      case 'water_heater': return 'Water Heater';
      case 'water_pump': return 'Water Pump';
      default: return 'Solar';
    }
  }
  
  /**
   * Convert delivery timeframe enum to readable text
   */
  private static getDeliveryTimeframeText(timeframe: string | undefined): string {
    switch (timeframe) {
      case '1_2_weeks': return '1-2 Weeks from the date of confirmation of order';
      case '2_3_weeks': return '2-3 Weeks from the date of confirmation of order';
      case '3_4_weeks': return '3-4 Weeks from the date of confirmation of order';
      case '1_month': return '1 Month from the date of confirmation of order';
      case '2_months': return '2 Months from the date of confirmation of order';
      default: return '2-3 Weeks from the date of confirmation of order';
    }
  }
}