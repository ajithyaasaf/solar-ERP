 - [ ] Change "Motor HP" to "Drive HP"
  - [ ] Change "Plumbing Work" to "Earth Work"
  - [ ] Add Lightening Arrest indicator
  - [ ] Add Electrical Accessories indicator
  - [ ] Add Earth Connection display
  - [ ] Add Labour and Transport indicator

### Phase 6: PDF Template Updates
- [ ] Update `quotation-pdf-service.ts`
  - [ ] Add conditional logic to skip "Quotation Pricing Details" table for water_heater and water_pump
  - [ ] Add conditional logic to skip single row table above BOM for water_heater and water_pump
  - [ ] Create simplified BOM table template for water_heater (NO Image column)
  - [ ] Create simplified BOM table template for water_pump
  - [ ] Add "Installation on {floor}" text after BOM table for water_heater

### Phase 7: Testing
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
  - [ ] Verify PDF template (no pricing table, simplified BOM, floor installation text)
  - [ ] Test site visit form submission
  - [ ] Test site visit details modal display
  - [ ] Test quotation creation UI (hidden sections)
- [ ] Test Water Pump quotation generation
  - [ ] Verify "Drive HP" labeling
  - [ ] Verify "Earth Work" field replacement
  - [ ] Verify new checkboxes appear
  - [ ] Verify description generation with dynamic items
  - [ ] Verify PDF template (no pricing table, simplified BOM)
  - [ ] Test site visit form submission
  - [ ] Test site visit details modal display
  - [ ] Test quotation creation UI (hidden sections)

### Phase 8: Data Migration (if needed)
- [ ] Create migration script for existing water_pump data
  - [ ] Rename `hp` field to `driveHP` in existing records
  - [ ] Rename `plumbingWorkScope` field to `earthWork` in existing records
  - [ ] Add default values for new fields

---

## 🔍 IMPORTANT NOTES

1. **Backward Compatibility:**
   - For water pump, include fallback: `project.driveHP || project.hp` to support old data
   - For water pump, include fallback: `project.earthWork || project.plumbingWorkScope` to support old data
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
   - Image column is REMOVED from Water Heater BOM (as per client requirement: "Image (no needed)")
   - QTY and Rate/Qty columns important for water heater and water pump
   - Water Heater PDF should include floor installation text after BOM table

5. **Conditional Display:**
   - Labour and Transport checkbox should affect both description and pricing
   - All optional items should be conditionally displayed in description
   - UI sections should be conditionally hidden based on project type

6. **Field Replacement Clarification:**
   - Water Pump: "Plumbing Work" field is being REPLACED (not added alongside), change field name from `plumbingWorkScope` to `earthWork`
   - This affects schema, forms, modal, and backend references

---

## 📊 DATA FLOW SUMMARY

```
Site Visit Form (Marketing)
    ↓
  Schema Validation
    ↓
  Save to Database
    ↓
  Quotation Creation (with conditional UI for Water Heater/Water Pump)
    ↓
  calculatePricingBreakdown()
    ↓
  Generate Description (Updated Logic)
    ↓
  Generate BOM
    ↓
  Generate PDF Template (with conditional sections)
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
7. ✅ Water Heater PDF includes floor installation text after BOM
8. ✅ Water Heater and Water Pump quotation creation UI hides specified sections
9. ✅ No breaking changes to existing quotations
10. ✅ All descriptions match the format shown in provided images
11. ✅ Water Pump "Plumbing Work" field successfully replaced with "Earth Work"
12. ✅ Backward compatibility maintained with proper fallbacks

---

**END OF DOCUMENT**
