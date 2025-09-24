import { QuotationProjectType } from "@shared/schema";
import { parseSystemCapacity } from "../pricing-engine";

/**
 * Normalize capacity for pricing calculations
 * Some items are per-unit (water heater, pump) regardless of capacity rating
 * Others use the actual capacity value for pricing
 */
export function normalizeCapacityForPricing(
  projectType: QuotationProjectType, 
  systemCapacity: string
): { capacityValue: number; capacityUnit: string; displayCapacity: string } {
  
  const { value, unit } = parseSystemCapacity(systemCapacity);
  
  // Per-unit items: water heater, pump, cameras, lights, etc.
  const perUnitTypes: QuotationProjectType[] = [
    'water_heater', 'water_pump', 'camera', 'lights_accessories', 'others'
  ];
  
  if (perUnitTypes.includes(projectType)) {
    return {
      capacityValue: 1, // Always 1 unit for pricing
      capacityUnit: 'Unit', // Standardized unit
      displayCapacity: systemCapacity // Keep original for display
    };
  }
  
  // Capacity-based items: solar systems, batteries, etc.
  return {
    capacityValue: value,
    capacityUnit: unit,
    displayCapacity: systemCapacity
  };
}

/**
 * Get standardized capacity unit for schema validation
 */
export function getStandardizedUnit(unit: string): "kW" | "L" | "HP" | "Watts" {
  const normalized = unit.toLowerCase();
  
  if (normalized.includes('kw')) return 'kW';
  if (normalized.includes('l') || normalized.includes('liter')) return 'L';
  if (normalized.includes('hp') || normalized.includes('horsepower')) return 'HP';
  if (normalized.includes('w') || normalized.includes('watt')) return 'Watts';
  
  // Default for unknown units
  return 'Watts';
}