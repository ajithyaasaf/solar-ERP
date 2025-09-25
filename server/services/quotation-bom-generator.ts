/**
 * BOMGenerator Service
 * Generates comprehensive Bill of Materials for quotations
 * 
 * Features:
 * - Component-based BOM generation
 * - Dynamic quantity calculations
 * - Brand-specific specifications
 * - Accessory recommendations
 * - Installation materials
 */

import {
  type QuotationProjectType,
  type OnGridConfig,
  type OffGridConfig,
  type HybridConfig,
  type WaterHeaterConfig,
  type WaterPumpConfig,
  type BOMItem,
  type InsertQuotationDraft,
} from "@shared/schema";

interface BOMGenerationConfig {
  projectType: QuotationProjectType;
  systemConfiguration: any;
  systemCapacity: number;
  panelCount: number;
  inverterKW: number;
  batteryCount?: number;
  includeInstallation: boolean;
  includeAccessories: boolean;
  customSpecifications?: string[];
}

interface ComponentSpecs {
  solarPanels?: {
    brand: string;
    wattage: string;
    type: string;
    quantity: number;
    specifications: string[];
  };
  inverter?: {
    brand: string;
    capacity: string;
    phase: string;
    type: string;
    quantity: number;
    specifications: string[];
  };
  batteries?: {
    brand: string;
    capacity: string;
    type: string;
    voltage: number;
    quantity: number;
    specifications: string[];
  };
  structure?: {
    type: string;
    material: string;
    height: number;
    specifications: string[];
  };
  accessories: Array<{
    name: string;
    specifications: string[];
    quantity: number;
    unit: string;
  }>;
  installation: Array<{
    name: string;
    specifications: string[];
    quantity: number;
    unit: string;
  }>;
}

export class BOMGenerator {
  
  /**
   * Generate complete BOM for quotation draft
   */
  static generateBOM(quotationDraft: Partial<InsertQuotationDraft>): BOMItem[] {
    const config: BOMGenerationConfig = this.extractBOMConfig(quotationDraft);
    const componentSpecs = this.generateComponentSpecs(config);
    return this.createBOMItems(componentSpecs, config);
  }

  /**
   * Extract BOM generation configuration from quotation draft
   */
  private static extractBOMConfig(quotationDraft: Partial<InsertQuotationDraft>): BOMGenerationConfig {
    const systemConfig = quotationDraft.systemConfiguration!;
    const projectType = quotationDraft.projectType!;
    
    // Calculate system capacity
    let systemCapacity = 0;
    let panelCount = 0;
    let inverterKW = 0;
    let batteryCount = 0;

    if (projectType === "on_grid" || projectType === "off_grid" || projectType === "hybrid") {
      const config = systemConfig as OnGridConfig | OffGridConfig | HybridConfig;
      panelCount = config.panelCount || 0;
      const panelWatts = parseInt(config.panelWatts || "0");
      systemCapacity = (panelCount * panelWatts) / 1000; // Convert to kW
      inverterKW = config.inverterKW || systemCapacity;
      
      if ((projectType === "off_grid" || projectType === "hybrid") && "batteryCount" in config) {
        batteryCount = (config as any).batteryCount || 0;
      }
    }

    return {
      projectType,
      systemConfiguration: systemConfig,
      systemCapacity,
      panelCount,
      inverterKW,
      batteryCount,
      includeInstallation: true,
      includeAccessories: true
    };
  }

  /**
   * Generate detailed component specifications
   */
  private static generateComponentSpecs(config: BOMGenerationConfig): ComponentSpecs {
    const specs: ComponentSpecs = {
      accessories: [],
      installation: []
    };

    // Solar system components
    if (config.projectType === "on_grid" || config.projectType === "off_grid" || config.projectType === "hybrid") {
      this.addSolarSystemSpecs(specs, config);
    }

    // Water heater components
    if (config.projectType === "water_heater") {
      this.addWaterHeaterSpecs(specs, config);
    }

    // Water pump components
    if (config.projectType === "water_pump") {
      this.addWaterPumpSpecs(specs, config);
    }

    // Common accessories and installation materials
    this.addCommonAccessories(specs, config);
    this.addInstallationMaterials(specs, config);

    return specs;
  }

  /**
   * Add solar system component specifications
   */
  private static addSolarSystemSpecs(specs: ComponentSpecs, config: BOMGenerationConfig) {
    const sysConfig = config.systemConfiguration as OnGridConfig | OffGridConfig | HybridConfig;
    
    // Solar panels
    if (config.panelCount > 0) {
      const panelBrand = sysConfig.solarPanelMake?.[0] || "Renew";
      const panelWatts = sysConfig.panelWatts || "540";
      
      specs.solarPanels = {
        brand: this.formatBrandName(panelBrand),
        wattage: panelWatts,
        type: "Monocrystalline",
        quantity: config.panelCount,
        specifications: [
          `${panelWatts}W Monocrystalline Solar Panel`,
          "High efficiency silicon cells",
          "Anti-reflective tempered glass",
          "Anodized aluminium frame",
          "25 years performance warranty",
          "IP65 junction box",
          "TUV, IEC certified"
        ]
      };
    }

    // Inverter
    if (config.inverterKW > 0) {
      const inverterBrand = sysConfig.inverterMake?.[0] || "Growatt";
      const inverterPhase = sysConfig.inverterPhase || (config.inverterKW > 5 ? "three_phase" : "single_phase");
      
      specs.inverter = {
        brand: this.formatBrandName(inverterBrand),
        capacity: `${config.inverterKW}kW`,
        phase: inverterPhase === "three_phase" ? "Three Phase" : "Single Phase",
        type: config.projectType === "hybrid" ? "Hybrid" : "Grid Tie",
        quantity: sysConfig.inverterQty || 1,
        specifications: [
          `${config.inverterKW}kW ${inverterPhase === "three_phase" ? "Three Phase" : "Single Phase"} Inverter`,
          "Maximum efficiency >97%",
          "Wide MPPT voltage range",
          "LCD display with monitoring",
          "IP65 protection rating",
          "5 years manufacturer warranty",
          "Remote monitoring capable"
        ]
      };
    }

    // Batteries (for off-grid/hybrid)
    if ((config.projectType === "off_grid" || config.projectType === "hybrid") && (config.batteryCount || 0) > 0) {
      const batteryBrand = "batteryBrand" in sysConfig ? sysConfig.batteryBrand : "Exide";
      const batteryAH = "batteryAH" in sysConfig ? sysConfig.batteryAH : "150";
      const batteryType = "batteryType" in sysConfig ? sysConfig.batteryType : "lead_acid";
      
      specs.batteries = {
        brand: this.formatBrandName(batteryBrand || "Exide"),
        capacity: `${batteryAH}AH`,
        type: batteryType === "lithium" ? "Lithium Ion" : "Lead Acid",
        voltage: "voltage" in sysConfig ? sysConfig.voltage : 12,
        quantity: config.batteryCount || 0,
        specifications: [
          `${batteryAH}AH ${batteryType === "lithium" ? "Lithium Ion" : "Lead Acid"} Battery`,
          "Deep cycle design",
          "Long service life",
          "Maintenance free operation",
          "High discharge efficiency",
          "3 years manufacturer warranty"
        ]
      };
    }

    // Structure
    specs.structure = {
      type: sysConfig.structureType || "gp_structure",
      material: sysConfig.structureType === "mono_rail" ? "Aluminum" : "Galvanized Iron",
      height: sysConfig.structureHeight || 6,
      specifications: [
        sysConfig.structureType === "mono_rail" ? "Aluminum Mono Rail Structure" : "GI Mounting Structure",
        "Hot dip galvanized finish",
        "Wind load resistant design",
        "Easy installation system",
        "10 years anti-corrosion warranty",
        "IS 2062 grade steel",
        "Powder coated finish"
      ]
    };
  }

  /**
   * Add water heater component specifications
   */
  private static addWaterHeaterSpecs(specs: ComponentSpecs, config: BOMGenerationConfig) {
    const sysConfig = config.systemConfiguration as WaterHeaterConfig;
    
    specs.accessories.push({
      name: `${this.formatBrandName(sysConfig.brand || "venus")} Solar Water Heater`,
      specifications: [
        `${sysConfig.litre || 200}L Capacity Solar Water Heater`,
        "High efficiency evacuated tube collectors",
        "Insulated storage tank",
        "Automatic temperature control",
        "5 years comprehensive warranty",
        "ISI marked product",
        "Corrosion resistant materials"
      ],
      quantity: 1,
      unit: "nos"
    });
  }

  /**
   * Add water pump component specifications
   */
  private static addWaterPumpSpecs(specs: ComponentSpecs, config: BOMGenerationConfig) {
    const sysConfig = config.systemConfiguration as WaterPumpConfig;
    
    specs.accessories.push({
      name: `${this.formatBrandName(sysConfig.panelBrand?.[0] || "Crompton")} Solar Water Pump`,
      specifications: [
        `${sysConfig.hp || 3}HP Solar Water Pump`,
        `${sysConfig.drive === "ac" ? "AC" : "DC"} Drive System`,
        `Submersible Type`,
        "High efficiency motor",
        "Corrosion resistant materials",
        "2 years manufacturer warranty",
        "Easy maintenance design"
      ],
      quantity: 1,
      unit: "nos"
    });

    // Pump controller
    specs.accessories.push({
      name: `${this.formatBrandName("Growatt")} Pump Controller`,
      specifications: [
        `${sysConfig.hp || 3}HP Pump Controller`,
        "MPPT technology",
        "Dry run protection",
        "Remote monitoring",
        "Variable frequency drive",
        "IP65 protection",
        "2 years warranty"
      ],
      quantity: 1,
      unit: "nos"
    });
  }

  /**
   * Add common accessories for all systems
   */
  private static addCommonAccessories(specs: ComponentSpecs, config: BOMGenerationConfig) {
    const capacity = config.systemCapacity || 1;
    
    // DC Cables
    specs.accessories.push({
      name: "Solar DC Cable",
      specifications: [
        "4 sq mm Solar DC Cable",
        "TUV certified",
        "UV resistant outer sheath",
        "Flame retardant",
        "Temperature range: -40°C to +90°C",
        "25 years service life"
      ],
      quantity: Math.ceil(capacity * 20), // 20 meters per kW
      unit: "mtr"
    });

    // AC Cables
    specs.accessories.push({
      name: "AC Cable",
      specifications: [
        "2.5 sq mm AC Cable",
        "ISI marked",
        "Copper conductor",
        "PVC insulated",
        "Flame retardant",
        "House wire grade"
      ],
      quantity: Math.ceil(capacity * 10), // 10 meters per kW
      unit: "mtr"
    });

    // Earthing Kit
    specs.accessories.push({
      name: "Earthing Kit",
      specifications: [
        "Complete earthing arrangement",
        "Copper rod and plate",
        "Earth pit chemicals",
        "Connection cables",
        "Maintenance free",
        "IS 3043 compliant"
      ],
      quantity: 1,
      unit: "set"
    });

    // Lightning Protection
    if (config.systemConfiguration.lightningArrest !== false) {
      specs.accessories.push({
        name: "Lightning Arrestor",
        specifications: [
          "DC/AC Lightning Arrestor",
          "Surge protection device",
          "Class II arrestor",
          "Weather resistant",
          "UL listed components",
          "Easy installation"
        ],
        quantity: 1,
        unit: "set"
      });
    }

    // DC/AC Disconnect Switches
    specs.accessories.push({
      name: "DC Disconnect Switch",
      specifications: [
        "DC isolation switch",
        "IP65 weatherproof enclosure",
        "Load break capacity",
        "Lockable handle",
        "Visible open position",
        "ISI certified"
      ],
      quantity: 1,
      unit: "nos"
    });

    specs.accessories.push({
      name: "AC Disconnect Switch",
      specifications: [
        "AC isolation switch",
        "MCB type protection",
        "Weatherproof enclosure",
        "Easy access",
        "Overload protection",
        "ISI certified"
      ],
      quantity: 1,
      unit: "nos"
    });

    // Monitoring System
    specs.accessories.push({
      name: "Monitoring System",
      specifications: [
        "WiFi based monitoring",
        "Real-time data logging",
        "Mobile app access",
        "Performance analytics",
        "Fault detection",
        "Cloud storage"
      ],
      quantity: 1,
      unit: "set"
    });
  }

  /**
   * Add installation materials and labor
   */
  private static addInstallationMaterials(specs: ComponentSpecs, config: BOMGenerationConfig) {
    
    // Installation and commissioning
    specs.installation.push({
      name: "System Installation",
      specifications: [
        "Complete system installation",
        "Panel mounting and alignment",
        "Electrical connections",
        "System commissioning",
        "Performance testing",
        "1 year service warranty"
      ],
      quantity: 1,
      unit: "job"
    });

    // Civil work coordination (customer scope)
    if (config.systemConfiguration.civilWorkScope === "customer_scope") {
      specs.installation.push({
        name: "Civil Work Coordination",
        specifications: [
          "Foundation marking guidance",
          "Structure base requirements",
          "Alignment supervision",
          "Quality inspection",
          "Compliance verification"
        ],
        quantity: 1,
        unit: "job"
      });
    }

    // Net meter assistance (for on-grid systems)
    if (config.projectType === "on_grid" || config.projectType === "hybrid") {
      specs.installation.push({
        name: "Net Meter Assistance",
        specifications: [
          "Application documentation",
          "Technical specifications",
          "DISCOM coordination",
          "Approval follow-up",
          "Installation supervision"
        ],
        quantity: 1,
        unit: "job"
      });
    }
  }

  /**
   * Convert component specs to BOM items
   */
  private static createBOMItems(specs: ComponentSpecs, config: BOMGenerationConfig): BOMItem[] {
    const bomItems: BOMItem[] = [];
    let serialNumber = 1;

    // Solar panels
    if (specs.solarPanels) {
      bomItems.push({
        sno: serialNumber++,
        item: `${specs.solarPanels.brand} Solar Panel`,
        specification: specs.solarPanels.specifications.join(", "),
        quantity: specs.solarPanels.quantity,
        unit: "nos",
        rate: 0, // Will be filled by pricing engine
        amount: 0
      });
    }

    // Inverter
    if (specs.inverter) {
      bomItems.push({
        sno: serialNumber++,
        item: `${specs.inverter.brand} Inverter`,
        specification: specs.inverter.specifications.join(", "),
        quantity: specs.inverter.quantity,
        unit: "nos",
        rate: 0,
        amount: 0
      });
    }

    // Batteries
    if (specs.batteries) {
      bomItems.push({
        sno: serialNumber++,
        item: `${specs.batteries.brand} Battery`,
        specification: specs.batteries.specifications.join(", "),
        quantity: specs.batteries.quantity,
        unit: "nos",
        rate: 0,
        amount: 0
      });
    }

    // Structure
    if (specs.structure) {
      bomItems.push({
        sno: serialNumber++,
        item: "Mounting Structure",
        specification: specs.structure.specifications.join(", "),
        quantity: 1,
        unit: "set",
        rate: 0,
        amount: 0
      });
    }

    // Accessories
    for (const accessory of specs.accessories) {
      bomItems.push({
        sno: serialNumber++,
        item: accessory.name,
        specification: accessory.specifications.join(", "),
        quantity: accessory.quantity,
        unit: accessory.unit,
        rate: 0,
        amount: 0
      });
    }

    // Installation items
    for (const installation of specs.installation) {
      bomItems.push({
        sno: serialNumber++,
        item: installation.name,
        specification: installation.specifications.join(", "),
        quantity: installation.quantity,
        unit: installation.unit,
        rate: 0,
        amount: 0
      });
    }

    return bomItems;
  }

  /**
   * Update BOM with pricing information
   */
  static updateBOMWithPricing(bomItems: BOMItem[], pricingResult: any): BOMItem[] {
    const updatedBOM = [...bomItems];
    
    // Map pricing to BOM items
    updatedBOM.forEach(item => {
      if (item.item.toLowerCase().includes("solar panel")) {
        item.rate = pricingResult.breakdown?.components?.solarPanels?.rate || 0;
        item.amount = item.quantity * (item.rate || 0);
      } else if (item.item.toLowerCase().includes("inverter")) {
        item.rate = pricingResult.breakdown?.components?.inverter?.rate || 0;
        item.amount = item.quantity * (item.rate || 0);
      } else if (item.item.toLowerCase().includes("battery")) {
        item.rate = pricingResult.breakdown?.components?.batteries?.rate || 0;
        item.amount = item.quantity * (item.rate || 0);
      } else if (item.item.toLowerCase().includes("structure")) {
        item.rate = pricingResult.breakdown?.components?.structure?.rate || 0;
        item.amount = item.quantity * (item.rate || 0);
      } else if (item.item.toLowerCase().includes("installation")) {
        item.rate = pricingResult.breakdown?.components?.installation?.rate || 0;
        item.amount = item.quantity * (item.rate || 0);
      } else {
        // Find accessory pricing
        const accessoryPricing = pricingResult.breakdown?.components?.accessories?.items?.find(
          (acc: any) => acc.name.toLowerCase().includes(item.item.toLowerCase())
        );
        if (accessoryPricing) {
          item.rate = accessoryPricing.rate;
          item.amount = item.quantity * (item.rate || 0);
        } else {
          // Default accessory rates
          item.rate = this.getDefaultAccessoryRate(item.item);
          item.amount = item.quantity * (item.rate || 0);
        }
      }
    });

    return updatedBOM;
  }

  /**
   * Get default rates for accessories when pricing is not available
   */
  private static getDefaultAccessoryRate(itemName: string): number {
    const itemLower = itemName.toLowerCase();
    
    if (itemLower.includes("dc cable")) return 45;
    if (itemLower.includes("ac cable")) return 35;
    if (itemLower.includes("earthing")) return 2500;
    if (itemLower.includes("lightning")) return 3500;
    if (itemLower.includes("disconnect") || itemLower.includes("switch")) return 800;
    if (itemLower.includes("monitoring")) return 5000;
    if (itemLower.includes("installation")) return 8000;
    if (itemLower.includes("water heater")) return 25000;
    if (itemLower.includes("water pump")) return 15000;
    if (itemLower.includes("controller")) return 12000;
    
    return 1000; // Default rate
  }

  /**
   * Validate BOM completeness
   */
  static validateBOM(bomItems: BOMItem[], projectType: QuotationProjectType): {
    isComplete: boolean;
    missingItems: string[];
    recommendations: string[];
  } {
    const missingItems: string[] = [];
    const recommendations: string[] = [];
    
    const itemNames = bomItems.map(item => item.item.toLowerCase());
    
    // Check for essential items based on project type
    if (projectType === "on_grid" || projectType === "off_grid" || projectType === "hybrid") {
      if (!itemNames.some(name => name.includes("solar panel"))) {
        missingItems.push("Solar Panels");
      }
      
      if (!itemNames.some(name => name.includes("inverter"))) {
        missingItems.push("Inverter");
      }
      
      if (!itemNames.some(name => name.includes("structure") || name.includes("mounting"))) {
        missingItems.push("Mounting Structure");
      }
      
      if (!itemNames.some(name => name.includes("earthing"))) {
        missingItems.push("Earthing Kit");
      }
      
      // Battery check for off-grid/hybrid
      if ((projectType === "off_grid" || projectType === "hybrid") && 
          !itemNames.some(name => name.includes("battery"))) {
        missingItems.push("Battery Bank");
      }
    }
    
    // Recommendations
    if (!itemNames.some(name => name.includes("lightning"))) {
      recommendations.push("Consider adding lightning protection for safety");
    }
    
    if (!itemNames.some(name => name.includes("monitoring"))) {
      recommendations.push("Add monitoring system for performance tracking");
    }
    
    if (bomItems.some(item => item.rate === 0)) {
      recommendations.push("Update BOM with accurate pricing information");
    }
    
    return {
      isComplete: missingItems.length === 0,
      missingItems,
      recommendations
    };
  }

  /**
   * Format brand name for display
   */
  private static formatBrandName(brand: string): string {
    const brandMap: { [key: string]: string } = {
      "adani_solar": "Adani Solar",
      "vikram_solar": "Vikram Solar",
      "utl_solar": "UTL Solar",
      "loom_solar": "Loom Solar",
      "renew": "Renew Solar",
      "premier": "Premier Solar",
      "kirloskar": "Kirloskar",
      "growatt": "Growatt",
      "deye": "Deye",
      "polycab": "Polycab",
      "utl": "UTL",
      "microtech": "Microtech",
      "exide": "Exide",
      "exide_utl": "Exide UTL",
      "racold": "Racold",
      "crompton": "Crompton"
    };
    
    return brandMap[brand] || brand.charAt(0).toUpperCase() + brand.slice(1);
  }
}