# Comprehensive Blueprint: Feature Implementation & Downstream Impact Analysis

This document is the **definitive implementation guide** for executing the requested feature changes across the Solar ERP. It meticulously details the explicit files, code blocks, and data flows that must be altered.

---

## 1. Executive Summary
The requested features require precise modifications across the Zod schema layer, the React Frontend UI, and Node.js Backend services. The overarching constraint is maintaining **Legacy Record Compatibility** (so ancient quotations don't corrupt the UI) and preserving **Midnight Cron Jobs** (so backend validations don't inadvertently fail automated site-visit cleanups).

---

## 2. Shared Types & Data Structures
**Target File**: `shared/schema.ts`

### 2.1 Employee Status & Leave Binding
*   **Request**: Implement a "Leave on/off" toggle for new employees.
*   **Business Logic Constraint**: Freshly joined employees (new hires or those on probation) should not have access to the formal Leave Application UI yet, as their reliability is still being monitored before granting formal benefits.
*   **Action**: In `shared/schema.ts`, extend the `User` schema directly to include a strict boolean: `isLeaveEnabled: z.boolean().default(false)`.
*   **Execution Scope**: 
    1.  **HR UI Toggle**: Add a Switch/Checkbox in the `hr-management.tsx` forms bound to `isLeaveEnabled`.
    2.  **UI Access Check (`client/src/pages/leave.tsx`)**: The frontend Leave Page must evaluate `if (!user.isLeaveEnabled) return <AccessDeniedMessage />`. This instantly revokes their ability to click "Apply Leave" or view the Leave Application dashboard entirely, perfectly satisfying the client constraint without spoofing complex payroll ledgers.
*   **Action**: Leverage the existing `"on_leave"` string inside the array `["active", "inactive", "probation", "terminated", "notice_period", "on_leave"]`.

### 2.2 Earthing Types (`earthingTypes`)
*   **Action**: Strip `"ac_dc"` from the `earthingTypes` array, leaving only `["dc", "ac"]`. 

### 2.3 Water Heater Configuration (`waterHeaterConfigSchema`)
*   **Action**: Refactor `heatingCoil` from `z.string().nullish()` to strictly `z.enum(['Yes', 'No'])`.

### 2.4 Backup Solutions (`backupSolutionsSchema`)
*   **Action**: Refactor `backupHours` from `z.array(z.number())` to accept string formats natively, e.g., `z.array(z.union([z.number(), z.string()]))` or strictly string representation `['1.56']` representing hours and minutes.

---

## 3. Human Resources UI Integration
**Target File**: `client/src/pages/hr-management.tsx`

### 3.1 "On Leave" Toggle
*   **Action**: Inside the `<Select>` component for Employee Status, ensure the Enum maps cleanly to the UI label "On Leave". 

### 3.2 Mandatory Profile Documents
*   **Action**: Currently, the `DocumentUpload` component uses a superficial `required={true}` React prop. 
*   **Execution (Creation)**: Inside the `onSubmit` handler (around line ~220), explicitly block the `createUserMutation` payload if `!data.profilePhotoUrl || !data.aadharCardUrl || !data.panCardUrl`.
*   **Execution (Legacy Grandfathering - CRITICAL)**: Inside the `onEditSubmit` handler (around line ~418), you must **NOT** strictly enforce these missing binary files. If an administrator is trying to mark an ancient employee as "inactive" or change their division, forcing them to randomly upload a PAN card created two years prior will lock the system. Maintain loose constraints for `updateUserMutation`.
*   **Execution (Employee ID)**: Ensure the `employeeId` field is validated rigorously for new creations, permanently deprecating the `{ fallback: randomString }` logic. 

---

## 4. CRM & Site Visit Workflow
**Target Files**: 
1. `client/src/components/site-visit/site-visit-checkout-modal.tsx`
2. `server/services/site-visit-auto-close-service.ts`

### 4.1 Strict Checkout Guardrails
*   **Action**: Require mandatory Site Photos and Completion Notes specifically before confirming checkout.
*   **Execution (CRITICAL)**: Enforce this restriction **ONLY** within the React component's `disabled` button logic: `!capturedPhotos.selfie || capturedPhotos.sitePhotos.length === 0 || notes.trim().length === 0`.
*   **Why**: If added to the backend `updateSiteVisitSchema`, the midnight `site-visit-auto-close-service.ts` cron job will fail to auto-close stale records because the cron lacks photo/notes metadata.

### 4.2 Form State Scrubbing
**Target Files**: 
1. `client/src/components/site-visit/marketing-site-visit-form.tsx`
2. `client/src/pages/quotation-creation.tsx`

*   **Total Panel Count Lockout**: Inside `quotation-creation.tsx` (around lines 1745 and 3051), locate the `<Input type="number">` block for `Total Panel Count`. Add the `disabled={true}` React property. Alter the `onChange` logic of `dcrPanelCount` and `nonDcrPanelCount` directly above it to forcefully sum and set `project.panelCount`.
*   **Heating Coil UI Inputs**: Convert the text `<Input>` field to a `"Yes" / "No"` `<Select>` dropdown. This must be done in **both** `marketing-site-visit-form.tsx` *and* the manual Water Heater block inside `quotation-creation.tsx` (around line ~2742) to prevent divergent data entries.
*   **Heating Coil Grammar Builders**: Inside `quotation-creation.tsx` (around line 264), the frontend duplicates the backend's text-generation logic. You must apply the same grammar conditionally here (`heatingCoil === 'Yes' ? 'with Heating Coil' : ''`) as you do in the backend `quotation-template-service.ts`.
*   **Earthing Dropdown**: Remove `"ac_dc"` from the selectable options. When loading old records into state, utilize a fallback like `value === 'ac_dc' ? 'AC/DC' : ...` to prevent React render crashes on legacy data.
*   **Earthing Checkboxes (`quotation-creation.tsx`)**: Around lines ~2039 and ~3331, there are React `.map()` loops rendering `earthingTypes` where the label renders `{type === 'ac_dc' ? 'AC/DC' : type.toUpperCase()}`. Remove this dead ternary logic. Ensure legacy state containing `['ac_dc']` translates effectively to `['ac', 'dc']` checkboxes upon form load so ancient form data doesn't silently hide from view.
*   **Strict Checklists**: Update the `isFormValid` boolean block to rigorously check `panelCount` and missing strings block progression.

---

## 5. Engineering Backend Engines
**Target Files**: 
1. `server/services/quotation-template-service.ts`
2. `server/services/quotation-mapping-service.ts`

### 5.1 AC/DC Quotation Mapping Crashes
*   **Execution**: In `quotation-mapping-service.ts`, remove the hardcoded fallback `earth: config.earth || "ac_dc"`. Default it safely to `[]` to prevent the Zod parser from throwing 500 errors when generating On-Grid quotes.

### 5.2 AC/DC Legacy Pricing Logic
*   **Execution**: Inside `quotation-template-service.ts` (`calculatePricingBreakdown`), refactor all legacy `.includes('ac_dc')` math checks. Map math to check for distinct `['ac']` and `['dc']` array elements individually to preserve historical quote integrity while serving new data.

### 5.3 Backup Solution Conversion
*   **Execution**: In `quotation-template-service.ts` -> `calculateBackupSolutions()`, rewrite the logic returning `1.94` hours.
*   **Algorithm**: Compute `Math.floor(hours)` mapped to `(fraction * 60)` to generate a strict base-60 string, e.g., `"1.56"`. Ensure `quotation-creation.tsx` runs the exact identical parsing logic on the frontend live-preview listener.
*   **React UI Crash Prevention (CRITICAL)**: Because `backupHours` elevates from a `number[]` to a `string[]`, the React UI table in `quotation-creation.tsx` (around line ~2653) will throw a fatal `TypeError` when it attempts to run `.toFixed(2)` on the new strings. You MUST remove `.toFixed(2)` from the `{backupSolutions.backupHours[index]?.toFixed(2) || '0.00'}` display block.

### 5.4 Grammar Builder for Heating Coil
*   **Execution**: Inside `generateProjectDescription` (`quotation-template-service.ts`), replace the direct string inject: ``...powder coated outer tank. ${heatingCoilType}`` 
*   **Algorithm**: Mutate the injected variable conditionally: `heatingCoilType === 'Yes' ? 'with Heating Coil' : 'without Heating Coil'`.

---

## 6. Document Generation Pipelines
**Target Files**:
1. `server/services/quotation-pdf-service.ts`
2. `client/src/pages/quotation-creation.tsx`

### 6.1 Conditionally Rendered Blocks
*   **Action**: The "Documents Required for PM Surya Ghar" block must render **only** for `on_grid` systems.
*   **Execution**:
    1.  **PDF Backend**: Wrap the `<div class="documents-section">` HTML blocks with `if (quotation.projects.some(p => p.projectType === 'on_grid'))`.
    2.  **Live Preview**: In the React view, verify the boolean wrapper mimics this logic: `{projects.some(p => p.projectType === 'on_grid') && ( <h4>Documents Required...</h4> )}`.

---

## 7. Execution Checklist Summary
When proceeding to the execution phase, follow this exact progression:
1. Update `schema.ts`.
2. Refactor `quotation-mapping-service.ts` & `quotation-template-service.ts`.
3. Refactor `quotation-pdf-service.ts`.
4. Deploy `hr-management.tsx` strict form guards & status toggles.
5. Deploy `site-visit-checkout-modal.tsx` manual UI guards (protecting crons).
6. Deploy `marketing-site-visit-form.tsx` React component modifications.
7. Local testing round mimicking ancient quotation records.
