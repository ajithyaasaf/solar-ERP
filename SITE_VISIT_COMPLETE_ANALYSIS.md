# Site Visit Management System - EXHAUSTIVE COMPLETE ANALYSIS

**Total Codebase Size:** 12,361 lines in components + 837 lines service layer + 2,087 lines schema

---

## PART 1: COMPLETE SCHEMA DEFINITIONS

### 1.1 Location Schema
```typescript
// Validation: Both latitude and longitude required
latitude: -90 to 90 (numbers, validated)
longitude: -180 to 180 (numbers, validated)
accuracy: GPS accuracy in meters (optional, number)
address: Human-readable address (optional, string)
formattedAddress: Full formatted address from Google Maps (optional)

Example:
{
  latitude: 13.0827,
  longitude: 80.2707,
  accuracy: 5.5,
  address: "Chennai, TN 600002",
  formattedAddress: "123 Anna Salai, Chennai, Tamil Nadu 600002, India"
}
```

### 1.2 Customer Details Schema
```typescript
// All customer data required at creation
name: string (min 2 chars)                    // Customer name
mobile: string (min 10 chars)                 // Phone number
address: string (min 3 chars)                 // Property/site address
propertyType: enum [residential|commercial|agri|other]
ebServiceNumber: optional string              // Electricity account number
location: optional string                     // Additional location field
source: string (min 1 char)                   // Lead source (referral/web/etc)

Duplicate Detection Logic:
- Check by MOBILE NUMBER only (unique identifier)
- If duplicate found → Use existing customer
- If new → Create new customer record
```

### 1.3 Technical Visit Data Schema
```typescript
serviceTypes: string[]  
  // Multi-select from: on_grid, off_grid, hybrid, solar_panel, camera,
  // water_pump, water_heater, lights_accessories, others
  // Min 1, no max limit
  
workType: enum
  // Single selection from: installation, wifi_configuration, amc, service,
  // electrical_fault, inverter_fault, solar_panel_fault, wiring_issue,
  // structure, welding_work, site_visit, light_installation, camera_fault,
  // light_fault, repair, painting, cleaning, others
  
workingStatus: enum [pending|completed]
  // If pending: pendingRemarks must be provided
  
pendingRemarks: optional string               // Explanation if pending
teamMembers: string[]                         // Team member names (array)
description: optional string                  // Work description
```

### 1.4 Marketing Visit Data Schemas (COMPLEX!)

#### OnGridConfig Schema (Most detailed)
```typescript
// Solar Panel Configuration
solarPanelMake: enum[]    // Multi-select: renew, premier, utl_solar, loom_solar, etc.
panelWatts: string        // Enum: 210, 335, 410, 530, 535, 540, 550, 590, 610, 615
panelType: enum           // bifacial, topcon, mono_perc (optional)
dcrPanelCount: number (min 0, default 0)
nonDcrPanelCount: number (min 0, default 0)
panelCount: number (min 1)

// Inverter Configuration
inverterMake: enum[]      // Multi-select: growatt, deye, polycab, utl, microtech
inverterPhase: enum       // single_phase OR three_phase (required)
inverterKW: number (optional, min 0)
inverterQty: number (optional, min 1)

// Electrical Setup
lightningArrest: boolean (default false)
electricalAccessories: boolean (default false)
electricalCount: number (optional, min 0)
earth: enum[]             // Multi-select: dc, ac, ac_dc

// Installation Details
floor: enum               // 0, 1, 2, 3, 4
structureType: enum       // gp_structure, mono_rail, gi_structure, gi_round_pipe, ms_square_pipe
gpStructure: {
  lowerEndHeight: enum    // 0-14 height range
  higherEndHeight: enum   // 0-14 height range
}
monoRail: {
  type: enum              // mini_rail OR long_rail
}

// Scope Management
civilWorkScope: enum      // customer_scope OR company_scope
netMeterScope: enum       // customer_scope OR company_scope

// Valuation
projectValue: number (min 0)
others: optional string
```

#### OffGridConfig Schema (Extends OnGrid + Battery)
```typescript
// EVERYTHING from OnGrid, PLUS:

batteryBrand: enum        // exide, utl, exide_utl (required!)
batteryType: enum         // lead_acid OR lithium
batteryAH: enum           // 100, 120, 150, 200
voltage: number (min 0, required!)
batteryCount: number (min 1, required!)
batteryStands: optional string

inverterVolt: string      // Custom value (48, 96, 120, 180, 240, 360)
inverterKVA: string       // For off-grid, rated in KVA not KW

// Note: NO netMeterScope (off-grid doesn't have net meter)
```

#### HybridConfig Schema (OffGrid + NetMeter)
```typescript
// EVERYTHING from OffGrid, PLUS:

netMeterScope: enum       // Hybrid has net meter back
inverterKVA: string       // Can be KVA or KW
```

#### WaterHeaterConfig Schema
```typescript
brand: enum               // venus, hykon, supreme (required!)
litre: number (min 1, required!)
heatingCoil: optional string
floor: enum               // 0-4
waterHeaterModel: enum    // pressurized OR non_pressurized (default)
qty: number (min 1, default 1)

plumbingWorkScope: enum   // customer_scope OR company_scope
civilWorkScope: enum      // customer_scope OR company_scope

labourAndTransport: boolean (default false)
projectValue: number (min 0)
others: optional string
```

#### WaterPumpConfig Schema
```typescript
// Pump Specifications
driveHP: optional string  // Drive horsepower
hp: optional string       // Backward compatibility
drive: string (required!)
solarPanel: optional string

// Panel Configuration
panelBrand: enum[]        // Multi-select solar brands
panelWatts: optional string
panelType: enum           // bifacial, topcon, mono_perc
dcrPanelCount: number (min 0, default 0)
nonDcrPanelCount: number (min 0, default 0)
panelCount: number (min 1)

// Structure & Installation
structureType: enum       // gp_structure, mono_rail, gi_structure, etc.
gpStructure: { lowerEndHeight, higherEndHeight }
monoRail: { type: mini_rail OR long_rail }

// Electrical Specifications
inverterPhase: enum       // single_phase OR three_phase
lightningArrest: boolean (default false)
dcCable: boolean (default false)
electricalAccessories: boolean (default false)
electricalCount: number (optional)
earth: enum[]             // dc, ac, ac_dc

// Scope
earthWork: enum           // customer_scope OR company_scope
plumbingWorkScope: enum   // customer_scope OR company_scope (backward compat)
civilWorkScope: enum      // customer_scope OR company_scope

labourAndTransport: boolean (default false)
projectValue: number (min 0)
qty: number (min 1, default 1)
others: optional string
```

### 1.5 Admin Visit Data Schema
```typescript
bankProcess: optional {
  step: enum [registration|document_verification|site_inspection|head_office_approval|amount_credited]
  description: optional string
}

ebProcess: optional {
  type: enum [new_connection|tariff_change|name_transfer|load_upgrade|
              inspection_before_net_meter|net_meter_followup|
              inspection_after_net_meter|subsidy]
  description: optional string
}

purchase: optional string          // Purchase order details
driving: optional string           // Driving related work
officialCashTransactions: optional string  // Cash transaction details
officialPersonalWork: optional string      // Official personal work details
others: optional string            // Any other admin work
```

### 1.6 Site Photo Schema
```typescript
url: string (URL format, required!)
location: Location object
timestamp: Date (ISO string or Date object)
description: optional string

Max photos per visit: 20
```

### 1.7 Main Site Visit Insert Schema
```typescript
// Core Fields
userId: string                                // Employee ID
department: enum [technical|marketing|admin]
visitPurpose: enum [visit|installation|service|purchase|eb_office|amc|bank|other]

// Timing & Location
siteInTime: Date                              // Check-in time
siteInLocation: Location object               // GPS at check-in
siteInPhotoUrl: optional string               // Check-in photo URL
siteOutTime: optional Date                    // Check-out time (null until checkout)
siteOutLocation: optional Location            // GPS at check-out
siteOutPhotoUrl: optional string              // Check-out selfie URL
siteOutPhotos: optional string[]              // Multiple checkout photos (max 20)

// Customer
customer: CustomerDetails object              // Full customer info
customerId: optional string                   // Reference to customer record

// Department Data
technicalData: optional TechnicalVisitData
marketingData: optional MarketingSiteVisit
adminData: optional AdminSiteVisit

// Photos Collection
sitePhotos: SitePhoto[]                       // Array of photos (max 20)

// Follow-up System
isFollowUp: boolean (default false)           // Is this a follow-up?
followUpOf: optional string                   // Original visit ID
hasFollowUps: boolean (default false)         // Does this visit have follow-ups?
followUpCount: number (default 0)             // Number of follow-ups
followUpReason: optional string               // Why follow-up needed
followUpDescription: optional string          // Description

// Visit Outcome (Business Classification)
visitOutcome: enum [converted|on_process|cancelled] (optional)
outcomeNotes: optional string
scheduledFollowUpDate: optional Date
outcomeSelectedAt: optional Date
outcomeSelectedBy: optional string

// Dynamic Status Management
customerCurrentStatus: enum [converted|on_process|cancelled] (optional)
  // KEY FIELD: Current customer status based on latest activity
lastActivityType: enum [initial_visit|follow_up] (default: initial_visit)
lastActivityDate: Date (default: now)
activeFollowUpId: optional string             // Reference to active follow-up

// General
notes: optional string
status: enum [in_progress|completed|cancelled] (default: in_progress)
createdAt: Date
updatedAt: Date
```

### 1.8 Follow-Up Site Visit Insert Schema
```typescript
// Reference
originalVisitId: string (required!)           // Original visit ID

// Core
userId: string
department: enum [technical|marketing|admin]
siteInTime: Date (default: now)
siteInLocation: Location
siteInPhotoUrl: optional string
siteOutTime: optional Date
siteOutLocation: optional Location
siteOutPhotoUrl: optional string
siteOutPhotos: string[] (max 10, simple URLs)

// Follow-up Specific
followUpReason: enum [additional_work_required|issue_resolution|status_check|
                      customer_request|maintenance|other]
description: string (min 10 chars - REQUIRED!)

// Dynamic Status Management
originalCustomerStatus: enum [converted|on_process|cancelled] (optional)
affectsCustomerStatus: boolean (default true)
newCustomerStatus: enum [converted|on_process|cancelled] (optional)

// Photos (for follow-ups)
sitePhotos: string[] (max 10)
siteOutPhotos: string[] (max 10)

// Status
status: enum [in_progress|completed|cancelled] (default: in_progress)
visitOutcome: enum [completed|on_process|cancelled] (optional)
outcomeNotes: optional string
scheduledFollowUpDate: optional Date

// Customer (Copied from Original)
customer: CustomerDetails

// General
notes: optional string
createdAt: Date
updatedAt: Date
```

### 1.9 Quick Update Schema
```typescript
// Quick Actions
action: enum [convert|cancel|reschedule] (required!)
scheduledFollowUpDate: Date (coerce for HTTP) (required for reschedule)
outcomeNotes: optional string
reason: optional string
```

---

## PART 2: DETAILED COMPONENT IMPLEMENTATIONS

### 2.1 Marketing Site Visit Form (3,023 LINES!)

**Component Complexity:** HIGHEST
**File Size:** 3,023 lines
**Purpose:** Dynamically render solar configuration forms based on project type

**Project Type Logic:**
```
- User selects project type
- Different form sections APPEAR/DISAPPEAR
- Each type has unique field requirements
- Validation changes based on selection
```

**Key Features:**

1. **On-Grid Configuration Form**
   - Solar panels: Make + wattage + type + count (DCR/Non-DCR)
   - Inverter: Make + phase + KW + quantity
   - Electrical: Accessories, earthing, lightning arrestor
   - Structure: GP Structure or Mono Rail with heights
   - Floor selection (0-4)
   - Work scope selection (customer vs company)
   - Project value

2. **Off-Grid Configuration Form**
   - EVERYTHING from On-Grid PLUS:
   - Battery: Brand + type + AH + voltage + count + stands
   - Inverter voltage/KVA (different from on-grid)
   - NO net meter scope field
   - Different validation rules

3. **Hybrid Configuration Form**
   - EVERYTHING from Off-Grid PLUS:
   - Net meter scope RETURNS
   - Combination of both systems

4. **Water Heater Configuration Form**
   - Brand selection (venus, hykon, supreme)
   - Capacity (litre)
   - Model type (pressurized vs non-pressurized)
   - Heating coil details
   - Floor level
   - Plumbing + civil work scope
   - Labour and transport checkbox

5. **Water Pump Configuration Form**
   - Drive specs (HP)
   - Panel configuration (brand, wattage, type, count)
   - Structure type selection
   - Electrical specs
   - Multiple work scope fields
   - Labour and transport

**State Management in Component:**
- 5 separate form states (one per project type)
- Dynamic validation rules
- Field visibility based on selections
- Combobox components for selections
- Real-time project value calculation

---

### 2.2 Follow-Up Modal (1,326 LINES)

**Component Complexity:** HIGH
**File Size:** 1,326 lines

**4-Step Workflow:**

**Step 1: Follow-Up Reason Selection**
- Display visit history/timeline
- Show all previous visits for this customer
- Select from 5 predefined reasons:
  - Additional Work Required
  - Issue Resolution
  - Status Check
  - Customer Request
  - Redesign Needed
- Each reason has icon, color, description

**Step 2: Location Detection**
- Auto-detect current GPS
- Show detection status (detecting/granted/denied/error)
- Accuracy indicator
- Manual address override
- Reverse geocoding integration

**Step 3: Photo Capture**
- Selfie capture
- Multiple site photo capture
- Photo overlay with timestamp
- Camera switching
- Photo type selector

**Step 4: Description & Template**
- Enter description (min 10 chars)
- Optional template selection
- Confirmation

**Key Logic:**
```typescript
// Visit History Query
- Fetch all visits for customer
- Sort by creation date (newest first)
- Show status indicators (completed/in_progress/cancelled)
- Display follow-up count per visit

// Follow-Up Creation
- Create in followUpVisits collection
- Link to original visit
- Update original visit:
  - followUpCount++
  - hasFollowUps = true
  - customerCurrentStatus = "on_process" ← CRITICAL!
  - activeFollowUpId = newFollowUpId
```

---

### 2.3 Start Modal (1,515 LINES)

**Component Complexity:** HIGH
**File Size:** 1,515 lines

**6-Step Workflow:**

1. **Purpose & Property Selection** (Step 1)
   - Purpose: 8 options (visit, installation, service, purchase, eb_office, amc, bank, other)
   - Property type: 4 options (residential, commercial, agri, other)

2. **Location Capture** (Step 2)
   - GPS detection with 20-second timeout
   - Reverse geocoding for address
   - Accuracy display
   - Error handling with device detection

3. **Photo Capture** (Step 3)
   - Use camera (front/back)
   - Photo overlay with timestamp
   - Base64 or URL storage

4. **Customer Details** (Step 4)
   - Name (min 2 chars)
   - Mobile (min 10 chars) ← UNIQUE KEY
   - Address (min 3 chars)
   - EB Service Number (optional)
   - Property Type (dropdown)
   - Location (additional field)
   - **Autocomplete Integration:**
     - Fetch existing customers
     - Show as suggestions
     - Duplicate warning
     - Create new if not found

5. **Department Form** (Step 5)
   - Render appropriate form based on user department
   - Technical form: service types, work type, team
   - Marketing form: project configuration
   - Admin form: bank/EB processes

6. **Review & Submit** (Step 6)
   - Display all collected data
   - Validate required fields
   - Show warnings if issues
   - Submit to API

**Error Handling:**
- Location permission denied
- GPS timeout
- No internet
- Camera access denied
- Photo capture failure

---

### 2.4 Checkout Modal (1,340 LINES)

**Component Complexity:** HIGH
**File Size:** 1,340 lines

**4-Step Workflow:**

1. **Location Verification** (Step 1)
   - Detect current location
   - Show distance from check-in
   - Accuracy indicator
   - Manual override option

2. **Photo Verification** (Step 2)
   - Capture selfie
   - Capture multiple site photos
   - Show check-in photo for comparison
   - Photo overlay

3. **Notes & Outcome** (Step 3)
   - Add checkout notes
   - Select visit outcome:
     - **converted:** Deal completed
     - **on_process:** Ongoing negotiations
     - **cancelled:** Deal cancelled
   - Add outcome-specific notes
   - If on_process: Optional scheduled follow-up date

4. **Submit** (Step 4)
   - Validate all required fields
   - Upload photos to Cloudinary
   - PATCH to `/api/site-visits/:id`
   - Update status to "completed"

**Key Validation:**
```typescript
// Required for checkout:
- Current location (latitude, longitude)
- At least one photo
- Outcome selection (converted|on_process|cancelled)
- If on_process + scheduled date: validate date > now
```

---

### 2.5 Site Visit Details Modal (2,031 LINES)

**Component Complexity:** HIGHEST (Read-only)
**File Size:** 2,031 lines

**Displays Complete Visit Information:**

1. **Customer Information**
   - Name, mobile, address
   - Property type, EB service number
   - Location source

2. **Visit Timeline**
   - Check-in time with location
   - Check-out time with location
   - Duration calculation
   - Distance traveled (if applicable)

3. **Location Data**
   - Map view (if applicable)
   - Coordinates display
   - Accuracy indicators

4. **Photo Gallery**
   - Check-in photo
   - Check-out photos (grid)
   - Site photos (grid)
   - Photo metadata (timestamp, location)

5. **Department-Specific Data Display**
   - Technical: Service types, work type, team, status
   - Marketing: Full solar configuration display
   - Admin: Bank/EB process information

6. **Visit Outcome**
   - Outcome status display
   - Outcome notes
   - Scheduled follow-up date

7. **Follow-Up Information**
   - Follow-up count
   - Follow-ups list with status
   - Link to each follow-up

---

### 2.6 Follow-Up Details Modal (712 LINES)

**Component Complexity:** MEDIUM
**File Size:** 712 lines

**Displays:**
- Follow-up reason
- Original visit reference
- Timeline comparison
- Photos (check-in and check-out)
- Outcome details
- Checkout button for in-progress follow-ups

---

### 2.7 Technical Site Visit Form (456 LINES)

**Simple Department Form**

**Fields:**
- Service types: Multi-select checkboxes
- Work type: Single select dropdown
- Working status: Radio buttons (pending/completed)
- If pending: Remarks text area
- Team members: Array input (add/remove members)
- Description: Optional textarea

**Validation:**
- At least 1 service type required
- Work type required
- At least 1 team member if applicable

---

### 2.8 Admin Site Visit Form (502 LINES)

**Simple Department Form**

**Fields:**
- Bank process: Step selection + description
- EB process: Type selection + description
- Purchase details: Text field
- Driving: Text field
- Cash transactions: Text field
- Personal work: Text field
- Others: Text field

**Validation:**
- At least one section must have data

---

### 2.9 Enhanced Location Capture Component (290 LINES)

**Wraps Location Service**

**Features:**
- Status display (detecting/granted/denied/error)
- Auto-retry on timeout
- Device detection (mobile vs desktop)
- Platform-specific error messages
- Accuracy threshold validation
- Manual entry fallback

---

### 2.10 Site Visit Photo Upload (432 LINES)

**Cloudinary Integration**

**Features:**
- Multiple photo upload
- Real-time preview
- Progress indication
- Error handling
- File size validation
- Format validation (JPG, PNG, WEBP)
- Base64 conversion for storage

---

### 2.11 Quick Action Buttons (244 LINES)

**Quick Status Updates**

**Actions:**
1. **Convert:** Change to "converted" status
2. **Cancel:** Change to "cancelled" status
3. **Reschedule:** Set new follow-up date

**Implementations:**
- PATCH `/api/site-visits/:id/quick-update`
- Validates action + parameters
- Updates visit outcome
- Re-fetches updated data

---

### 2.12 Reschedule Modal (150 LINES)

**Simple Date Picker**

**Features:**
- Select new follow-up date
- Validate date > today
- Reason text field
- Submit to quick action

---

### 2.13 Site Visit Card (340 LINES)

**Visit Display in List**

**Shows:**
- Customer name + phone
- Department badge
- Status indicator
- Visit time duration
- Quick action buttons
- Follow-up count badge
- Outcome status

---

## PART 3: BACKEND SERVICES - DEEP DIVE

### 3.1 SiteVisitService (837 LINES)

**Complete CRUD Implementation:**

#### Create Operation
```typescript
// 1. Validate using insertSiteVisitSchema
// 2. Convert JS dates to Firestore Timestamps
// 3. Remove undefined values
// 4. Add to collection
// 5. Transform back to response format
```

#### Update Operation
```typescript
// Multiple date fields need conversion:
- siteOutTime (ISO string → Timestamp)
- updatedAt (always current time)
- sitePhotos[].timestamp (Timestamp conversion)
- siteOutPhotos[].timestamp (Timestamp conversion)

// Robust error handling:
- Try/catch on each timestamp conversion
- Fallback to current time if parsing fails
- Log update payload for debugging
```

#### Query Operations
```typescript
// getSiteVisitsByUser(userId, limit = 50)
// - Simple where + orderBy + limit
// - Returns user's visits sorted by date

// getSiteVisitsWithFilters(filters)
// - IMPORTANT: Applies only ONE Firestore filter
// - Applies rest in-memory to avoid compound indexes
// - Filtering order: userId > department > master admin
// - In-memory filters: status, date range, purpose, customer status

// getSiteVisitStats(filters)
// - Groups by: status, department, purpose
// - Calculates: total, inProgress, completed, cancelled

// getAllSiteVisitsForMonitoring()
// - Limited to 500 recent visits (performance)
// - For Master Admin + HR only
// - OrderBy siteInTime descending
```

#### Data Transformation
```typescript
convertFirestoreToSiteVisit(firestoreDoc):
1. Timestamp → Date conversion
2. Array photo handling
3. Nested object flattening
4. Type casting to SiteVisit interface
```

#### Excel Export Operation
```typescript
// Dynamic column generation based on data
// Column width mapping for readability
// Marketing data extraction:
  - Panel configuration details
  - Structure specifications
  - Inverter specifications
  - Project value

// Includes:
- Customer information
- Visit timeline
- Outcome data
- Photos count
- All marketing specs if present
```

---

### 3.2 FollowUpService (442 LINES)

**Follow-Up Specific CRUD:**

#### Create Follow-Up (Dynamic Status Management)
```typescript
CRITICAL LOGIC:

1. Get original visit data
2. Extract originalCustomerStatus (from customerCurrentStatus or visitOutcome)
3. Create follow-up document
4. Update original visit:
   followUpCount++
   hasFollowUps = true
   customerCurrentStatus = "on_process"  ← KEY!
   activeFollowUpId = newFollowUpId
   lastActivityType = "follow_up"
   lastActivityDate = now

Example:
Original: customerCurrentStatus = "converted"
  ↓ (Create follow-up)
New: customerCurrentStatus = "on_process"
```

#### Update Follow-Up (Status Transition)
```typescript
OUTCOME → CUSTOMER STATUS MAPPING:

When follow-up completed with outcome:
- "completed" → customerCurrentStatus = "converted"
- "on_process" → customerCurrentStatus = "on_process"
- "cancelled" → customerCurrentStatus = "cancelled"

Update original visit:
- customerCurrentStatus = mapped status
- activeFollowUpId = null (cleared)
- lastActivityType = "follow_up"
- lastActivityDate = now
```

#### Photo Handling in Follow-Ups
```typescript
// Follow-ups store photos as simple string URLs
// NOT complex photo objects
// Converts from any format to string array:

Input: object[] or string[]
Process: Extract .url if object, keep if string
Output: string[] (pure URLs)
Storage: Firestore array of strings
```

#### Query Operations
```typescript
// getFollowUpsByOriginalVisit(originalVisitId)
// - Query where originalVisitId matches
// - Sort by createdAt descending

// getFollowUpsByUser(userId, department?, status?)
// - Query where userId matches
// - Apply other filters in-memory
// - Sort by createdAt descending

// getFollowUpById(id)
// - Single document lookup
// - Returns null if not found
```

---

## PART 4: LOCATION SERVICE - IMPLEMENTATION DETAILS

### 4.1 GPS Detection Flow
```typescript
1. Check browser supports geolocation
2. Call navigator.geolocation.getCurrentPosition()
3. Options:
   {
     enableHighAccuracy: true,    // Force GPS
     timeout: 20000,              // 20 seconds max
     maximumAge: 0                // Never use cached
   }
4. On success:
   - Extract coordinates
   - Calculate accuracy (in meters)
   - Attempt reverse geocoding
5. On error:
   - Detect error type (permission/unavailable/timeout)
   - Detect device type (mobile/desktop)
   - Return platform-specific message
```

### 4.2 Reverse Geocoding Flow
```typescript
1. If no API key from env:
   - Try fetch from backend: /api/google-maps-key
   - Include Firebase auth token
   - Use fresh token (force refresh)
2. Call Google Maps Reverse Geocoding API
3. Parse response:
   - If OK: Extract formatted address
   - Extract address components
   - Build short address
4. Return both formatted + short versions
```

### 4.3 Error Messages (Device-Aware)

**Mobile vs Desktop Handling:**
```
PERMISSION_DENIED:
  Mobile: "Please turn on Location Services in settings..."
  Desktop: "Please enable location permissions in browser..."

POSITION_UNAVAILABLE:
  Mobile: "Please turn on GPS in device settings"
  Desktop: "Location unavailable. Ensure WiFi or mobile data..."

TIMEOUT:
  Both: "Location request timed out. Please try again"
```

---

## PART 5: PHOTO OVERLAY UTILITIES

### 5.1 Photo Overlay Implementation
```typescript
addPhotoOverlay(canvas, options):
1. Create dark background overlay:
   - Position: bottom 80px
   - Color: rgba(0,0,0,0.7)
   - Padding: 10px

2. Add text lines:
   - Type label (Check-in/Checkout/Site Visit)
   - Timestamp: formatted date/time string
   - Location: word-wrapped address

3. Text styling:
   - Font: Arial 14px
   - Color: White
   - Max width: canvas.width - 20px

4. Return modified canvas

capturePhotoWithOverlay(video, canvas, options):
1. Set canvas dimensions to video size
2. Draw video frame to canvas
3. Apply overlay
4. Convert to base64 data URL
5. Return for storage
```

---

## PART 6: DATA PERSISTENCE & TRANSFORMATIONS

### 6.1 Firestore Timestamp Conversions

**Problem:** JavaScript Dates ≠ Firestore Timestamps

**Solution:**
```typescript
// Create: Date → Firestore Timestamp
Timestamp.fromDate(new Date())

// Read: Firestore Timestamp → Date
timestamp.toDate()

// Problem Locations:
1. siteInTime (stored as Timestamp)
2. siteOutTime (stored as Timestamp)
3. sitePhotos[].timestamp (each photo)
4. siteOutPhotos[].timestamp (each checkout photo)
5. createdAt (document meta)
6. updatedAt (document meta)

// Service Layer Handles ALL Conversions
// Frontend never deals with raw Timestamps
```

### 6.2 Array Photo Handling

**Challenge:** Multiple photo types, multiple formats

**Follow-Up Photos:**
```typescript
// Stored as: string[] (simple URLs)
siteOutPhotos: [
  "https://cloudinary.com/photo1.jpg",
  "https://cloudinary.com/photo2.jpg"
]
```

**Site Visit Photos:**
```typescript
// Stored as: SitePhoto[] (complex objects)
sitePhotos: [
  {
    url: "https://cloudinary.com/photo1.jpg",
    location: { latitude, longitude, accuracy, address },
    timestamp: Timestamp,
    description: "Room view"
  }
]

// Max 20 photos per visit
// Max 10 per follow-up
```

---

## PART 7: CUSTOMER INTEGRATION

### 7.1 Customer Creation Flow
```typescript
// In start modal:
1. User enters customer details
2. Check for duplicate by mobile:
   - Query customers collection: mobile === inputMobile
   - If exists → Use existing customer ID
   - If not → Create new customer

3. Customer creation includes:
   - name, mobile, address (required)
   - ebServiceNumber, propertyType, location (optional)
   - source (lead source, required)
   - profileCompleteness score
   - createdFrom flag ("visit" or manual)

4. Return customerId to site visit
```

### 7.2 Duplicate Detection
```typescript
// By mobile number ONLY
// Check before site visit creation
// Warn user if duplicate found
// Option to use existing or create new

// Can't create two records with same mobile
```

---

## PART 8: VALIDATION PATTERNS

### 8.1 Schema Validation (Zod)
```typescript
// All data validated before storage using Zod
// insertSiteVisitSchema.parse(data)
// insertFollowUpSiteVisitSchema.parse(data)

// Errors caught and returned to frontend
// 400 Bad Request if validation fails
```

### 8.2 Frontend Validation
```typescript
// React Hook Form + Zod
// Real-time field validation
// Show error messages as user types
// Disable submit if validation fails

// Examples:
- Customer name: min 2 chars
- Mobile: min 10 chars
- Address: min 3 chars
- Follow-up description: min 10 chars
```

---

## PART 9: ERROR HANDLING PATTERNS

### 9.1 Backend Error Handling
```typescript
// Try/catch on all service methods
// Specific error messages logged
// Generic 500 response to frontend
// Error context logged for debugging

Example:
try {
  // operation
} catch (error) {
  console.error('ERROR: [operation name]:', error);
  console.error('Error details:', {
    name: error.name,
    message: error.message,
    context: contextData
  });
  res.status(500).json({ message: "Operation failed" });
}
```

### 9.2 Frontend Error Handling
```typescript
// Toast notifications for errors
// Retry mechanisms for network errors
// Fallback UI states
// User-friendly error messages

// Modal error states:
1. Loading state (spinner)
2. Error state (red text, retry button)
3. Success state (green text, dismiss)
```

---

## PART 10: PERMISSION CONTROL

### 10.1 Permission Check Function
```typescript
checkSiteVisitPermission(user, action):
  
// Master Admin: Always allowed
if (user.role === 'master_admin') return true;

// Admin Role: Always allowed
if (user.role === 'admin') return true;

// Department Check
allowedDepts = [technical, marketing, admin]
if (user.department not in allowedDepts) return false;

// Permission Check
effectivePermissions = getEffectivePermissions(dept, designation)
requiredPerms = {
  view_own: ['site_visit.view_own', 'site_visit.view'],
  view_team: ['site_visit.view_team', 'site_visit.view'],
  view_all: ['site_visit.view_all', 'site_visit.view'],
  create: ['site_visit.create'],
  edit: ['site_visit.edit'],
  delete: ['site_visit.delete']
}

return effectivePermissions has any required permission
```

---

## PART 11: RATE LIMITING

### 11.1 Rate Limiters Applied
```typescript
// Attendance operations (check-in, check-out, OT)
attendanceRateLimiter

// General API operations
generalRateLimiter

// Applied to site-visit routes:
- None applied directly to site visits
- Uses generic rate limiting if needed
```

---

## PART 12: QUOTATION INTEGRATION

### 12.1 Mappable Site Visits Endpoint
```
GET /api/quotations/site-visits/mappable

Logic:
1. Get all site visits user can see
2. Filter for visits with:
   - Customer data (name, mobile required)
   - Status = in_progress OR completed with valid outcome
3. Enrich with completeness analysis:
   - customerDataComplete: yes/no
   - visitDataComplete: yes/no
   - departmentDataComplete: yes/no
   - percentageComplete: 0-100%
4. Return to quotation page

User selects visit → Create quotation from it
```

### 12.2 Quotation Creation from Site Visit
```
POST /api/quotations/from-site-visit/:siteVisitId

Extraction Logic:
- Customer details → Quotation customer
- Department data → Quotation items/specs
- Marketing config → BOM (Bill of Materials)
- Location → Delivery location
- Department → Quotation type

Maintains audit trail
Links quotation back to visit
```

---

## PART 13: STATISTICS & REPORTING

### 13.1 Dashboard Statistics
```typescript
getSiteVisitStats():
{
  total: number,
  inProgress: number,
  completed: number,
  cancelled: number,
  
  byDepartment: {
    technical: number,
    marketing: number,
    admin: number
  },
  
  byPurpose: {
    visit: number,
    installation: number,
    service: number,
    // ... etc
  },
  
  outcomes: {
    converted: number,
    on_process: number,
    cancelled: number
  },
  
  averageDuration: number (in minutes),
  totalPhotos: number,
  averagePhotosPerVisit: number
}
```

### 13.2 Excel Export Format
```
Columns Generated:
1. Visit ID
2. Employee Name
3. Department
4. Customer Name
5. Customer Phone
6. Customer Email
7. Customer Source
8. Visit Purpose
9. Status
10. Visit Outcome
11. Check-in Time
12. Check-in Location
13. Check-out Time
14. Check-out Location
15. Notes
16. Photos Count
17. Created At
18-35. Marketing-specific columns (if present):
    - Panel Watts, Type, Count
    - Inverter specs
    - Structure type
    - Project value
    - Etc.

Format: XLSX (Excel 2007+)
Column Width: Auto-calculated
Dates: Locale-formatted (IST)
```

---

## PART 14: CACHING STRATEGY

### 14.1 In-Memory Cache
```typescript
// SimpleCache implementation
cache.set(key, value, ttlSeconds)
cache.get(key) → returns if not expired
cache.clear()

// Cache Keys (examples):
- user_permissions:{userId}
- site_visit_stats:{filter}
- customer_by_mobile:{mobile}
```

### 14.2 React Query Caching
```typescript
// Frontend caching
queryKey: ['/api/site-visits'] // Main list
queryKey: ['/api/site-visits', id] // Single visit
queryKey: ['/api/follow-ups', userId] // Follow-ups

// Auto-invalidate on mutations:
- Create visit → invalidate ['/api/site-visits']
- Update visit → invalidate ['/api/site-visits', id]
- Create follow-up → invalidate ['/api/follow-ups', userId]
```

---

## PART 15: EDGE CASES & SPECIAL SCENARIOS

### 15.1 Network Failures
```
Scenario: Location detection timeout
- Show error message with retry button
- Allow manual address entry
- Don't block form submission

Scenario: Photo upload fails
- Retry with same file
- Allow user to re-capture photo
- Show clear error message

Scenario: Customer already exists
- Warn user: "Customer already exists"
- Show existing customer name
- Ask: Use existing or create new?
```

### 15.2 Data Edge Cases
```
Scenario: Empty follow-up list
- Show "No follow-ups yet" message
- Offer to create first follow-up

Scenario: Visit checked out but outcome not selected
- Make outcome selection mandatory at checkout
- Don't allow skip

Scenario: Only one photo required but multiple provided
- Store all photos (up to 20 limit)
- Use first as primary

Scenario: Customer has multiple duplicate mobiles
- Use first match
- Log warning for manual review
```

### 15.3 Permission Edge Cases
```
Scenario: User not in allowed departments
- 403 Forbidden
- Show: "Site Visits only available for Technical, Marketing, Admin"

Scenario: User lost permissions mid-session
- Verify on each API call
- Redirect to unauthorized page
- Clear cached permissions

Scenario: Master Admin queries site visits
- NO filters applied
- Get all recent visits (500 limit)
- Includes all departments
```

---

## PART 16: TESTING SCENARIOS

### 16.1 Happy Path Testing
```
1. Start visit flow:
   - Select purpose ✓
   - Detect location ✓
   - Capture photo ✓
   - Enter customer ✓
   - Fill form ✓
   - Submit ✓

2. Checkout flow:
   - Detect location ✓
   - Capture photos ✓
   - Select outcome ✓
   - Submit ✓

3. Follow-up flow:
   - Select reason ✓
   - Detect location ✓
   - Capture photos ✓
   - Enter description ✓
   - Submit ✓
   - Verify customer status changed to on_process ✓
```

### 16.2 Error Path Testing
```
1. Location errors:
   - Denied permission ✓
   - GPS unavailable ✓
   - Timeout ✓

2. Photo errors:
   - Camera not available ✓
   - Permission denied ✓
   - File size too large ✓

3. API errors:
   - Network error ✓
   - 403 Forbidden ✓
   - 500 Server error ✓

4. Validation errors:
   - Missing required field ✓
   - Invalid format ✓
   - Min/max violation ✓
```

---

## PART 17: DEBUGGING PATTERNS

### 17.1 Common Debug Scenarios
```
Debug: "Site visits not appearing"
1. Check user permissions
2. Check user department (technical/marketing/admin only)
3. Check Firebase auth token
4. Check Firestore rules
5. Check network tab for API errors

Debug: "Photos not uploading"
1. Check Cloudinary API key
2. Check network size limits
3. Check browser camera permissions
4. Check photo format (JPG/PNG/WEBP)

Debug: "Follow-up not created"
1. Check original visit exists
2. Check follow-up reason valid
3. Check permissions on user
4. Check Firestore quota
5. Check logs for error details

Debug: "Timestamp issues"
1. Check timezone settings
2. Verify Timestamp.fromDate() used
3. Check .toDate() called on retrieval
4. Look for "Invalid date" errors
```

### 17.2 Log Inspection
```
Search logs for keywords:
- "SITE_VISIT_SERVICE:" (service operations)
- "FOLLOW_UP_SERVICE:" (follow-up operations)
- "SITE VISIT PERMISSION DEBUG" (permission checks)
- "CHECKOUT MUTATION STARTED" (checkout flow)
- "=== ERROR ===" (error sections)

Key debug fields to check:
- user.uid, user.department
- visit.id, visit.status
- location.accuracy (≥ 0 is valid)
- photo.url (should be valid HTTPS)
```

---

## PART 18: PERFORMANCE OPTIMIZATION POINTS

### 18.1 Current Optimizations
```
1. Firestore Queries:
   - Limited to first 100-500 documents
   - Single index filters to avoid compound indexes
   - In-memory filtering for complex queries

2. Photo Handling:
   - Max 20 photos per visit (prevents bloat)
   - Max 10 photos per follow-up
   - Cloudinary CDN for delivery

3. React Query:
   - Automatic caching by queryKey
   - Stale-while-revalidate strategy
   - Cache invalidation on mutations

4. Component Rendering:
   - Lazy loading of modals
   - Virtualization for long lists
   - Memoization of expensive components
```

### 18.2 Future Optimization Opportunities
```
1. Pagination:
   - Add cursor-based pagination for large datasets
   - Load more on scroll

2. Real-time Updates:
   - WebSocket subscriptions for live data
   - Real-time follow-up notifications

3. Offline Support:
   - Service worker caching
   - Local IndexedDB for offline visits
   - Sync on reconnect

4. Image Optimization:
   - Image compression before upload
   - Thumbnail generation
   - Lazy image loading in galleries

5. Analytics:
   - Track conversion rates
   - Monitor follow-up effectiveness
   - Department KPIs
```

---

## CONCLUSION

The Site Visit Management System is a **comprehensive, production-ready enterprise application** with:

- ✅ 12,361 lines of UI components
- ✅ Complex multi-step workflows
- ✅ Dynamic status management
- ✅ Robust error handling
- ✅ Permission-based access control
- ✅ Integration with multiple systems
- ✅ Advanced photo + location capture
- ✅ Flexible quotation mapping

All components work together seamlessly to provide a complete field operations management solution for Prakash Green Energy's Technical, Marketing, and Admin departments.
