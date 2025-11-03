/**
 * Quotation Template Service
 * Generates professional quotations with accurate BOM calculations
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
    basePrice: number;
    gstAmount: number;
    valueWithGST: number;
    totalCost: number;
    subsidyAmount: number;
    customerPayment: number;
  };
  bomSummary?: {
    phase: string;
    inverterKW?: number;
    inverterKVA?: string;
    panelWatts: number;
    batteryAH?: string;
    dcVolt?: number;
  };
  backupSolutions?: {
    backupWatts: number;
    usageWatts: number[];
    backupHours: number[];
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
    electricalWork: string[];
    plumbingWork: string[];
    customerScope: {
      civilWork: string[];
      netBiDirectionalMeter: string[];
      electricalWork: string[];
      plumbingWork: string[];
    };
  };
  documentsRequiredForSubsidy: {
    list: string[];
    note: string;
  };
}

export class QuotationTemplateService {
  private static readonly COMPANY_DETAILS: CompanyDetails = {
    name: "Prakash Green Energy",
    logo: "/assets/company-logo.png",
    contact: {
      phone: ["6374501500", "9585557516", "8925465011"],
      email: "support@prakashgreenenergy.com",
      website: "www.prakashgreenenergy.com",
      address: "338ECOP5D95228, Madurai, Tamilnadu, India - 625 011"
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
      details.push("2. Solar On grid Inverter (15 Years)");
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
      bank: account.bankName || "ICICI",
      branch: account.branch || "Sobramaniyapuram Madurai",
      accountNo: account.accountNumber || "067005013400",
      ifscCode: account.ifscCode || "ICIC0000670"
    };
  }

  /**
   * Generate dynamic scope of work based on project configuration
   */
  private static generateScopeOfWork(project: QuotationProject): {
    structure: string[];
    netBiDirectionalMeter: string[];
    electricalWork: string[];
    plumbingWork: string[];
    customerScope: {
      civilWork: string[];
      netBiDirectionalMeter: string[];
      electricalWork: string[];
      plumbingWork: string[];
    };
  } {
    const scopeOfWork: any = {
      structure: [],
      netBiDirectionalMeter: [],
      electricalWork: [],
      plumbingWork: [],
      customerScope: {
        civilWork: [],
        netBiDirectionalMeter: [],
        electricalWork: [],
        plumbingWork: []
      }
    };

    // Generate structure description based on structure type and heights
    const projectWithStructure = project as any;
    if (projectWithStructure.structureType) {
      let structureDesc = "1) Structure:";
      
      // Format structure type name
      let structureTypeName = '';
      switch (projectWithStructure.structureType) {
        case 'gp_structure':
          structureTypeName = 'GP Structure';
          break;
        case 'mono_rail':
          structureTypeName = 'Mono Rail';
          break;
        case 'gi_structure':
          structureTypeName = 'GI Structure';
          break;
        case 'gi_round_pipe':
          structureTypeName = 'GI Round Pipe';
          break;
        case 'ms_square_pipe':
          structureTypeName = 'MS Square Pipe';
          break;
        default:
          structureTypeName = projectWithStructure.structureType;
      }

      // Add structure type
      scopeOfWork.structure.push(structureDesc);
      
      // Add height details if applicable
      if (projectWithStructure.structureType === 'mono_rail' && projectWithStructure.monoRail) {
        const monoRailType = projectWithStructure.monoRail.type === 'mini_rail' ? 'Mini Rail' : 'Long Rail';
        scopeOfWork.structure.push(`   • ${structureTypeName} - ${monoRailType}, South facing slant mounting`);
      } else if (projectWithStructure.gpStructure) {
        const lowerHeight = projectWithStructure.gpStructure.lowerEndHeight || '0';
        const higherHeight = projectWithStructure.gpStructure.higherEndHeight || '0';
        scopeOfWork.structure.push(`   • ${structureTypeName}, South facing slant mounting of lower end height in ${lowerHeight} feet`);
        scopeOfWork.structure.push(`   • and higher end in ${higherHeight} feet`);
      } else {
        scopeOfWork.structure.push(`   • ${structureTypeName}, South facing slant mounting`);
      }
    }

    // Handle scope based on project type
    if (project.projectType === 'on_grid') {
      // Civil Work Scope
      const civilWorkScope = (project as any).civilWorkScope || 'customer_scope';
      if (civilWorkScope === 'company_scope') {
        scopeOfWork.structure.push("   • Civil work including earth pit construction (Company Scope)");
      } else {
        scopeOfWork.customerScope.civilWork.push("1) Civil work:");
        scopeOfWork.customerScope.civilWork.push("   • Earth pit Construction as per spec (for Structure)");
      }

      // Net Meter Scope
      const netMeterScope = (project as any).netMeterScope || 'customer_scope';
      if (netMeterScope === 'company_scope') {
        scopeOfWork.netBiDirectionalMeter.push("2) Net (Bi-directional) Meter:");
        scopeOfWork.netBiDirectionalMeter.push("   • We will take the responsibility of applying to EB and all charges (Company Scope)");
      } else {
        scopeOfWork.netBiDirectionalMeter.push("2) Net (Bi-directional) Meter:");
        scopeOfWork.netBiDirectionalMeter.push("   • We will take the responsibility of applying to EB at Customer's Expense");
        scopeOfWork.customerScope.netBiDirectionalMeter.push("2) Net (Bi-directional) Meter:");
        scopeOfWork.customerScope.netBiDirectionalMeter.push("   • Any registration and modification charges for net meter to be paid by Customer");
      }
    } else if (project.projectType === 'off_grid') {
      // Civil Work Scope
      const civilWorkScope = (project as any).civilWorkScope || 'customer_scope';
      if (civilWorkScope === 'company_scope') {
        scopeOfWork.structure.push("   • Civil work including earth pit construction (Company Scope)");
      } else {
        scopeOfWork.customerScope.civilWork.push("1) Civil work:");
        scopeOfWork.customerScope.civilWork.push("   • Earth pit Construction as per spec (for Structure)");
        scopeOfWork.customerScope.civilWork.push("   • Battery stand and inverter installation base to be provided by Customer");
      }
    } else if (project.projectType === 'hybrid') {
      // Electrical Work Scope
      const electricalWorkScope = (project as any).electricalWorkScope || 'customer_scope';
      if (electricalWorkScope === 'company_scope') {
        scopeOfWork.electricalWork.push("3) Electrical Work:");
        scopeOfWork.electricalWork.push("   • All electrical wiring and accessories (Company Scope)");
      } else {
        scopeOfWork.customerScope.electricalWork.push("3) Electrical Work:");
        scopeOfWork.customerScope.electricalWork.push("   • Basic electrical wiring to be provided by Customer");
      }

      // Net Meter Scope
      const netMeterScope = (project as any).netMeterScope || 'customer_scope';
      if (netMeterScope === 'company_scope') {
        scopeOfWork.netBiDirectionalMeter.push("2) Net (Bi-directional) Meter:");
        scopeOfWork.netBiDirectionalMeter.push("   • We will take the responsibility of applying to EB and all charges (Company Scope)");
      } else {
        scopeOfWork.netBiDirectionalMeter.push("2) Net (Bi-directional) Meter:");
        scopeOfWork.netBiDirectionalMeter.push("   • We will take the responsibility of applying to EB at Customer's Expense");
        scopeOfWork.customerScope.netBiDirectionalMeter.push("2) Net (Bi-directional) Meter:");
        scopeOfWork.customerScope.netBiDirectionalMeter.push("   • Any registration and modification charges for net meter to be paid by Customer");
      }
    } else if (project.projectType === 'water_pump') {
      // Plumbing Work Scope
      const plumbingWorkScope = (project as any).plumbingWorkScope || 'customer_scope';
      if (plumbingWorkScope === 'company_scope') {
        scopeOfWork.plumbingWork.push("2) Plumbing Work:");
        scopeOfWork.plumbingWork.push("   • All plumbing work including pipe fittings (Company Scope)");
      } else {
        scopeOfWork.customerScope.plumbingWork.push("2) Plumbing Work:");
        scopeOfWork.customerScope.plumbingWork.push("   • Plumbing connections and pipe work to be provided by Customer");
      }

      // Civil Work Scope
      const civilWorkScope = (project as any).civilWorkScope || 'customer_scope';
      if (civilWorkScope === 'company_scope') {
        scopeOfWork.structure.push("   • Civil work including foundation and mounting (Company Scope)");
      } else {
        scopeOfWork.customerScope.civilWork.push("1) Civil work:");
        scopeOfWork.customerScope.civilWork.push("   • Foundation and mounting base to be provided by Customer");
      }
    } else if (project.projectType === 'water_heater') {
      // Water heater typically has structure installation as company scope
      scopeOfWork.structure.push("   • Installation and mounting on roof/terrace (Company Scope)");
      scopeOfWork.structure.push("   • Piping work up to 15 feet included");
      
      scopeOfWork.customerScope.civilWork.push("1) Additional Work:");
      scopeOfWork.customerScope.civilWork.push("   • Any additional piping beyond 15 feet to be paid by Customer");
      scopeOfWork.customerScope.civilWork.push("   • Roof reinforcement if required to be done by Customer");
    }

    return scopeOfWork;
  }

  private static generateDocumentRequirements(quotation: any) {
    const docs = quotation.documentRequirements;
    if (!docs) return null;
    
    return {
      list: docs.subsidyDocuments?.map((doc: string, index: number) => `${index + 1}) ${doc}`) || [],
      note: docs.note || "*All Required Documents should be in the same name as mention EB Service Number"
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
   * Calculate actual kW from panel watts and panel count
   * Formula: (Panel Watts × Panel Count) / 1000
   * Returns precise kW value rounded to 2 decimal places (e.g., 3240W = 3.24kW)
   * This ensures accurate subsidy calculation based on kW ranges
   */
  static calculateSystemKW(panelWatts: string | number, panelCount: number): number {
    const watts = typeof panelWatts === 'string' ? parseInt(panelWatts) : panelWatts;
    const totalWatts = watts * panelCount;
    const kw = totalWatts / 1000;
    // Round to 2 decimal places for precision
    return Math.round(kw * 100) / 100;
  }

  /**
   * Format kW for display in quotation
   * <1 kW → show decimal (e.g., 0.68)
   * >= 1 kW → round to whole (e.g., 3.24 → 3)
   */
  static formatKWForDisplay(kw: number): string {
    if (kw < 1) {
      // For sub-1kW systems, show up to 2 decimal places, remove trailing zeros
      return kw.toFixed(2).replace(/\.?0+$/, '');
    }
    // For >= 1kW systems, round to whole number
    return Math.floor(kw).toString();
  }

  /**
   * Round system kW for rate calculations (matching frontend logic)
   * <1 kW → use actual decimal value (e.g., 0.68 → 0.68)
   * 1-3.5 kW → floor (e.g., 3.24 → 3)
   * >3.5 kW → ceil (e.g., 3.6 → 4)
   * This ensures rate per kW matches what user sees in the quotation form
   */
  static roundSystemKWForRateCalculation(actualKW: number): number {
    if (actualKW <= 0) return 0;
    if (actualKW < 1) return actualKW; // Use actual decimal value for sub-1kW systems
    return actualKW <= 3.5 ? Math.floor(actualKW) : Math.ceil(actualKW);
  }

  /**
   * Calculate backup solutions for off-grid and hybrid systems
   * Formula: Backup Watts = (Battery AH × 10 × Qty) - 3%
   * Then calculate backup hours for different usage scenarios
   */
  static calculateBackupSolutions(project: any): { 
    backupWatts: number; 
    usageWatts: number[]; 
    backupHours: number[] 
  } {
    const batteryAH = parseInt(project.batteryAH || '100');
    const batteryQty = project.batteryCount || 1;
    
    // Calculate backup watts: (AH × 10 × Qty) - 3% loss
    const baseWatts = batteryAH * 10 * batteryQty;
    const backupWatts = Math.round(baseWatts - (baseWatts * 0.03));
    
    // Use provided usage watts or defaults
    const usageWatts = project.backupSolutions?.usageWatts || [800, 750, 550, 450, 200];
    
    // Calculate backup hours for each usage watts
    const backupHours = usageWatts.map((usage: number) => 
      Math.round((backupWatts / usage) * 100) / 100
    );
    
    return { backupWatts, usageWatts, backupHours };
  }

  /**
   * Calculate subsidy based on kW, property type, and project type
   * Subsidy applies ONLY for residential properties with on_grid or hybrid projects
   * Up to 1 kW: ₹30,000
   * 1-2 kW: ₹60,000
   * 2-10 kW: ₹78,000
   * Above 10 kW: No subsidy
   */
  static calculateSubsidy(kw: number, propertyType: string, projectType: string): number {
    // Subsidy only applies to residential properties
    if (propertyType !== 'residential') {
      return 0;
    }

    // Only on_grid and hybrid projects get subsidy
    if (!['on_grid', 'hybrid'].includes(projectType)) {
      return 0;
    }

    // Range-based subsidy with proper range comparisons
    if (kw <= 1) {
      return 30000;
    } else if (kw > 1 && kw <= 2) {
      return 60000;
    } else if (kw > 2 && kw <= 10) {
      return 78000;
    } else {
      // Above 10 kW: No subsidy
      return 0;
    }
  }

  /**
   * Generate bill of materials based on project configuration using real site visit data
   */
  static generateBillOfMaterials(project: QuotationProject, propertyType?: string): BillOfMaterialsItem[] {
    const items: BillOfMaterialsItem[] = [];
    let slNo = 1;

    switch (project.projectType) {
      case 'on_grid':
        return this.generateOnGridBOM(project, slNo, propertyType);
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
   * Generate BOM for On-Grid solar systems with accurate calculations
   */
  private static generateOnGridBOM(project: any, startSlNo: number, propertyType?: string): BillOfMaterialsItem[] {
    const items: BillOfMaterialsItem[] = [];
    let slNo = startSlNo;

    // Calculate actual kW from panel data
    const calculatedKW = this.calculateSystemKW(project.panelWatts || 530, project.panelCount || 1);
    const inverterKW = project.inverterKW || calculatedKW;

    // 1. Solar Panel - Use panel type from form (default to Bifacial)
    const panelType = project.panelType === 'topcon' ? 'Topcon' : 
                      project.panelType === 'mono_perc' ? 'Mono-PERC' : 'Bifacial';
    
    items.push({
      slNo: slNo++,
      description: "Solar Panel (D)",
      type: panelType,
      volt: "24",
      rating: `${project.panelWatts || '530'} WATTS`,
      make: project.solarPanelMake?.length > 0 ? project.solarPanelMake.join(' / ') : "Gautam / Premier",
      qty: project.panelCount || 1,
      unit: "Nos"
    });

    // 2. Solar Ongrid Inverter - MPPT type, voltage based on phase
    const inverterVoltage = project.inverterPhase === 'three_phase' ? '415' : '230';
    items.push({
      slNo: slNo++,
      description: "Solar Ongrid Inverter",
      type: "MPPT",
      volt: inverterVoltage,
      rating: `${inverterKW}`,
      make: project.inverterMake?.length > 0 ? project.inverterMake.join(' / ') : "Growatt/Eastman/polycab",
      qty: project.inverterQty || 1,
      unit: "Nos"
    });

    // 3. Panel Mounting Structure - Type from structureType field
    const structureTypeMap: Record<string, string> = {
      'gp_structure': 'GI',
      'mono_rail': 'Aluminium',
      'gi_structure': 'GI',
      'gi_round_pipe': 'GI',
      'ms_square_pipe': 'MS'
    };
    const structureType = structureTypeMap[project.structureType || 'gp_structure'] || 'GI';
    
    items.push({
      slNo: slNo++,
      description: "Panel Mounting Structure",
      type: structureType,
      volt: "NA",
      rating: `${inverterKW}`,
      make: "Reputed",
      qty: project.inverterQty || 1,
      unit: "Set"
    });

    // 4. ACDB with MCB - Voltage based on inverter
    items.push({
      slNo: slNo++,
      description: "ACDB with MCB",
      type: "AC",
      volt: inverterVoltage,
      rating: `${inverterKW}`,
      make: "Reputed",
      qty: project.inverterQty || 1,
      unit: "Set"
    });

    // 5. DCDB with MCB - Always 600V
    items.push({
      slNo: slNo++,
      description: "DCDB with MCB",
      type: "DC",
      volt: "600",
      rating: `${inverterKW}`,
      make: "Reputed",
      qty: 1,
      unit: "Set"
    });

    // 6. DC Cable - Qty: 20m (40m if inverter >10 kW)
    const dcCableQty = inverterKW > 10 ? 40 : 20;
    items.push({
      slNo: slNo++,
      description: "DC CABLE",
      type: "DC",
      volt: "NA",
      rating: "4 SQ.MM",
      make: "Mardia/Polycab",
      qty: dcCableQty,
      unit: "Mtr"
    });

    // 7. AC Cable - Qty: 15m (30m if inverter >10 kW)
    const acCableQty = inverterKW > 10 ? 30 : 15;
    items.push({
      slNo: slNo++,
      description: "AC CABLE",
      type: "AC",
      volt: "NA",
      rating: "4 SQ.MM",
      make: "Mardia/Polycab",
      qty: acCableQty,
      unit: "Mtr"
    });

    // 8. Earthing - Add if earthing is selected
    if (project.earth && (typeof project.earth === 'string' || project.earth.length > 0)) {
      const earthType = structureType; // Use same type as structure
      
      // Determine earthing quantity based on AC/DC cable selection
      // Qty: 2 if both AC and DC are covered (either as 'ac_dc' or separate 'ac'+'dc')
      // Qty: 1 if only one type is selected
      let earthQty = 1;
      if (Array.isArray(project.earth)) {
        // Array format: check if 'ac_dc' is present OR both 'ac' and 'dc' are present
        if (project.earth.includes('ac_dc') || 
            (project.earth.includes('ac') && project.earth.includes('dc'))) {
          earthQty = 2;
        }
      } else if (typeof project.earth === 'string') {
        // Single string format (legacy): 'ac_dc' means both
        earthQty = project.earth === 'ac_dc' ? 2 : 1;
      }
      
      items.push({
        slNo: slNo++,
        description: "Earthing",
        type: earthType,
        volt: "NA",
        rating: "3 Feet",
        make: "As per MNRE App",
        qty: earthQty,
        unit: "Set"
      });
    }

    // 9. Lightning Arrestor - Add only if selected in form
    if (project.lightningArrest) {
      items.push({
        slNo: slNo++,
        description: "Lighting Arrestor",
        type: structureType,
        volt: "NA",
        rating: "3",
        make: "As per MNRE App",
        qty: 1,
        unit: "Feet"
      });
    }

    // 10. Electrical Accessories - Add only if selected in form
    if (project.electricalAccessories) {
      items.push({
        slNo: slNo++,
        description: "Electrical Accessories",
        type: "NA",
        volt: "NA",
        rating: "3",
        make: "As per MNRE App",
        qty: project.electricalCount || project.inverterKW || 1,
        unit: "KW"
      });
    }

    // 11. BOS (PVC pipe/Hose/etc) - Always included
    items.push({
      slNo: slNo++,
      description: "BOS (PVC pipe/Hose/etc)",
      type: "As Site Requirement",
      volt: "-",
      rating: "-",
      make: "As per MNRE App",
      qty: 1,
      unit: "Set"
    });

    // 12. Installation & Commissioning - Always included
    items.push({
      slNo: slNo++,
      description: "Installation & Commissioning",
      type: "With Well trained and Experienced Persons",
      volt: "-",
      rating: "-",
      make: "As per MNRE App",
      qty: 1,
      unit: "Nos"
    });

    return items;
  }

  /**
   * Generate BOM for Off-Grid solar systems
   */
  private static generateOffGridBOM(project: any, startSlNo: number): BillOfMaterialsItem[] {
    const items: BillOfMaterialsItem[] = [];
    let slNo = startSlNo;

    const calculatedKW = this.calculateSystemKW(project.panelWatts || 530, project.panelCount || 1);
    const inverterKW = project.inverterKW || calculatedKW;

    // Solar Panel
    const panelType = project.panelType === 'topcon' ? 'Topcon' : 
                      project.panelType === 'mono_perc' ? 'Mono-PERC' : 'Bifacial';
    items.push({
      slNo: slNo++,
      description: "Solar Panel",
      type: panelType,
      volt: "24V",
      rating: `${project.panelWatts || '530'} WATTS`,
      make: project.solarPanelMake?.length > 0 ? project.solarPanelMake.join(' / ') : "Topsun / Rayzon",
      qty: project.panelCount || 1,
      unit: "Nos"
    });

    // Structure
    const structureTypeMap: Record<string, string> = {
      'gp_structure': 'GP Structure',
      'mono_rail': 'Mono Rail',
      'gi_structure': 'GI Structure',
      'gi_round_pipe': 'GI Round Pipe',
      'ms_square_pipe': 'MS Square Pipe'
    };
    const structureType = structureTypeMap[project.structureType || 'gp_structure'] || 'Module Mounting Structure';
    
    items.push({
      slNo: slNo++,
      description: `Structure Aluminium - ${structureType}`,
      type: "Module Mounting Structure",
      volt: "NA",
      rating: "Standard Height",
      make: "Standard",
      qty: 1,
      unit: "Set"
    });

    // DC Cable
    const dcCableQty = inverterKW > 10 ? 40 : 20;
    items.push({
      slNo: slNo++,
      description: "DC CABLE",
      type: "DC",
      volt: "1000V",
      rating: "4SQMM",
      make: "Polycab",
      qty: dcCableQty,
      unit: "MTR"
    });

    // AC Cable
    const acCableQty = inverterKW > 10 ? 30 : 15;
    items.push({
      slNo: slNo++,
      description: "AC CABLE", 
      type: "AC",
      volt: "1000V",
      rating: "4SQMM",
      make: "Polycab",
      qty: acCableQty,
      unit: "MTR"
    });

    // Off-Grid Inverter
    const inverterVoltage = project.inverterVolt 
      ? `${project.inverterVolt}V` 
      : (project.inverterPhase === 'three_phase' ? '415V' : '230V');
    const inverterKVA = (project as any).inverterKVA || inverterKW;
    items.push({
      slNo: slNo++,
      description: "Off-Grid Inverter (PCU)",
      type: "Pure Sine Wave",
      volt: inverterVoltage,
      rating: `${inverterKVA} KVA`,
      make: project.inverterMake?.length > 0 ? project.inverterMake.join(' / ') : "As per MNRE LIST",
      qty: project.inverterQty || 1,
      unit: "Nos"
    });

    // Battery - Map battery type to short code
    const batteryTypeMap: Record<string, string> = {
      'lead_acid': 'LA',
      'lithium': 'Li-ion'
    };
    const batteryTypeCode = project.batteryType ? batteryTypeMap[project.batteryType] || project.batteryType : 'LA';
    items.push({
      slNo: slNo++,
      description: `${project.batteryBrand || 'Exide'} Battery`,
      type: batteryTypeCode,
      volt: `${project.voltage || 12}V`,
      rating: `${project.batteryAH || '100'} AH`,
      make: project.batteryBrand || 'Exide',
      qty: project.batteryCount || 1,
      unit: "Nos"
    });

    // Battery Stand
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

    // Lightning Arrestor
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

    // Earthing
    if (project.earth && (typeof project.earth === 'string' || project.earth.length > 0)) {
      // Determine earthing type and quantity
      let earthingType = 'Complete Earthing';
      let earthQty = 1;
      
      if (Array.isArray(project.earth)) {
        // Array format: check if 'ac_dc' is present OR both 'ac' and 'dc' are present
        if (project.earth.includes('ac_dc') || 
            (project.earth.includes('ac') && project.earth.includes('dc'))) {
          earthingType = 'Complete Earthing (AC/DC)';
          earthQty = 2;
        } else if (project.earth.includes('dc')) {
          earthingType = 'DC Earthing';
        } else if (project.earth.includes('ac')) {
          earthingType = 'AC Earthing';
        }
      } else if (typeof project.earth === 'string') {
        // Legacy string format
        if (project.earth === 'ac_dc') {
          earthingType = 'Complete Earthing (AC/DC)';
          earthQty = 2;
        } else if (project.earth === 'dc') {
          earthingType = 'DC Earthing';
        } else if (project.earth === 'ac') {
          earthingType = 'AC Earthing';
        }
      }
      
      items.push({
        slNo: slNo++,
        description: `Earthing - ${earthingType}`,
        type: "Complete",
        volt: "NA",
        rating: "1 Set",
        make: "As per MNRE LIST",
        qty: earthQty,
        unit: "Set"
      });
    }

    // Electrical Accessories - Add only if selected in form
    if (project.electricalAccessories) {
      items.push({
        slNo: slNo++,
        description: "Electrical Accessories",
        type: "NA",
        volt: "NA",
        rating: "3",
        make: "As per MNRE App",
        qty: project.electricalCount || project.inverterKW || 1,
        unit: "KW"
      });
    }

    // Charge Controller
    items.push({
      slNo: slNo++,
      description: "Charge Controller",
      type: "MPPT",
      volt: `${project.voltage || 12}V`,
      rating: `${Math.ceil(calculatedKW * 1000 / (project.voltage || 12))}A`,
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
      rating: `${calculatedKW}KW Off-Grid System`,
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

    const calculatedKW = this.calculateSystemKW(project.panelWatts || 530, project.panelCount || 1);
    const inverterKW = project.inverterKW || calculatedKW;

    // Solar Panel
    const panelType = project.panelType === 'topcon' ? 'Topcon' : 
                      project.panelType === 'mono_perc' ? 'Mono-PERC' : 'Bifacial';
    items.push({
      slNo: slNo++,
      description: "Solar Panel",
      type: panelType,
      volt: "24V",
      rating: `${project.panelWatts || '530'} WATTS`,
      make: project.solarPanelMake?.length > 0 ? project.solarPanelMake.join(' / ') : "Topsun / Rayzon",
      qty: project.panelCount || 1,
      unit: "Nos"
    });

    // Structure
    const structureTypeMap: Record<string, string> = {
      'gp_structure': 'GP Structure',
      'mono_rail': 'Mono Rail',
      'gi_structure': 'GI Structure',
      'gi_round_pipe': 'GI Round Pipe',
      'ms_square_pipe': 'MS Square Pipe'
    };
    const structureType = structureTypeMap[project.structureType || 'gp_structure'] || 'Module Mounting Structure';
    
    items.push({
      slNo: slNo++,
      description: `Structure Aluminium - ${structureType}`,
      type: "Module Mounting Structure",
      volt: "NA",
      rating: "Standard Height",
      make: "Standard",
      qty: 1,
      unit: "Set"
    });

    // DC Cable
    const dcCableQty = inverterKW > 10 ? 40 : 20;
    items.push({
      slNo: slNo++,
      description: "DC CABLE",
      type: "DC",
      volt: "1000V",
      rating: "4SQMM",
      make: "Polycab",
      qty: dcCableQty,
      unit: "MTR"
    });

    // AC Cable
    const acCableQty = inverterKW > 10 ? 30 : 15;
    items.push({
      slNo: slNo++,
      description: "AC CABLE", 
      type: "AC",
      volt: "1000V",
      rating: "4SQMM",
      make: "Polycab",
      qty: acCableQty,
      unit: "MTR"
    });

    // Hybrid Inverter
    const inverterVoltage = project.inverterVolt 
      ? `${project.inverterVolt}V` 
      : (project.inverterPhase === 'three_phase' ? '415V' : '230V');
    const inverterKVA = (project as any).inverterKVA || inverterKW;
    items.push({
      slNo: slNo++,
      description: "Hybrid Inverter",
      type: "Grid-Interactive with Battery Backup",
      volt: inverterVoltage,
      rating: `${inverterKVA} KVA`,
      make: project.inverterMake?.length > 0 ? project.inverterMake.join(' / ') : "As per MNRE LIST",
      qty: project.inverterQty || 1,
      unit: "Nos"
    });

    // Battery - Map battery type to short code
    const batteryTypeMap: Record<string, string> = {
      'lead_acid': 'LA',
      'lithium': 'Li-ion'
    };
    const batteryTypeCode = project.batteryType ? batteryTypeMap[project.batteryType] || project.batteryType : 'LA';
    items.push({
      slNo: slNo++,
      description: `${project.batteryBrand || 'Exide'} Battery`,
      type: batteryTypeCode,
      volt: `${project.voltage || 12}V`,
      rating: `${project.batteryAH || '100'} AH`,
      make: project.batteryBrand || 'Exide',
      qty: project.batteryCount || 1,
      unit: "Nos"
    });

    // Battery Stand
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

    // Lightning Arrestor
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

    // Earthing
    if (project.earth && (typeof project.earth === 'string' || project.earth.length > 0)) {
      // Determine earthing type and quantity
      let earthingType = 'Complete Earthing';
      let earthQty = 1;
      
      if (Array.isArray(project.earth)) {
        // Array format: check if 'ac_dc' is present OR both 'ac' and 'dc' are present
        if (project.earth.includes('ac_dc') || 
            (project.earth.includes('ac') && project.earth.includes('dc'))) {
          earthingType = 'Complete Earthing (AC/DC)';
          earthQty = 2;
        } else if (project.earth.includes('dc')) {
          earthingType = 'DC Earthing';
        } else if (project.earth.includes('ac')) {
          earthingType = 'AC Earthing';
        }
      } else if (typeof project.earth === 'string') {
        // Legacy string format
        if (project.earth === 'ac_dc') {
          earthingType = 'Complete Earthing (AC/DC)';
          earthQty = 2;
        } else if (project.earth === 'dc') {
          earthingType = 'DC Earthing';
        } else if (project.earth === 'ac') {
          earthingType = 'AC Earthing';
        }
      }
      
      items.push({
        slNo: slNo++,
        description: `Earthing - ${earthingType}`,
        type: "Complete",
        volt: "NA",
        rating: "1 Set",
        make: "As per MNRE LIST",
        qty: earthQty,
        unit: "Set"
      });
    }

    // Electrical Accessories - Add only if selected in form
    if (project.electricalAccessories) {
      items.push({
        slNo: slNo++,
        description: "Electrical Accessories",
        type: "NA",
        volt: "NA",
        rating: "3",
        make: "As per MNRE App",
        qty: project.electricalCount || project.inverterKW || 1,
        unit: "KW"
      });
    }

    // Net Meter
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
      rating: `${calculatedKW}KW Hybrid System`,
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

    // Water Heater
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

    // Heating Coil
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

    // Plumbing Materials
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

    // Installation
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

    // Solar Water Pump
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

    // Solar Panels for pump
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
      const structureTypeMap: Record<string, string> = {
        'gp_structure': 'GP Structure',
        'mono_rail': 'Mono Rail',
        'gi_structure': 'GI Structure',
        'gi_round_pipe': 'GI Round Pipe',
        'ms_square_pipe': 'MS Square Pipe'
      };
      const structureType = structureTypeMap[project.structureType || 'gp_structure'] || 'Module Mounting Structure';
      
      items.push({
        slNo: slNo++,
        description: `Structure for Panels - ${structureType}`,
        type: "Panel Mounting Structure",
        volt: "NA",
        rating: "Standard Height",
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
   * Calculate pricing breakdown with proper GST and subsidy
   * NEW FORMULA (projectValue is total including GST):
   *          Total with GST = projectValue (user input)
   *          Base Price = projectValue / (1 + GST%)
   *          GST = projectValue - Base Price
   *          Subsidy = Based on kW and property type (residential only)
   *          Customer Payment = Total - Subsidy
   */
  static calculatePricingBreakdown(project: QuotationProject, propertyType?: string, gstPercentage?: number): any {
    let description = "";
    let kw = 1;
    let ratePerKw = 0;
    let basePrice = 0;
    let totalWithGST = 0;
    let gstAmount = 0;

    // Use project's GST percentage if available, otherwise use parameter or default
    const actualGstPercentage = (project as any).gstPercentage || gstPercentage || 18;

    switch (project.projectType) {
      case 'on_grid':
        // Calculate actual kW from panel data (for subsidy calculation)
        kw = this.calculateSystemKW(project.panelWatts || 530, project.panelCount || 1);
        
        // Use project values if available (from frontend calculation)
        if ((project as any).basePrice && (project as any).gstAmount) {
          basePrice = (project as any).basePrice;
          gstAmount = (project as any).gstAmount;
          totalWithGST = project.projectValue;
        } else {
          // Fallback: calculate from scratch using pricePerKW or default
          const fallbackRatePerKw = project.pricePerKW || 68000;
          totalWithGST = project.projectValue || (fallbackRatePerKw * kw * (1 + actualGstPercentage / 100));
          basePrice = Math.round(totalWithGST / (1 + actualGstPercentage / 100));
          gstAmount = totalWithGST - basePrice;
        }
        
        // FIXED: Use rounded kW for rate calculation (matching frontend logic)
        const roundedKW_onGrid = this.roundSystemKWForRateCalculation(kw);
        ratePerKw = roundedKW_onGrid > 0 ? basePrice / roundedKW_onGrid : 0;
        
        description = `Supply and Installation of ${Math.floor(kw)} kW Solar Grid Tie ${project.inverterPhase === 'three_phase' ? '3 Phase' : '1 Phase'} On GRID Solar System`;
        break;

      case 'off_grid':
        // Calculate actual kW from panel data (for subsidy calculation)
        kw = this.calculateSystemKW(project.panelWatts || 530, project.panelCount || 1);
        
        // Use project values if available (from frontend calculation)
        if ((project as any).basePrice && (project as any).gstAmount) {
          basePrice = (project as any).basePrice;
          gstAmount = (project as any).gstAmount;
          totalWithGST = project.projectValue;
        } else {
          // Fallback: calculate from scratch using pricePerKW or default
          const fallbackRatePerKw = project.pricePerKW || 85000;
          totalWithGST = project.projectValue || (fallbackRatePerKw * kw * (1 + actualGstPercentage / 100));
          basePrice = Math.round(totalWithGST / (1 + actualGstPercentage / 100));
          gstAmount = totalWithGST - basePrice;
        }
        
        // FIXED: Use rounded kW for rate calculation (matching frontend logic)
        const roundedKW_offGrid = this.roundSystemKWForRateCalculation(kw);
        ratePerKw = roundedKW_offGrid > 0 ? basePrice / roundedKW_offGrid : 0;
        
        // Dynamic description based on actual configuration
        const panelWatts_offGrid = project.panelWatts || '530';
        const panelCount_offGrid = project.panelCount || 1;
        const inverterKVA_offGrid = (project as any).inverterKVA || project.inverterKW || '1';
        const batteryVolt_offGrid = project.voltage || 12;
        const batteryAH_offGrid = project.batteryAH || '100';
        const batteryCount_offGrid = project.batteryCount || 1;
        const phase_offGrid = project.inverterPhase === 'three_phase' ? '3' : '1';
        
        description = `Supply and Installation of ${panelWatts_offGrid}W X ${panelCount_offGrid} Nos Panel, ${inverterKVA_offGrid}KVA/${batteryVolt_offGrid}v ${phase_offGrid}PH MPPT Inverter, ${batteryAH_offGrid}AH X ${batteryCount_offGrid}, ${phase_offGrid}-Phase Offgrid Solar System`;
        break;

      case 'hybrid':
        // Calculate actual kW from panel data (for subsidy calculation)
        kw = this.calculateSystemKW(project.panelWatts || 530, project.panelCount || 1);
        
        // Use project values if available (from frontend calculation)
        if ((project as any).basePrice && (project as any).gstAmount) {
          basePrice = (project as any).basePrice;
          gstAmount = (project as any).gstAmount;
          totalWithGST = project.projectValue;
        } else {
          // Fallback: calculate from scratch using pricePerKW or default
          const fallbackRatePerKw = project.pricePerKW || 95000;
          totalWithGST = project.projectValue || (fallbackRatePerKw * kw * (1 + actualGstPercentage / 100));
          basePrice = Math.round(totalWithGST / (1 + actualGstPercentage / 100));
          gstAmount = totalWithGST - basePrice;
        }
        
        // FIXED: Use rounded kW for rate calculation (matching frontend logic)
        const roundedKW_hybrid = this.roundSystemKWForRateCalculation(kw);
        ratePerKw = roundedKW_hybrid > 0 ? basePrice / roundedKW_hybrid : 0;
        
        // Dynamic description based on actual configuration
        const panelWatts_hybrid = project.panelWatts || '530';
        const panelCount_hybrid = project.panelCount || 1;
        const inverterKVA_hybrid = (project as any).inverterKVA || project.inverterKW || '1';
        const batteryVolt_hybrid = project.voltage || 12;
        const batteryAH_hybrid = project.batteryAH || '100';
        const batteryCount_hybrid = project.batteryCount || 1;
        const phase_hybrid = project.inverterPhase === 'three_phase' ? '3' : '1';
        
        description = `Supply and Installation of ${panelWatts_hybrid}W X ${panelCount_hybrid} Nos Panel, ${inverterKVA_hybrid}KVA/${batteryVolt_hybrid}v ${phase_hybrid}PH MPPT Inverter, ${batteryAH_hybrid}AH X ${batteryCount_hybrid}, ${phase_hybrid}-Phase Hybrid Solar System`;
        break;

      case 'water_heater':
        const litres = project.litre || 100;
        
        // Use project values if available (from frontend calculation)
        if ((project as any).basePrice && (project as any).gstAmount) {
          basePrice = (project as any).basePrice;
          gstAmount = (project as any).gstAmount;
          totalWithGST = project.projectValue;
        } else {
          // Fallback: projectValue is total including GST
          totalWithGST = project.projectValue || (litres * 350 * (1 + actualGstPercentage / 100));
          basePrice = Math.round(totalWithGST / (1 + actualGstPercentage / 100));
          gstAmount = totalWithGST - basePrice;
        }
        
        // For water heater, rate per kW is same as base price (no kW calculation)
        ratePerKw = basePrice;
        kw = 1; // Set kw to 1 for water heater to avoid division by zero
        description = `Supply and Installation of ${litres}L Solar Water Heater - ${project.brand || 'Standard'} Brand`;
        break;

      case 'water_pump':
        const hp = project.hp || '1';
        
        // Use project values if available (from frontend calculation)
        if ((project as any).basePrice && (project as any).gstAmount) {
          basePrice = (project as any).basePrice;
          gstAmount = (project as any).gstAmount;
          totalWithGST = project.projectValue;
        } else {
          // Fallback: projectValue is total including GST
          totalWithGST = project.projectValue || (parseInt(hp) * 45000 * (1 + actualGstPercentage / 100));
          basePrice = Math.round(totalWithGST / (1 + actualGstPercentage / 100));
          gstAmount = totalWithGST - basePrice;
        }
        
        // For water pump, rate per kW is same as base price (no kW calculation)
        ratePerKw = basePrice;
        kw = 1; // Set kw to 1 for water pump to avoid division by zero
        description = `Supply and Installation of ${hp}HP Solar Water Pump with ${project.panelCount || 4} Solar Panels`;
        break;

      default:
        return null;
    }
    
    // Calculate subsidy (only for residential properties with on_grid or hybrid projects)
    const subsidyAmount = this.calculateSubsidy(kw, propertyType || '', project.projectType);
    
    // Calculate customer payment
    const customerPayment = totalWithGST - subsidyAmount;

    // Calculate GST per kW using rounded kW for solar projects (matching rate calculation logic)
    let gstPerKw = 0;
    if (['on_grid', 'off_grid', 'hybrid'].includes(project.projectType)) {
      const roundedKW_forGST = this.roundSystemKWForRateCalculation(kw);
      gstPerKw = roundedKW_forGST > 0 ? Math.round(gstAmount / roundedKW_forGST) : 0;
    } else {
      // For non-solar projects, just use the kw value (which is set to 1)
      gstPerKw = kw > 0 ? Math.round(gstAmount / kw) : 0;
    }

    return {
      description,
      kw,
      ratePerKw: Math.round(ratePerKw),
      gstPerKw,
      gstPercentage: actualGstPercentage,
      basePrice: Math.round(basePrice),
      gstAmount: Math.round(gstAmount),
      valueWithGST: Math.round(totalWithGST),
      totalCost: Math.round(totalWithGST),
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
    const pricingBreakdown = this.calculatePricingBreakdown(project, customer.propertyType);
    const billOfMaterials = this.generateBillOfMaterials(project, customer.propertyType);
    
    // Generate dynamic quote validity based on quotation settings
    const validityDays = quotation.validUntil ? 
      Math.ceil((new Date(quotation.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 7;
    
    // Generate proper project type name for reference
    const projectTypeName = this.getProjectTypeDisplayName(project.projectType);
    
    // Generate dynamic content from quotation data
    const warrantyDetails = this.generateWarrantyDetails(quotation);
    const accountDetails = this.generateAccountDetails(quotation);
    const documentRequirements = this.generateDocumentRequirements(quotation);
    
    // Generate BOM summary based on project type
    let bomSummary: { 
      phase: string; 
      inverterKW?: number; 
      inverterKVA?: string;
      panelWatts: number;
      batteryAH?: string;
      dcVolt?: number;
    } | undefined = undefined;
    
    let backupSolutions: { 
      backupWatts: number; 
      usageWatts: number[]; 
      backupHours: number[] 
    } | undefined = undefined;
    
    if (project.projectType === 'on_grid') {
      const calculatedKW = this.calculateSystemKW((project as any).panelWatts || 530, (project as any).panelCount || 1);
      const inverterKW = (project as any).inverterKW || calculatedKW;
      const phase = (project as any).inverterPhase === 'three_phase' ? '3' : '1';
      const totalPanelWatts = parseInt((project as any).panelWatts || '530') * ((project as any).panelCount || 1);
      
      bomSummary = {
        phase,
        inverterKW,
        panelWatts: totalPanelWatts
      };
    } else if (project.projectType === 'off_grid' || project.projectType === 'hybrid') {
      const phase = (project as any).inverterPhase === 'three_phase' ? '3' : '1';
      const inverterKVA = (project as any).inverterKVA || (project as any).inverterKW || '1';
      const totalPanelWatts = parseInt((project as any).panelWatts || '530') * ((project as any).panelCount || 1);
      const batteryAH = (project as any).batteryAH || '100';
      const batteryVolt = (project as any).voltage || 12;
      const batteryQty = (project as any).batteryCount || 1;
      const dcVolt = batteryVolt * batteryQty;
      
      bomSummary = {
        phase,
        inverterKVA,
        panelWatts: totalPanelWatts,
        batteryAH,
        dcVolt
      };
      
      // Calculate backup solutions for off-grid and hybrid
      backupSolutions = this.calculateBackupSolutions(project);
    }
    
    return {
      header: this.COMPANY_DETAILS,
      quotationNumber: quotation.quotationNumber || this.generateQuotationNumber(),
      quotationDate: new Date().toLocaleDateString('en-GB'),
      quoteRevision: quotation.documentVersion || 1,
      quoteValidity: `${validityDays} Days`,
      preparedBy: preparedByName || quotation.preparedBy || "SM",
      customer: {
        name: customer.name,
        address: customer.address,
        contactNumber: customer.mobile
      },
      reference: `${this.formatKWForDisplay(pricingBreakdown?.kw || 0)} kW ${projectTypeName} Solar Power Generation System`,
      pricingBreakdown,
      bomSummary,
      backupSolutions,
      billOfMaterials,
      termsAndConditions: {
        warrantyDetails: warrantyDetails,
        solarInverterWarranty: [
          "2. Solar On grid Inverter (15 Years)",
          "   • Replacement Warranty for 10 Years", 
          "   • Service Warranty for 5 Years"
        ],
        paymentDetails: {
          advancePercentage: quotation.advancePaymentPercentage || 90,
          balancePercentage: 100 - (quotation.advancePaymentPercentage || 90),
          bankDetails: accountDetails || {
            name: "Prakash Green Energy",
            bank: "ICICI",
            branch: "Sobramaniyapuram Madurai",
            accountNo: "067005013400",
            ifscCode: "ICIC0000670"
          }
        },
        deliveryPeriod: this.getDeliveryTimeframeText(quotation.deliveryTimeframe)
      },
      scopeOfWork: this.generateScopeOfWork(project),
      documentsRequiredForSubsidy: documentRequirements || {
        list: [
          "1) EB Number",
          "2) EB Register Mobile Number",
          "3) Aadhaar Card",
          "4) Aadhar Card",
          "5) Pan Card",
          "6) Passport Size Photo -1",
          "7) Photo of EB Tax Copy",
          "8) Passport",
          "9) Cancelled Cheque"
        ],
        note: "*All Required Documents should be in the same name as mention EB Service Number"
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
