import { QuotationProjectType } from "@shared/schema";
import { parseSystemCapacity } from "../pricing-engine";

// Real component specifications for different system types
export interface BOMComponent {
  id: string;
  name: string;
  category: 'panels' | 'inverter' | 'mounting' | 'electrical' | 'battery' | 'accessories' | 'installation';
  quantity: number;
  unit: string;
  unitPrice: number; // In ₹
  totalPrice: number;
  specifications: string;
  warranty: string;
  make?: string;
  model?: string;
}

export interface SystemBOM {
  projectType: QuotationProjectType;
  systemCapacity: string;
  components: BOMComponent[];
  totalComponents: number;
  totalValue: number;
  installationCost: number;
  grandTotal: number;
}

// Component database with real market prices (₹)
const COMPONENT_DATABASE = {
  // Solar Panels (₹ per Watt)
  panels: {
    '540W_mono': {
      name: '540W Monocrystalline Solar Panel',
      unitPrice: 22, // ₹22/Watt
      specifications: '540W, 21.2% efficiency, Mono PERC',
      warranty: '25 years performance, 12 years product',
      make: 'Tata Solar/Waaree',
      model: 'TP540M-144'
    },
    '450W_poly': {
      name: '450W Polycrystalline Solar Panel', 
      unitPrice: 18, // ₹18/Watt
      specifications: '450W, 18.5% efficiency, Poly crystalline',
      warranty: '25 years performance, 10 years product',
      make: 'Vikram Solar',
      model: 'VP450P-72'
    }
  },
  
  // Inverters (₹ per kW)
  inverters: {
    'string_inverter': {
      name: 'Grid Tie String Inverter',
      unitPrice: 8000, // ₹8,000/kW
      specifications: '97.5% efficiency, IP65 rated, WiFi monitoring',
      warranty: '10 years standard, 15 years extended',
      make: 'ABB/Growatt',
      model: 'PVS-50-TL'
    },
    'hybrid_inverter': {
      name: 'Hybrid Solar Inverter',
      unitPrice: 15000, // ₹15,000/kW
      specifications: '97% efficiency, Battery compatible, Smart grid ready',
      warranty: '5 years standard, 10 years extended',
      make: 'Luminous/Su-Kam',
      model: 'NXG1800'
    },
    'off_grid_inverter': {
      name: 'Off-Grid Solar Inverter',
      unitPrice: 12000, // ₹12,000/kW
      specifications: '95% efficiency, Pure sine wave, LCD display',
      warranty: '2 years standard, 5 years extended',
      make: 'Microtek/Luminous',
      model: 'SW5548'
    }
  },
  
  // Mounting structures (₹ per kW)
  mounting: {
    'galvanized_structure': {
      name: 'Galvanized Steel Mounting Structure',
      unitPrice: 6000, // ₹6,000/kW
      specifications: 'Hot dip galvanized, Wind load 180 kmph',
      warranty: '25 years structural, 10 years galvanization',
      make: 'Arka/Mahindra Susten'
    },
    'aluminum_structure': {
      name: 'Aluminum Mounting Structure',
      unitPrice: 8000, // ₹8,000/kW
      specifications: 'Marine grade aluminum, Corrosion resistant',
      warranty: '25 years structural',
      make: 'Schletter/K2 Systems'
    }
  },
  
  // Electrical components
  electrical: {
    'dc_cable': {
      name: 'DC Solar Cable',
      unitPrice: 45, // ₹45/meter
      specifications: '4mm² XLPE insulated, UV resistant',
      warranty: '25 years',
      make: 'Polycab/KEI'
    },
    'ac_cable': {
      name: 'AC Power Cable',
      unitPrice: 35, // ₹35/meter
      specifications: '2.5mm² PVC insulated',
      warranty: '10 years',
      make: 'Finolex/Havells'
    },
    'dc_combiner': {
      name: 'DC Combiner Box',
      unitPrice: 3500, // ₹3,500/unit
      specifications: 'IP65 rated, 16A breakers, Surge protection',
      warranty: '5 years',
      make: 'Schneider/L&T'
    },
    'ac_disconnect': {
      name: 'AC Disconnect Switch',
      unitPrice: 2500, // ₹2,500/unit
      specifications: '63A, 4 pole, Weatherproof',
      warranty: '5 years',
      make: 'Schneider/Siemens'
    },
    'earthing_kit': {
      name: 'Earthing & Lightning Protection',
      unitPrice: 1500, // ₹1,500/kW
      specifications: 'Copper earthing, Lightning arrestor',
      warranty: '10 years',
      make: 'Kisan/Erico'
    }
  },
  
  // Batteries (₹ per kWh)
  batteries: {
    'lithium_battery': {
      name: 'Lithium Iron Phosphate Battery',
      unitPrice: 45000, // ₹45,000/kWh
      specifications: '6000+ cycles, 95% DoD, BMS included',
      warranty: '10 years',
      make: 'Exide/Amaron',
      model: 'LiFePO4-100Ah'
    },
    'gel_battery': {
      name: 'Deep Cycle Gel Battery',
      unitPrice: 18000, // ₹18,000/kWh
      specifications: '1500+ cycles, 80% DoD, Maintenance free',
      warranty: '5 years',
      make: 'Exide/Luminous',
      model: 'SMF-150Ah'
    }
  },
  
  // Water heating specific
  water_heater: {
    'collector_200l': {
      name: '200L Solar Water Heater System',
      unitPrice: 25000, // ₹25,000/unit
      specifications: 'ETC tubes, SS tank, 5 year warranty',
      warranty: '5 years comprehensive',
      make: 'Tata Solar/Racold'
    },
    'collector_300l': {
      name: '300L Solar Water Heater System', 
      unitPrice: 35000, // ₹35,000/unit
      specifications: 'ETC tubes, SS tank, 5 year warranty',
      warranty: '5 years comprehensive',
      make: 'Tata Solar/Racold'
    }
  },
  
  // Water pumping specific
  water_pump: {
    'submersible_3hp': {
      name: '3HP Solar Submersible Pump',
      unitPrice: 35000, // ₹35,000/unit
      specifications: 'SS body, 50m head, Controller included',
      warranty: '2 years pump, 5 years controller',
      make: 'Shakti/Grundfos'
    },
    'surface_1hp': {
      name: '1HP Solar Surface Pump',
      unitPrice: 18000, // ₹18,000/unit
      specifications: 'Cast iron body, 25m head, MPPT controller',
      warranty: '2 years pump, 3 years controller',
      make: 'CRI/Kirloskar'
    }
  },
  
  // Security cameras specific
  cameras: {
    'ip_camera_4mp': {
      name: '4MP IP Security Camera',
      unitPrice: 12000, // ₹12,000/unit
      specifications: '4MP resolution, Night vision, IP67, PoE',
      warranty: '2 years',
      make: 'Hikvision/Dahua'
    },
    'nvr_8ch': {
      name: '8-Channel Network Video Recorder',
      unitPrice: 8000, // ₹8,000/unit
      specifications: '8CH NVR, 2TB HDD, H.265 compression',
      warranty: '3 years',
      make: 'Hikvision/CP Plus'
    },
    'cables_accessories': {
      name: 'Camera Cables & Accessories',
      unitPrice: 2000, // ₹2,000/camera
      specifications: 'Cat6 cable, connectors, mounting brackets',
      warranty: '1 year',
      make: 'D-Link/TP-Link'
    }
  },
  
  // Lights and accessories specific
  lights: {
    'led_street_light': {
      name: 'Solar LED Street Light',
      unitPrice: 8000, // ₹8,000/unit
      specifications: '30W LED, Auto on/off, 8-10 hrs backup',
      warranty: '2 years',
      make: 'Syska/Havells'
    },
    'flood_light': {
      name: 'Solar LED Flood Light',
      unitPrice: 3500, // ₹3,500/unit
      specifications: '50W LED, PIR sensor, Remote control',
      warranty: '2 years',
      make: 'Philips/Bajaj'
    },
    'garden_light': {
      name: 'Solar Garden Light',
      unitPrice: 1500, // ₹1,500/unit
      specifications: '10W LED, Decorative design, Auto sensor',
      warranty: '1 year',
      make: 'Wipro/Orient'
    },
    'charge_controller': {
      name: 'Solar Charge Controller',
      unitPrice: 2500, // ₹2,500/unit
      specifications: 'PWM 20A, LCD display, USB charging',
      warranty: '2 years',
      make: 'Luminous/Su-Kam'
    }
  }
} as const;

/**
 * Generate Bill of Materials for different project types
 */
export function generateBOM(projectType: QuotationProjectType, systemCapacity: string): SystemBOM {
  const components: BOMComponent[] = [];
  let installationCost = 0;
  
  const { value: capacityValue, unit } = parseSystemCapacity(systemCapacity);
  
  switch (projectType) {
    case 'on_grid':
      return generateOnGridBOM(capacityValue, components);
      
    case 'off_grid':
      return generateOffGridBOM(capacityValue, components);
      
    case 'hybrid':
      return generateHybridBOM(capacityValue, components);
      
    case 'water_heater':
      return generateWaterHeaterBOM(capacityValue, components);
      
    case 'water_pump':
      return generateWaterPumpBOM(capacityValue, components);
      
    case 'solar_panel':
      return generateSolarPanelBOM(capacityValue, components);
      
    case 'camera':
      return generateCameraBOM(capacityValue, components);
      
    case 'lights_accessories':
      return generateLightsBOM(capacityValue, components);
      
    default:
      return generateGenericBOM(projectType, capacityValue, components);
  }
}

function generateOnGridBOM(capacityKW: number, components: BOMComponent[]): SystemBOM {
  const panelSpec = COMPONENT_DATABASE.panels['540W_mono'];
  const inverterSpec = COMPONENT_DATABASE.inverters['string_inverter'];
  const mountingSpec = COMPONENT_DATABASE.mounting['galvanized_structure'];
  
  // Calculate panel quantity (540W panels)
  const panelQuantity = Math.ceil((capacityKW * 1000) / 540);
  const actualCapacity = panelQuantity * 540; // Actual system capacity
  
  // Add panels
  addComponent(components, {
    id: 'panels',
    name: panelSpec.name,
    category: 'panels',
    quantity: panelQuantity,
    unit: 'Nos',
    unitPrice: panelSpec.unitPrice * 540, // ₹/panel
    specifications: panelSpec.specifications,
    warranty: panelSpec.warranty,
    make: panelSpec.make,
    model: panelSpec.model
  });
  
  // Add inverter
  addComponent(components, {
    id: 'inverter',
    name: inverterSpec.name,
    category: 'inverter',
    quantity: 1,
    unit: 'Nos',
    unitPrice: inverterSpec.unitPrice * capacityKW,
    specifications: inverterSpec.specifications,
    warranty: inverterSpec.warranty,
    make: inverterSpec.make,
    model: inverterSpec.model
  });
  
  // Add mounting structure
  addComponent(components, {
    id: 'mounting',
    name: mountingSpec.name,
    category: 'mounting',
    quantity: 1,
    unit: 'Set',
    unitPrice: mountingSpec.unitPrice * capacityKW,
    specifications: mountingSpec.specifications,
    warranty: mountingSpec.warranty,
    make: mountingSpec.make
  });
  
  // Add electrical components
  addElectricalComponents(components, capacityKW, 'grid_tie');
  
  const installationCost = capacityKW * 5000; // ₹5,000/kW installation
  
  return compileBOM('on_grid', `${capacityKW}kW`, components, installationCost);
}

function generateOffGridBOM(capacityKW: number, components: BOMComponent[]): SystemBOM {
  const panelSpec = COMPONENT_DATABASE.panels['540W_mono'];
  const inverterSpec = COMPONENT_DATABASE.inverters['off_grid_inverter'];
  const batterySpec = COMPONENT_DATABASE.batteries['gel_battery'];
  
  // Calculate components
  const panelQuantity = Math.ceil((capacityKW * 1000) / 540);
  const batteryCapacityKWh = capacityKW * 4; // 4 hours backup
  const batteryQuantity = Math.ceil(batteryCapacityKWh);
  
  // Add panels
  addComponent(components, {
    id: 'panels',
    name: panelSpec.name,
    category: 'panels',
    quantity: panelQuantity,
    unit: 'Nos',
    unitPrice: panelSpec.unitPrice * 540,
    specifications: panelSpec.specifications,
    warranty: panelSpec.warranty,
    make: panelSpec.make,
    model: panelSpec.model
  });
  
  // Add inverter
  addComponent(components, {
    id: 'inverter',
    name: inverterSpec.name,
    category: 'inverter',
    quantity: 1,
    unit: 'Nos',
    unitPrice: inverterSpec.unitPrice * capacityKW,
    specifications: inverterSpec.specifications,
    warranty: inverterSpec.warranty,
    make: inverterSpec.make,
    model: inverterSpec.model
  });
  
  // Add batteries
  addComponent(components, {
    id: 'batteries',
    name: batterySpec.name,
    category: 'battery',
    quantity: batteryQuantity,
    unit: 'Nos',
    unitPrice: batterySpec.unitPrice,
    specifications: batterySpec.specifications,
    warranty: batterySpec.warranty,
    make: batterySpec.make,
    model: batterySpec.model
  });
  
  // Add mounting and electrical
  addMountingStructure(components, capacityKW);
  addElectricalComponents(components, capacityKW, 'off_grid');
  
  const installationCost = capacityKW * 8000; // ₹8,000/kW for off-grid
  
  return compileBOM('off_grid', `${capacityKW}kW`, components, installationCost);
}

function generateHybridBOM(capacityKW: number, components: BOMComponent[]): SystemBOM {
  const panelSpec = COMPONENT_DATABASE.panels['540W_mono'];
  const inverterSpec = COMPONENT_DATABASE.inverters['hybrid_inverter'];
  const batterySpec = COMPONENT_DATABASE.batteries['lithium_battery'];
  
  // Calculate components
  const panelQuantity = Math.ceil((capacityKW * 1000) / 540);
  const batteryCapacityKWh = capacityKW * 2; // 2 hours backup for hybrid
  const batteryQuantity = Math.ceil(batteryCapacityKWh);
  
  // Add panels
  addComponent(components, {
    id: 'panels',
    name: panelSpec.name,
    category: 'panels',
    quantity: panelQuantity,
    unit: 'Nos',
    unitPrice: panelSpec.unitPrice * 540,
    specifications: panelSpec.specifications,
    warranty: panelSpec.warranty,
    make: panelSpec.make,
    model: panelSpec.model
  });
  
  // Add hybrid inverter
  addComponent(components, {
    id: 'inverter',
    name: inverterSpec.name,
    category: 'inverter',
    quantity: 1,
    unit: 'Nos',
    unitPrice: inverterSpec.unitPrice * capacityKW,
    specifications: inverterSpec.specifications,
    warranty: inverterSpec.warranty,
    make: inverterSpec.make,
    model: inverterSpec.model
  });
  
  // Add lithium batteries
  addComponent(components, {
    id: 'batteries',
    name: batterySpec.name,
    category: 'battery',
    quantity: batteryQuantity,
    unit: 'Nos',
    unitPrice: batterySpec.unitPrice,
    specifications: batterySpec.specifications,
    warranty: batterySpec.warranty,
    make: batterySpec.make,
    model: batterySpec.model
  });
  
  // Add mounting and electrical
  addMountingStructure(components, capacityKW);
  addElectricalComponents(components, capacityKW, 'hybrid');
  
  const installationCost = capacityKW * 7000; // ₹7,000/kW for hybrid
  
  return compileBOM('hybrid', `${capacityKW}kW`, components, installationCost);
}

function generateWaterHeaterBOM(capacityValue: number, components: BOMComponent[]): SystemBOM {
  // Determine system size based on capacity value (200L or 300L)
  const systemSize = capacityValue <= 200 ? '200l' : '300l';
  const heaterSpec = COMPONENT_DATABASE.water_heater[`collector_${systemSize}`];
  
  addComponent(components, {
    id: 'water_heater',
    name: heaterSpec.name,
    category: 'accessories',
    quantity: 1,
    unit: 'Set',
    unitPrice: heaterSpec.unitPrice,
    specifications: heaterSpec.specifications,
    warranty: heaterSpec.warranty,
    make: heaterSpec.make
  });
  
  // Add installation accessories
  addComponent(components, {
    id: 'pipes_fittings',
    name: 'Pipes & Fittings Kit',
    category: 'accessories',
    quantity: 1,
    unit: 'Set',
    unitPrice: 3000,
    specifications: 'PPR pipes, valves, fittings',
    warranty: '2 years'
  });
  
  const installationCost = 2000; // ₹2,000 installation
  
  return compileBOM('water_heater', `${capacityValue}L`, components, installationCost);
}

function generateWaterPumpBOM(capacityValue: number, components: BOMComponent[]): SystemBOM {
  // Determine pump type based on capacity (3HP submersible or 1HP surface)
  const pumpType = capacityValue >= 3 ? 'submersible_3hp' : 'surface_1hp';
  const pumpSpec = COMPONENT_DATABASE.water_pump[pumpType];
  
  addComponent(components, {
    id: 'water_pump',
    name: pumpSpec.name,
    category: 'accessories',
    quantity: 1,
    unit: 'Set',
    unitPrice: pumpSpec.unitPrice,
    specifications: pumpSpec.specifications,
    warranty: pumpSpec.warranty,
    make: pumpSpec.make
  });
  
  // Add solar panels for pump power
  const panelRequiredKW = capacityValue * 0.8; // 0.8kW per HP
  const panelQuantity = Math.ceil((panelRequiredKW * 1000) / 540);
  const panelSpec = COMPONENT_DATABASE.panels['540W_mono'];
  
  addComponent(components, {
    id: 'panels',
    name: panelSpec.name,
    category: 'panels',
    quantity: panelQuantity,
    unit: 'Nos',
    unitPrice: panelSpec.unitPrice * 540,
    specifications: panelSpec.specifications,
    warranty: panelSpec.warranty,
    make: panelSpec.make,
    model: panelSpec.model
  });
  
  // Add mounting structure for panels
  addMountingStructure(components, panelRequiredKW);
  
  const installationCost = 5000; // ₹5,000 installation
  
  return compileBOM('water_pump', `${capacityValue}HP`, components, installationCost);
}

function generateSolarPanelBOM(capacityKW: number, components: BOMComponent[]): SystemBOM {
  const panelSpec = COMPONENT_DATABASE.panels['540W_mono'];
  const panelQuantity = Math.ceil((capacityKW * 1000) / 540);
  
  addComponent(components, {
    id: 'panels',
    name: panelSpec.name,
    category: 'panels',
    quantity: panelQuantity,
    unit: 'Nos',
    unitPrice: panelSpec.unitPrice * 540,
    specifications: panelSpec.specifications,
    warranty: panelSpec.warranty,
    make: panelSpec.make,
    model: panelSpec.model
  });
  
  addMountingStructure(components, capacityKW);
  
  const installationCost = capacityKW * 3000; // ₹3,000/kW for panel only
  
  return compileBOM('solar_panel', `${capacityKW}kW`, components, installationCost);
}

function generateCameraBOM(capacityValue: number, components: BOMComponent[]): SystemBOM {
  const cameras = COMPONENT_DATABASE.cameras;
  const numCameras = Math.max(1, capacityValue);
  
  // Add IP cameras
  addComponent(components, {
    id: 'ip_cameras',
    name: cameras.ip_camera_4mp.name,
    category: 'accessories',
    quantity: numCameras,
    unit: 'Nos',
    unitPrice: cameras.ip_camera_4mp.unitPrice,
    specifications: cameras.ip_camera_4mp.specifications,
    warranty: cameras.ip_camera_4mp.warranty,
    make: cameras.ip_camera_4mp.make
  });
  
  // Add NVR (1 per 8 cameras)
  const nvrQuantity = Math.ceil(numCameras / 8);
  addComponent(components, {
    id: 'nvr',
    name: cameras.nvr_8ch.name,
    category: 'accessories',
    quantity: nvrQuantity,
    unit: 'Nos',
    unitPrice: cameras.nvr_8ch.unitPrice,
    specifications: cameras.nvr_8ch.specifications,
    warranty: cameras.nvr_8ch.warranty,
    make: cameras.nvr_8ch.make
  });
  
  // Add cables & accessories
  addComponent(components, {
    id: 'camera_accessories',
    name: cameras.cables_accessories.name,
    category: 'accessories',
    quantity: numCameras,
    unit: 'Set',
    unitPrice: cameras.cables_accessories.unitPrice,
    specifications: cameras.cables_accessories.specifications,
    warranty: cameras.cables_accessories.warranty,
    make: cameras.cables_accessories.make
  });
  
  const installationCost = numCameras * 1500; // ₹1,500 per camera
  
  // Add installation as line item
  addComponent(components, {
    id: 'installation',
    name: 'Camera Installation & Configuration',
    category: 'installation',
    quantity: 1,
    unit: 'Service',
    unitPrice: installationCost,
    specifications: 'Complete installation, testing, and configuration',
    warranty: '1 year service warranty'
  });
  
  return compileBOM('camera', `${numCameras}Units`, components, 0); // Installation already added as line item
}

function generateLightsBOM(capacityValue: number, components: BOMComponent[]): SystemBOM {
  const lights = COMPONENT_DATABASE.lights;
  const numSets = Math.max(1, capacityValue);
  
  // Mix of different light types in a typical set
  const streetLights = Math.ceil(numSets * 0.4); // 40% street lights
  const floodLights = Math.ceil(numSets * 0.4); // 40% flood lights  
  const gardenLights = Math.ceil(numSets * 0.6); // 60% garden lights
  
  // Add street lights
  addComponent(components, {
    id: 'street_lights',
    name: lights.led_street_light.name,
    category: 'accessories',
    quantity: streetLights,
    unit: 'Nos',
    unitPrice: lights.led_street_light.unitPrice,
    specifications: lights.led_street_light.specifications,
    warranty: lights.led_street_light.warranty,
    make: lights.led_street_light.make
  });
  
  // Add flood lights
  addComponent(components, {
    id: 'flood_lights',
    name: lights.flood_light.name,
    category: 'accessories',
    quantity: floodLights,
    unit: 'Nos',
    unitPrice: lights.flood_light.unitPrice,
    specifications: lights.flood_light.specifications,
    warranty: lights.flood_light.warranty,
    make: lights.flood_light.make
  });
  
  // Add garden lights
  addComponent(components, {
    id: 'garden_lights',
    name: lights.garden_light.name,
    category: 'accessories',
    quantity: gardenLights,
    unit: 'Nos',
    unitPrice: lights.garden_light.unitPrice,
    specifications: lights.garden_light.specifications,
    warranty: lights.garden_light.warranty,
    make: lights.garden_light.make
  });
  
  // Add charge controllers
  const controllerQuantity = Math.ceil((streetLights + floodLights) / 2); // 1 controller per 2 major lights
  addComponent(components, {
    id: 'charge_controllers',
    name: lights.charge_controller.name,
    category: 'electrical',
    quantity: controllerQuantity,
    unit: 'Nos',
    unitPrice: lights.charge_controller.unitPrice,
    specifications: lights.charge_controller.specifications,
    warranty: lights.charge_controller.warranty,
    make: lights.charge_controller.make
  });
  
  const installationCost = (streetLights + floodLights + gardenLights) * 500; // ₹500 per light
  
  // Add installation as line item
  addComponent(components, {
    id: 'installation',
    name: 'Lights Installation & Wiring',
    category: 'installation',
    quantity: 1,
    unit: 'Service',
    unitPrice: installationCost,
    specifications: 'Complete installation, wiring, and testing',
    warranty: '1 year service warranty'
  });
  
  return compileBOM('lights_accessories', `${numSets}Sets`, components, 0); // Installation already added as line item
}

function generateGenericBOM(projectType: QuotationProjectType, capacityValue: number, components: BOMComponent[]): SystemBOM {
  // Generic BOM for others
  addComponent(components, {
    id: 'generic_equipment',
    name: `${projectType.charAt(0).toUpperCase() + projectType.slice(1)} Equipment`,
    category: 'accessories',
    quantity: capacityValue || 1,
    unit: 'Unit',
    unitPrice: 20000, // Generic ₹20,000/unit
    specifications: 'Standard specifications as per requirement',
    warranty: '1 year'
  });
  
  const installationCost = 1000; // ₹1,000 installation
  
  // Add installation as line item
  addComponent(components, {
    id: 'installation',
    name: 'Equipment Installation',
    category: 'installation',
    quantity: 1,
    unit: 'Service',
    unitPrice: installationCost,
    specifications: 'Basic installation and setup',
    warranty: '6 months service warranty'
  });
  
  return compileBOM(projectType, `${capacityValue || 1}Unit`, components, 0); // Installation already added as line item
}

// Helper functions
function addComponent(components: BOMComponent[], componentData: Omit<BOMComponent, 'totalPrice'>) {
  const totalPrice = componentData.quantity * componentData.unitPrice;
  components.push({
    ...componentData,
    totalPrice
  });
}

function addMountingStructure(components: BOMComponent[], capacityKW: number) {
  const mountingSpec = COMPONENT_DATABASE.mounting['galvanized_structure'];
  addComponent(components, {
    id: 'mounting',
    name: mountingSpec.name,
    category: 'mounting',
    quantity: 1,
    unit: 'Set',
    unitPrice: mountingSpec.unitPrice * capacityKW,
    specifications: mountingSpec.specifications,
    warranty: mountingSpec.warranty,
    make: mountingSpec.make
  });
}

function addElectricalComponents(components: BOMComponent[], capacityKW: number, systemType: 'grid_tie' | 'off_grid' | 'hybrid') {
  const electrical = COMPONENT_DATABASE.electrical;
  
  // DC cables (20m per kW)
  addComponent(components, {
    id: 'dc_cable',
    name: electrical.dc_cable.name,
    category: 'electrical',
    quantity: Math.ceil(capacityKW * 20),
    unit: 'Meter',
    unitPrice: electrical.dc_cable.unitPrice,
    specifications: electrical.dc_cable.specifications,
    warranty: electrical.dc_cable.warranty,
    make: electrical.dc_cable.make
  });
  
  // AC cables (10m per kW)
  addComponent(components, {
    id: 'ac_cable',
    name: electrical.ac_cable.name,
    category: 'electrical',
    quantity: Math.ceil(capacityKW * 10),
    unit: 'Meter',
    unitPrice: electrical.ac_cable.unitPrice,
    specifications: electrical.ac_cable.specifications,
    warranty: electrical.ac_cable.warranty,
    make: electrical.ac_cable.make
  });
  
  // DC combiner box
  if (capacityKW > 2) {
    addComponent(components, {
      id: 'dc_combiner',
      name: electrical.dc_combiner.name,
      category: 'electrical',
      quantity: 1,
      unit: 'Nos',
      unitPrice: electrical.dc_combiner.unitPrice,
      specifications: electrical.dc_combiner.specifications,
      warranty: electrical.dc_combiner.warranty,
      make: electrical.dc_combiner.make
    });
  }
  
  // AC disconnect (for grid-tie systems)
  if (systemType === 'grid_tie' || systemType === 'hybrid') {
    addComponent(components, {
      id: 'ac_disconnect',
      name: electrical.ac_disconnect.name,
      category: 'electrical',
      quantity: 1,
      unit: 'Nos',
      unitPrice: electrical.ac_disconnect.unitPrice,
      specifications: electrical.ac_disconnect.specifications,
      warranty: electrical.ac_disconnect.warranty,
      make: electrical.ac_disconnect.make
    });
  }
  
  // Earthing kit
  addComponent(components, {
    id: 'earthing',
    name: electrical.earthing_kit.name,
    category: 'electrical',
    quantity: 1,
    unit: 'Set',
    unitPrice: electrical.earthing_kit.unitPrice * capacityKW,
    specifications: electrical.earthing_kit.specifications,
    warranty: electrical.earthing_kit.warranty,
    make: electrical.earthing_kit.make
  });
}

function compileBOM(projectType: QuotationProjectType, systemCapacity: string, components: BOMComponent[], installationCost: number): SystemBOM {
  const totalComponents = components.length;
  const totalValue = components.reduce((sum, comp) => sum + comp.totalPrice, 0);
  const grandTotal = totalValue + installationCost;
  
  return {
    projectType,
    systemCapacity,
    components: components.sort((a, b) => a.category.localeCompare(b.category)), // Sort by category
    totalComponents,
    totalValue,
    installationCost,
    grandTotal
  };
}