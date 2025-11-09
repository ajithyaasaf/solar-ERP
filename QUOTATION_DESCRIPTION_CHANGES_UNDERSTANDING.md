# Quotation Description Changes - Complete Understanding Document

**Date:** November 9, 2025  
**Prepared By:** Senior Developer Analysis  
**Document Type:** Technical Specification & Implementation Plan

---

## 📋 EXECUTIVE SUMMARY

This document provides a comprehensive understanding of the requested changes to the quotation-making process in the solar energy management application. The changes focus on modifying auto-generated descriptions in the "Quotation Pricing Details" table across five project types: **On-Grid, Off-Grid, Hybrid, Water Heater, and Water Pump**.

---

## 🎯 CURRENT SYSTEM OVERVIEW

### Application Structure
The application has a quotation system that:
1. Creates quotations for different project types
2. Auto-generates descriptions based on project configuration
3. Generates Bill of Materials (BOM) tables
4. Creates PDF templates for customer quotations

### Project Types
- **On-Grid Solar System** - Grid-tied solar power
- **Off-Grid Solar System** - Standalone with battery storage
- **Hybrid Solar System** - Grid-tied with battery backup
- **Solar Water Heater** - Water heating system
- **Solar Water Pump** - Solar-powered water pump

### Key Files Involved
1. **Backend:**
   - `server/services/quotation-template-service.ts` - Generates quotation templates and descriptions
   - `server/services/quotation-pdf-service.ts` - PDF generation

2. **Frontend:**
   - `client/src/components/site-visit/marketing-site-visit-form.tsx` - Marketing site visit form
   - `client/src/components/site-visit/site-visit-details-modal.tsx` - Site visit details display
   - `client/src/pages/quotation-creation.tsx` - Quotation creation page

3. **Schema:**
   - `shared/schema.ts` - Data models and validation schemas

---

## 📊 CURRENT DESCRIPTION GENERATION LOGIC

### Location
File: `server/services/quotation-template-service.ts`  
Method: `calculatePricingBreakdown()`  
Lines: 1248-1424

### Current Descriptions

#### 1. ON-GRID (Line 1281)
```
Current: "Supply and Installation of {kW} kW Solar Grid Tie {phase} On GRID Solar System"
Example: "Supply and Installation of 3 kW Solar Grid Tie 1 Phase On GRID Solar System"
```

#### 2. OFF-GRID (Line 1314)
```
Current: "Supply and Installation of {panelWatts}W X {panelCount} Nos Panel, {inverterKVA}KVA/{batteryVolt}v {phase}PH MPPT Inverter, {batteryAH}AH X {batteryCount}, {phase}-Phase Offgrid Solar System"
Example: "Supply and Installation of 340W X 2 Nos Panel, 1KVA/24v 1PH MPPT Inverter, 100AH X 2, 1-Phase Offgrid Solar System"
```

#### 3. HYBRID (Line 1347)
```
Current: "Supply and Installation of {panelWatts}W X {panelCount} Nos Panel, {inverterKVA}KVA/{batteryVolt}v {phase}PH MPPT Inverter, {batteryAH}AH X {batteryCount}, {phase}-Phase Hybrid Solar System"
Example: "Supply and Installation of 10 KW PANEL, 10Kva/120 V 3 Phase Hybrid Inverter, UTL 200ah Lead Acid Battery-10 Nos, Hybrid Solar System"
```

#### 4. WATER HEATER (Line 1368)
```
Current: "Supply and Installation of {litres}L Solar Water Heater - {brand} Brand"
Example: "Supply and Installation of 500L Solar Water Heater - Venus Brand"
```

#### 5. WATER PUMP (Line 1389)
```
Current: "Supply and Installation of {hp}HP Solar Water Pump with {panelCount} Solar Panels"
Example: "Supply and Installation of 5HP Solar Water Pump with 10 Solar Panels"
```

---

## 🔄 REQUIRED CHANGES DETAILED ANALYSIS

### 1. ON-GRID CHANGES

**Current Description Format:**
```
"Supply and Installation of 3 kW Solar Grid Tie 1 Phase On GRID Solar System"
```

**Required Description Format:**
```
"Supply and Installation of 3 kW Solar Grid Tie {inverterKW} KW Inverter {phase} On GRID Solar System"
```

**Changes Needed:**
- ✅ Keep: System kW calculation
- ✅ Keep: Phase (single/three phase)
- ➕ ADD: Inverter KW specification between system kW and phase
- 📝 Note: Some project types use inverterKVA instead of inverterKW

**Data Sources:**
- `project.inverterKW` or calculated from `calculateSystemKW(panelWatts, panelCount)`
- `project.inverterPhase` ('single_phase' → '1 Phase', 'three_phase' → '3 Phase')

---

### 2. OFF-GRID CHANGES

**Current Description (Line 1314):**
```
"Supply and Installation of 340W X 2 Nos Panel, 1KVA/24v 1PH MPPT Inverter, 100AH X 2, 1-Phase Offgrid Solar System"
```

**Required Description Format (based on images):**
```
"Supply and Installation of {panelWatts}W X {panelCount} Nos Panel, {inverterKVA}KVA/{inverterVolt}V {inverterMake} {batteryAH}AH X {batteryCount}, {phase}-Phase Offgrid Solar System"
```

**Detailed Breakdown:**
1. **Panel specification:** `{panelWatts}W X {panelCount}`
   - Source: `project.panelWatts` × `project.panelCount`
   - Example: "340W X 2"

2. **Inverter specification:** `{inverterKVA}KVA/{inverterVolt}V`
   - `inverterKVA`: `project.inverterKVA` or `project.inverterKW`
   - `inverterVolt`: Auto-calculated OR from `project.inverterVolt`
   - Formula: `inverterVolt = batteryVolt × batteryCount` (from BOM table formula)
   - Example: "1KVA/24V"

3. **REMOVE:** "1PH" (not needed)

4. **Inverter Make:** `{inverterMake}`
   - Source: `project.inverterMake` array (first value or joined)
   - Used as MPPT type indicator
   - Example: "MPPT" (from inverter make field)

5. **Battery specification:** `{batteryAH}AH X {batteryCount}`
   - `batteryAH`: `project.batteryAH`
   - `batteryCount`: `project.batteryCount`
   - Example: "100AH X 2"

6. **Phase:** `{phase}-Phase`
   - Source: `project.inverterPhase`
   - Auto-changes based on inverterKW/inverterKVA
   - Example: "1-phase" or "3-phase"

---

### 3. HYBRID CHANGES

**Required Description Format (based on Image 2):**
```
"Supply and Installation of {totalKW} KW PANEL, {inverterKVA}Kva/{inverterVolt}V {phase} Phase Hybrid Inverter, {batteryBrand} {batteryAH}ah {batteryType}-{batteryCount} Nos, Hybrid Solar System"
```

**Detailed Breakdown:**

1. **Panel specification:** `{totalKW} KW PANEL`
   - Formula: `(panelWatts × panelCount) / 1000`
   - Example: "10KW PANEL" (from 540W × ~18 panels)

2. **Inverter specification:** `{inverterKVA}Kva/{inverterVolt}V {phase} Phase`
   - `inverterKVA`: `project.inverterKVA`
   - `inverterVolt`: Auto-calculated OR from field
   - `phase`: "3 Phase" or "1 Phase" from form
   - Example: "10Kva/120V 3 Phase Hybrid Inverter"

3. **Battery specification:** `{batteryBrand} {batteryAH}ah {batteryType}-{batteryCount} Nos`
   - `batteryBrand`: `project.batteryBrand` (e.g., "UTL")
   - `batteryAH`: `project.batteryAH`
   - `batteryType`: `project.batteryType` (e.g., "Lead Acid Battery")
   - `batteryCount`: `project.batteryCount`
   - Example: "UTL 200ah Lead Acid Battery-10 Nos"

---

### 4. WATER HEATER CHANGES

**Current Description:**
```
"Supply and Installation of 500L Solar Water Heater - Venus Brand"
```

**Required Description (based on Image 3):**
```
"Supply and installation of {waterHeaterBrand} make solar water heater {capacityLitres} commercial {waterHeaterModel} with corrosion resistant epoxy Coated Inner tank and powder coated outer tank {heatingCoilType} And Transport Including GST"
```

**Example:**
```
"Supply and installation of Venus make solar water heater 500 LPD commercial Non-Pressurized with corrosion resistant epoxy Coated Inner tank and powder coated outer tank. Heating Coil And Transport Including GST"
```

**NEW FIELDS REQUIRED:**

1. **Qty** (Quantity)
   - New field in schema
   - Input type: Number
   - Default: 1

2. **Water Heater Model** (Pressurized/Non-Pressurized)
   - New field in schema
   - Type: Enum/Select
   - Options: "Pressurized", "Non-Pressurized"
   - Replaces current brand field logic

3. **Labour and Transport** (Checkbox)
   - New boolean field
   - Default: false
   - When checked: Include "Labour and Transport" in description/pricing

**Field Placement in Description:**
- Water Heater Brand: `project.brand` (existing)
- Capacity Litres: `project.litre` (existing) 
- Water Heater Model: `project.waterHeaterModel` (NEW)
- Heating Coil Type: `project.heatingCoil` (existing)
- Labour and Transport: Conditional based on checkbox (NEW)

**PDF TEMPLATE CHANGES FOR WATER HEATER:**
- ❌ REMOVE: "Quotation Pricing Details" table
- ❌ REMOVE: Single row table above BOM
- ✅ KEEP: Simplified BOM table (as shown in Image 5)
  - Columns: SINo, Image, Description, Price, Qty, Amount
  - No complex calculations
  - Simple display format

---

### 5. WATER PUMP CHANGES

**Current Description:**
```
"Supply and Installation of 5HP Solar Water Pump with 10 Solar Panels"
```

**Required Description Format (based on Image 4):**
```
"Supply and Installation solar power

System Includes:{driveHP} hp Drive

{totalKW} kw {panelWatts}Wp x {panelCount} Nos {panelBrand} Panel, {driveHP} hp Drive

{phase} phase, {totalKW} kw Structure

Structure {lowerHeight} feet lower to {higherHeight} feet higher

Earth kit, Lighting Arrester,

DC Cable, Electrical Accessories,

Labour and Transport"
```

**Detailed Breakdown:**

1. **System includes:** `{driveHP} hp Drive`
   - Source: `project.hp` field (RENAMED to `driveHP`)
   - Example: "5 hp Drive"

2. **Panel details:** `{totalKW} kw {panelWatts}Wp x {panelCount} Nos {panelBrand} Panel`
   - `totalKW`: `(panelWatts × panelCount) / 1000` (first value only)
   - `panelWatts`: `project.panelWatts`
   - `panelCount`: `project.panelCount`
   - `panelBrand`: `project.panelBrand` (e.g., "UTL")
   - Example: "5 kw 540Wp x 10 Nos UTL Panel"

3. **Drive:** `{driveHP} hp Drive`
   - Same as Motor HP field (renamed)
   - Example: "5 hp Drive"

4. **Phase and structure:** `{phase} phase, {totalKW} kw Structure`
   - `phase`: From form selection
   - `totalKW`: Same calculation as above
   - Example: "3 phase, 5 kw Structure"

5. **Structure details:** `Structure {lowerHeight} feet lower to {higherHeight} feet higher`
   - Source: `project.gpStructure.lowerEndHeight` and `project.gpStructure.higherEndHeight`
   - Example: "Structure 3 feet lower to 4 feet higher"

6. **Checkboxes - All dynamic based on selection:**
   - Earth kit
   - Lighting Arrester (NEW - same as On-Grid)
   - DC Cable
   - Electrical Accessories (NEW - same as On-Grid)
   - Earth Connection (NEW - same as On-Grid)
   - Labour and Transport (NEW)

**FIELD CHANGES FOR WATER PUMP:**

1. **RENAME:** "Motor HP" → "Drive HP"
   - Update in schema
   - Update in all forms
   - Update in site visit forms
   - Update in site visit details modal

2. **NEW CHECKBOXES:**
   - Lightening Arrest (same as On-Grid implementation)
   - Electrical Accessories (same as On-Grid implementation)
   - Earth Connection (same as On-Grid implementation)
   - Labour and Transport (new checkbox)

**PDF TEMPLATE CHANGES FOR WATER PUMP:**
- ❌ REMOVE: "Quotation Pricing Details" table
- ❌ REMOVE: Single row table above BOM
- ✅ KEEP: Simplified BOM table (as shown in Image 6)
  - Columns: Sl No, Description, QTY, Rate/Qty, Amount
  - No complex calculations
  - Simple display format

---

## 🗂️ SCHEMA CHANGES REQUIRED

### Water Heater Config Schema Update
```typescript
// In shared/schema.ts - waterHeaterConfigSchema
export const waterHeaterConfigSchema = z.object({
  brand: z.enum(waterHeaterBrands),
  litre: z.number().min(1),
  heatingCoil: z.string().optional(),
  productImage: z.string().optional(),
  projectValue: z.number().min(0),
  others: z.string().optional(),
  floor: z.enum(floorLevels).optional(),
  plumbingWorkScope: z.enum(workScopeOptions).optional(),
  civilWorkScope: z.enum(workScopeOptions).optional(),
  
  // NEW FIELDS
  qty: z.number().min(1).default(1),
  waterHeaterModel: z.enum(['pressurized', 'non_pressurized']),
  labourAndTransport: z.boolean().default(false)
});
```

### Water Pump Config Schema Update
```typescript
// In shared/schema.ts - waterPumpConfigSchema
export const waterPumpConfigSchema = z.object({
  driveHP: z.string(), // RENAMED from 'hp'
  drive: z.string(),
  solarPanel: z.string().optional(),
  panelBrand: z.array(z.enum(solarPanelBrands)).default([]),
  panelWatts: z.string().optional(),
  panelType: z.enum(panelTypes).optional(),
  dcrPanelCount: z.number().min(0).default(0),
  nonDcrPanelCount: z.number().min(0).default(0),
  panelCount: z.number().min(1),
  projectValue: z.number().min(0),
  others: z.string().optional(),
  structureType: z.enum(structureTypes).optional(),
  gpStructure: z.object({
    lowerEndHeight: z.enum(heightRange as [string, ...string[]]).optional(),
    higherEndHeight: z.enum(heightRange as [string, ...string[]]).optional()
  }).optional(),
  monoRail: z.object({
    type: z.enum(monoRailOptions).optional()
  }).optional(),
  plumbingWorkScope: z.enum(workScopeOptions).optional(),
  civilWorkScope: z.enum(workScopeOptions).optional(),
  
  // NEW FIELDS
  lightningArrest: z.boolean().default(false),
  electricalAccessories: z.boolean().default(false),
  electricalCount: z.number().min(0).optional(),
  earth: z.array(z.enum(earthingTypes)).default([]),
  labourAndTransport: z.boolean().default(false)
});
```

---

## 🎨 FRONTEND FORM CHANGES

### Water Heater Form (marketing-site-visit-form.tsx)

**NEW FIELDS TO ADD:**

1. **Qty Field** (around line 320-329)
```typescript
<div>
  <Label>Quantity</Label>
  <Input
    type="number"
    min="1"
    value={formData.waterHeaterConfig?.qty || 1}
    onChange={(e) => updateConfig('waterHeaterConfig', { 
      qty: parseInt(e.target.value) || 1 
    })}
  />
</div>
```

2. **Water Heater Model Field**
```typescript
<div>
  <Label>Water Heater Model *</Label>
  <Select
    value={formData.waterHeaterConfig?.waterHeaterModel || 'non_pressurized'}
    onValueChange={(value) => updateConfig('waterHeaterConfig', { 
      waterHeaterModel: value 
    })}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select model type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="pressurized">Pressurized</SelectItem>
      <SelectItem value="non_pressurized">Non-Pressurized</SelectItem>
    </SelectContent>
  </Select>
</div>
```

3. **Labour and Transport Checkbox**
```typescript
<div className="flex items-center space-x-2">
  <Checkbox
    id="water-heater-labour-transport"
    checked={formData.waterHeaterConfig?.labourAndTransport || false}
    onCheckedChange={(checked) => updateConfig('waterHeaterConfig', { 
      labourAndTransport: checked 
    })}
  />
  <Label htmlFor="water-heater-labour-transport">
    Labour and Transport
  </Label>
</div>
```

### Water Pump Form (marketing-site-visit-form.tsx)

**FIELD RENAME:**
- Change all `hp` references to `driveHP`
- Update labels from "Motor HP" to "Drive HP"

**NEW CHECKBOXES TO ADD:**

1. **Lightening Arrest**
```typescript
<div className="flex items-center space-x-2">
  <Checkbox
    id="water-pump-lightning"
    checked={formData.waterPumpConfig?.lightningArrest || false}
    onCheckedChange={(checked) => updateConfig('waterPumpConfig', { 
      lightningArrest: checked 
    })}
  />
  <Label htmlFor="water-pump-lightning">
    Lightening Arrest
  </Label>
</div>
```

2. **Electrical Accessories**
```typescript
<div className="flex items-center space-x-2">
  <Checkbox
    id="water-pump-electrical"
    checked={formData.waterPumpConfig?.electricalAccessories || false}
    onCheckedChange={(checked) => {
      const electricalCount = checked ? 
        (formData.waterPumpConfig?.driveHP ? parseFloat(formData.waterPumpConfig.driveHP) : 1) : 0;
      updateConfig('waterPumpConfig', { 
        electricalAccessories: checked,
        electricalCount 
      });
    }}
  />
  <Label htmlFor="water-pump-electrical">
    Electrical Accessories
  </Label>
</div>
```

3. **Earth Connection**
```typescript
<div>
  <Label>Earth Connection</Label>
  <div className="space-y-2">
    {earthingTypes.map((type) => (
      <div key={type} className="flex items-center space-x-2">
        <Checkbox
          id={`water-pump-earth-${type}`}
          checked={formData.waterPumpConfig?.earth?.includes(type) || false}
          onCheckedChange={(checked) => {
            const currentEarth = formData.waterPumpConfig?.earth || [];
            const newEarth = checked 
              ? [...currentEarth, type]
              : currentEarth.filter(e => e !== type);
            updateConfig('waterPumpConfig', { earth: newEarth });
          }}
        />
        <Label htmlFor={`water-pump-earth-${type}`} className="text-sm">
          {type.toUpperCase()}
        </Label>
      </div>
    ))}
  </div>
</div>
```

4. **Labour and Transport**
```typescript
<div className="flex items-center space-x-2">
  <Checkbox
    id="water-pump-labour-transport"
    checked={formData.waterPumpConfig?.labourAndTransport || false}
    onCheckedChange={(checked) => updateConfig('waterPumpConfig', { 
      labourAndTransport: checked 
    })}
  />
  <Label htmlFor="water-pump-labour-transport">
    Labour and Transport
  </Label>
</div>
```

---

## 🖥️ SITE VISIT DETAILS MODAL CHANGES

### File: `client/src/components/site-visit/site-visit-details-modal.tsx`

**Water Heater Display Updates:**
- Add Qty field display
- Add Water Heater Model display
- Add Labour and Transport indicator

**Water Pump Display Updates:**
- Change "Motor HP" label to "Drive HP"
- Add Lightening Arrest indicator
- Add Electrical Accessories indicator
- Add Earth Connection display
- Add Labour and Transport indicator

---

## 🔄 BACKEND DESCRIPTION GENERATION CHANGES

### File: `server/services/quotation-template-service.ts`

### Method: `calculatePricingBreakdown()` - Line 1248

#### 1. ON-GRID Description Update (Line 1281)
```typescript
// BEFORE:
description = `Supply and Installation of ${Math.floor(kw)} kW Solar Grid Tie ${project.inverterPhase === 'three_phase' ? '3 Phase' : '1 Phase'} On GRID Solar System`;

// AFTER:
const inverterKW_onGrid = project.inverterKW || calculatedKW;
const phase_onGrid = project.inverterPhase === 'three_phase' ? '3 Phase' : '1 Phase';
description = `Supply and Installation of ${Math.floor(kw)} kW Solar Grid Tie ${inverterKW_onGrid} KW Inverter ${phase_onGrid} On GRID Solar System`;
```

#### 2. OFF-GRID Description Update (Line 1314)
```typescript
// BEFORE:
description = `Supply and Installation of ${panelWatts_offGrid}W X ${panelCount_offGrid} Nos Panel, ${inverterKVA_offGrid}KVA/${batteryVolt_offGrid}v ${phase_offGrid}PH MPPT Inverter, ${batteryAH_offGrid}AH X ${batteryCount_offGrid}, ${phase_offGrid}-Phase Offgrid Solar System`;

// AFTER:
const panelWatts_offGrid = project.panelWatts || '530';
const panelCount_offGrid = project.panelCount || 1;
const inverterKVA_offGrid = (project as any).inverterKVA || project.inverterKW || '1';
const inverterVolt_offGrid = project.inverterVolt || (project.voltage * project.batteryCount);
const inverterMake_offGrid = project.inverterMake?.length > 0 ? project.inverterMake[0].toUpperCase() : 'MPPT';
const batteryAH_offGrid = project.batteryAH || '100';
const batteryCount_offGrid = project.batteryCount || 1;
const phase_offGrid = project.inverterPhase === 'three_phase' ? '3' : '1';

description = `Supply and Installation of ${panelWatts_offGrid}W X ${panelCount_offGrid} Nos Panel, ${inverterKVA_offGrid}KVA/${inverterVolt_offGrid}V ${inverterMake_offGrid} ${batteryAH_offGrid}AH X ${batteryCount_offGrid}, ${phase_offGrid}-Phase Offgrid Solar System`;
```

#### 3. HYBRID Description Update (Line 1347)
```typescript
// BEFORE:
description = `Supply and Installation of ${panelWatts_hybrid}W X ${panelCount_hybrid} Nos Panel, ${inverterKVA_hybrid}KVA/${batteryVolt_hybrid}v ${phase_hybrid}PH MPPT Inverter, ${batteryAH_hybrid}AH X ${batteryCount_hybrid}, ${phase_hybrid}-Phase Hybrid Solar System`;

// AFTER:
const totalKW_hybrid = this.calculateSystemKW(project.panelWatts || 530, project.panelCount || 1);
const inverterKVA_hybrid = (project as any).inverterKVA || project.inverterKW || '1';
const inverterVolt_hybrid = project.inverterVolt || (project.voltage * project.batteryCount);
const phase_hybrid = project.inverterPhase === 'three_phase' ? '3' : '1';
const batteryBrand_hybrid = project.batteryBrand || 'Exide';
const batteryAH_hybrid = project.batteryAH || '100';
const batteryTypeMap: Record<string, string> = {
  'lead_acid': 'Lead Acid Battery',
  'lithium': 'Lithium Battery'
};
const batteryType_hybrid = project.batteryType ? batteryTypeMap[project.batteryType] : 'Lead Acid Battery';
const batteryCount_hybrid = project.batteryCount || 1;

description = `Supply and Installation of ${totalKW_hybrid} KW PANEL, ${inverterKVA_hybrid}Kva/${inverterVolt_hybrid}V ${phase_hybrid} Phase Hybrid Inverter, ${batteryBrand_hybrid} ${batteryAH_hybrid}ah ${batteryType_hybrid}-${batteryCount_hybrid} Nos, Hybrid Solar System`;
```

#### 4. WATER HEATER Description Update (Line 1368)
```typescript
// BEFORE:
description = `Supply and Installation of ${litres}L Solar Water Heater - ${project.brand || 'Standard'} Brand`;

// AFTER:
const waterHeaterBrand = project.brand || 'Standard';
const capacityLitres = project.litre || 100;
const waterHeaterModel = project.waterHeaterModel === 'pressurized' ? 'Pressurized' : 'Non-Pressurized';
const heatingCoilType = project.heatingCoil || 'Heating Coil';

description = `Supply and installation of ${waterHeaterBrand} make solar water heater ${capacityLitres} LPD commercial ${waterHeaterModel} with corrosion resistant epoxy Coated Inner tank and powder coated outer tank. ${heatingCoilType} And Transport Including GST`;
```

#### 5. WATER PUMP Description Update (Line 1389)
```typescript
// BEFORE:
description = `Supply and Installation of ${hp}HP Solar Water Pump with ${project.panelCount || 4} Solar Panels`;

// AFTER:
const driveHP_pump = project.driveHP || project.hp || '1'; // Fallback for old data
const panelWatts_pump = project.panelWatts || '540';
const panelCount_pump = project.panelCount || 10;
const totalKW_pump = Math.floor((parseInt(panelWatts_pump) * panelCount_pump) / 1000);
const panelBrand_pump = project.panelBrand?.length > 0 ? project.panelBrand[0].toUpperCase() : 'UTL';
const phase_pump = project.inverterPhase === 'three_phase' ? '3' : '1';
const lowerHeight = project.gpStructure?.lowerEndHeight || '3';
const higherHeight = project.gpStructure?.higherEndHeight || '4';

let descriptionParts = [
  'Supply and Installation solar power',
  '',
  `System Includes:${driveHP_pump} hp Drive`,
  '',
  `${totalKW_pump} kw ${panelWatts_pump}Wp x ${panelCount_pump} Nos ${panelBrand_pump} Panel, ${driveHP_pump} hp Drive`,
  '',
  `${phase_pump} phase, ${totalKW_pump} kw Structure`,
  '',
  `Structure ${lowerHeight} feet lower to ${higherHeight} feet higher`
];

// Add checkbox items
const checkboxItems = [];
if (project.earth && project.earth.length > 0) checkboxItems.push('Earth kit');
if (project.lightningArrest) checkboxItems.push('Lighting Arrester');
if (project.dcCable) checkboxItems.push('DC Cable');
if (project.electricalAccessories) checkboxItems.push('Electrical Accessories');
if (project.labourAndTransport) checkboxItems.push('Labour and Transport');

if (checkboxItems.length > 0) {
  descriptionParts.push('');
  descriptionParts.push(checkboxItems.join(', '));
}

description = descriptionParts.join('\n');
```

---

## 📄 PDF TEMPLATE CHANGES

### File: `server/services/quotation-pdf-service.ts`

### Water Heater PDF Updates
1. **Remove Quotation Pricing Details table**
   - Add conditional logic to skip this table for water_heater project type
   
2. **Remove single row table above BOM**
   - Add conditional logic to skip this table for water_heater project type

3. **Simplify BOM table structure**
   - Use simplified columns: SINo, Image, Description, Price, Qty, Amount
   - Remove complex calculation columns

### Water Pump PDF Updates
1. **Remove Quotation Pricing Details table**
   - Add conditional logic to skip this table for water_pump project type
   
2. **Remove single row table above BOM**
   - Add conditional logic to skip this table for water_pump project type

3. **Simplify BOM table structure**
   - Use simplified columns: Sl No, Description, QTY, Rate/Qty, Amount
   - Remove complex calculation columns

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Schema Updates
- [ ] Update `waterHeaterConfigSchema` in `shared/schema.ts`
  - [ ] Add `qty` field
  - [ ] Add `waterHeaterModel` enum field
  - [ ] Add `labourAndTransport` boolean field
- [ ] Update `waterPumpConfigSchema` in `shared/schema.ts`
  - [ ] Rename `hp` to `driveHP`
  - [ ] Add `lightningArrest` boolean field
  - [ ] Add `electricalAccessories` boolean field
  - [ ] Add `electricalCount` number field
  - [ ] Add `earth` array field
  - [ ] Add `labourAndTransport` boolean field

### Phase 2: Backend Description Updates
- [ ] Update On-Grid description in `calculatePricingBreakdown()`
  - [ ] Add inverter KW to description
- [ ] Update Off-Grid description in `calculatePricingBreakdown()`
  - [ ] Add inverter volt calculation
  - [ ] Add inverter make
  - [ ] Remove "PH" from description
  - [ ] Update formatting
- [ ] Update Hybrid description in `calculatePricingBreakdown()`
  - [ ] Change to KW PANEL format
  - [ ] Add battery brand
  - [ ] Add battery type (full name)
  - [ ] Update formatting
- [ ] Update Water Heater description in `calculatePricingBreakdown()`
  - [ ] Add water heater model
  - [ ] Add heating coil type
  - [ ] Add full description text
- [ ] Update Water Pump description in `calculatePricingBreakdown()`
  - [ ] Use driveHP instead of hp
  - [ ] Add panel brand
  - [ ] Add phase and structure details
  - [ ] Add checkbox-based items
  - [ ] Format as multi-line description

### Phase 3: Frontend Form Updates
- [ ] Update Water Heater form in `marketing-site-visit-form.tsx`
  - [ ] Add Qty input field
  - [ ] Add Water Heater Model select field
  - [ ] Add Labour and Transport checkbox
  - [ ] Update interface definition
  - [ ] Update default values in `handleProjectTypeChange()`
- [ ] Update Water Pump form in `marketing-site-visit-form.tsx`
  - [ ] Rename "Motor HP" label to "Drive HP"
  - [ ] Change `hp` field to `driveHP` in all references
  - [ ] Add Lightening Arrest checkbox
  - [ ] Add Electrical Accessories checkbox with auto-count
  - [ ] Add Earth Connection multi-checkbox
  - [ ] Add Labour and Transport checkbox
  - [ ] Update interface definition
  - [ ] Update default values in `handleProjectTypeChange()`

### Phase 4: Site Visit Details Modal Updates
- [ ] Update `site-visit-details-modal.tsx` for Water Heater
  - [ ] Add Qty display
  - [ ] Add Water Heater Model display
  - [ ] Add Labour and Transport indicator
- [ ] Update `site-visit-details-modal.tsx` for Water Pump
  - [ ] Change "Motor HP" to "Drive HP"
  - [ ] Add Lightening Arrest indicator
  - [ ] Add Electrical Accessories indicator
  - [ ] Add Earth Connection display
  - [ ] Add Labour and Transport indicator

### Phase 5: PDF Template Updates
- [ ] Update `quotation-pdf-service.ts`
  - [ ] Add conditional logic to skip "Quotation Pricing Details" table for water_heater and water_pump
  - [ ] Add conditional logic to skip single row table above BOM for water_heater and water_pump
  - [ ] Create simplified BOM table template for water_heater
  - [ ] Create simplified BOM table template for water_pump

### Phase 6: Testing
- [ ] Test On-Grid quotation generation
  - [ ] Verify description includes inverter KW
  - [ ] Verify phase is displayed correctly
- [ ] Test Off-Grid quotation generation
  - [ ] Verify inverter volt calculation
  - [ ] Verify inverter make display
  - [ ] Verify battery details
  - [ ] Verify phase display
- [ ] Test Hybrid quotation generation
  - [ ] Verify KW PANEL format
  - [ ] Verify battery brand, AH, and type
  - [ ] Verify description formatting
- [ ] Test Water Heater quotation generation
  - [ ] Verify new fields appear in form
  - [ ] Verify description generation
  - [ ] Verify PDF template (no pricing table, simplified BOM)
  - [ ] Test site visit form submission
  - [ ] Test site visit details modal display
- [ ] Test Water Pump quotation generation
  - [ ] Verify "Drive HP" labeling
  - [ ] Verify new checkboxes appear
  - [ ] Verify description generation with dynamic items
  - [ ] Verify PDF template (no pricing table, simplified BOM)
  - [ ] Test site visit form submission
  - [ ] Test site visit details modal display

### Phase 7: Data Migration (if needed)
- [ ] Create migration script for existing water_pump data
  - [ ] Rename `hp` field to `driveHP` in existing records
  - [ ] Add default values for new fields

---

## 🔍 IMPORTANT NOTES

1. **Backward Compatibility:**
   - For water pump, include fallback: `project.driveHP || project.hp` to support old data
   - Ensure default values for new fields don't break existing quotations

2. **Validation:**
   - Water Heater Model should be required field
   - Qty should have minimum value of 1
   - All checkbox fields should default to false

3. **Formula Reference:**
   - Inverter Volt calculation for Off-Grid/Hybrid: `batteryVolt × batteryCount`
   - Total KW calculation: `(panelWatts × panelCount) / 1000`

4. **PDF Template:**
   - Water Heater and Water Pump use simplified BOM without complex calculations
   - Image column is present in Water Heater BOM (as per requirement)
   - QTY and Rate/Qty columns important for water heater and water pump

5. **Conditional Display:**
   - Labour and Transport checkbox should affect both description and pricing
   - All optional items should be conditionally displayed in description

---

## 📊 DATA FLOW SUMMARY

```
Site Visit Form (Marketing)
    ↓
  Schema Validation
    ↓
  Save to Database
    ↓
  Quotation Creation
    ↓
  calculatePricingBreakdown()
    ↓
  Generate Description (Updated Logic)
    ↓
  Generate BOM
    ↓
  Generate PDF Template
    ↓
  Final Quotation PDF
```

---

## 🎯 SUCCESS CRITERIA

1. ✅ All 5 project types generate correct descriptions
2. ✅ New fields are properly validated in schema
3. ✅ Forms display new fields with proper labels
4. ✅ Site visit details modal shows updated information
5. ✅ PDF templates render correctly for all project types
6. ✅ Water Heater and Water Pump PDFs use simplified BOM
7. ✅ No breaking changes to existing quotations
8. ✅ All descriptions match the format shown in provided images

---

**END OF DOCUMENT**
