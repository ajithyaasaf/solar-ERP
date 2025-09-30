# Leave & Permission System - Integration Summary

## Current System Analysis (What Already Exists)

### ✅ **Existing Pages**
- `/leave` - Leave Management page (basic UI exists at `client/src/pages/leave.tsx`)
  - Currently shows leave table with search
  - Has "Apply Leave" dialog (not implemented)
  - Status: **Needs enhancement**

### ✅ **Existing Components** 
- **Dashboard Components**:
  - `pending-approvals-card.tsx` - Can be reused for leave approvals
  - `attendance-card.tsx` - Reference for leave balance widget
  - `stats-card.tsx` - Can display leave statistics
  
- **UI Components** (All available via Shadcn):
  - Form components (form, input, select, date-picker, etc.)
  - Dialog, Card, Table, Badge, Tabs
  - Calendar, Time picker components

- **Layout**:
  - `sidebar.tsx` - Already has "Leave Management" nav item (line 82-86)
  - `header.tsx` - Top navigation bar
  - `mobile-sidebar.tsx` - Mobile navigation

### ✅ **Existing Backend Infrastructure**

**Database Schema (server/storage.ts)**
- Basic `insertLeaveSchema` exists (lines 95-101):
  ```typescript
  {
    userId: string,
    startDate: date,
    endDate: date,
    reason: string,
    status: "pending" | "approved" | "rejected"
  }
  ```
  - Status: **Needs major enhancement for TL/HR workflow**

**Storage Interface (server/storage.ts)**
- `createLeave()` - Line 2469
- `updateLeave()` - Line 2494
- `getLeave()` - Available
- `listLeaves()` - Available
- Status: **Needs extension for balance management**

**API Endpoints (server/routes.ts)**
- `GET /api/leaves` - Line 3788 (with userId and status filters)
- `GET /api/leaves/:id` - Line 3827
- `POST /api/leaves` - Line 3850
- `PATCH /api/leaves/:id` - Line 3871
- Status: **Needs enhancement for approval workflow**

### ✅ **Existing Auth & Permissions**
- Enterprise RBAC system in place
- Leave permissions already defined:
  - `leave.view_own`
  - `leave.view_team`
  - `leave.view_all`
  - `leave.request`
  - `leave.approve`
  - `leave.reject`
  - `leave.cancel`
- `reportingManagerId` field exists in User model
- Team Lead designation exists (level 6)

### ✅ **Integration Points Available**
1. **Attendance System** - Can verify work hours
2. **Payroll System** - Already handles deductions
3. **User Hierarchy** - `reportingManagerId` for TL identification
4. **Department Timing** - Available for permission hour validation

---

## What Needs to Be Built

### 🔨 **Database Schema Extensions**

#### 1. **New: Leave Balance Collection** (Not exists)
```typescript
export const insertLeaveBalanceSchema = z.object({
  userId: z.string(),
  employeeId: z.string(),
  year: z.number(),
  month: z.number(),
  casualLeaveBalance: z.number().default(1),
  permissionHoursBalance: z.number().default(2),
  casualLeaveUsed: z.number().default(0),
  permissionHoursUsed: z.number().default(0),
  // ... rest of schema from plan
});
```

#### 2. **Enhanced: Leave Application Schema** (Extend existing)
Current schema needs these additions:
- `leaveType` field (casual_leave, permission, unpaid_leave)
- Permission-specific fields (date, start/end time, hours)
- TL approval fields (tlApprovedAt, tlApprovedBy, tlRemarks)
- HR approval fields (hrApprovedAt, hrApprovedBy, hrRemarks)
- Status enhancement (pending_tl, pending_hr, approved, rejected_by_tl, rejected_by_hr)
- Balance snapshot at application time

#### 3. **New: Fixed Holidays Collection** (Not exists)
```typescript
export const insertFixedHolidaySchema = z.object({
  name: z.string(),
  date: z.date(),
  year: z.number(),
  type: "national" | "company" | "regional",
  isPaid: z.boolean().default(true),
  // ... rest of schema from plan
});
```

### 🔨 **Backend Services to Create**

#### 1. **New: Leave Balance Service** (`server/services/leave-balance-service.ts`)
- Monthly balance reset logic
- Balance calculation and tracking
- History management
- Auto-run on 1st of every month

#### 2. **New: Leave Service** (`server/services/leave-service.ts`)
- Leave application logic with validation
- TL/HR approval workflow
- Balance deduction on approval
- Date validations (Sundays, fixed holidays, overlaps)
- Payroll integration for unpaid leaves

#### 3. **Enhanced: Storage Interface** (`server/storage.ts`)
Add methods:
- `getLeaveBalance(userId, month, year)`
- `updateLeaveBalance(userId, updates)`
- `createLeaveBalance(data)`
- `getFixedHolidays(year)`
- `createFixedHoliday(data)`
- `approveLeaveTL(leaveId, tlUserId, remarks)`
- `approveLeaveHR(leaveId, hrUserId, remarks)`
- `rejectLeave(leaveId, userId, reason)`

### 🔨 **API Routes to Add/Enhance** (`server/routes.ts`)

**New Endpoints:**
- `GET /api/leave-balance/:userId` - Get current balance
- `GET /api/leave-balance/:userId/history` - Balance history
- `GET /api/leave-balance/team/:tlUserId` - Team balances (TL)
- `GET /api/leave-balance/all` - All balances (HR)
- `POST /api/leave-balance/reset` - Manual reset (admin)

**Enhanced Endpoints:**
- `POST /api/leaves/apply` - New leave application (replace existing)
- `GET /api/leaves/pending-tl/:tlUserId` - TL pending approvals
- `GET /api/leaves/pending-hr` - HR pending approvals
- `PUT /api/leaves/:id/approve-tl` - TL approval
- `PUT /api/leaves/:id/reject-tl` - TL rejection
- `PUT /api/leaves/:id/approve-hr` - HR final approval
- `PUT /api/leaves/:id/reject-hr` - HR rejection
- `PUT /api/leaves/:id/cancel` - Employee cancellation

**Holiday Endpoints:**
- `GET /api/holidays` - Current year holidays
- `GET /api/holidays/:year` - Specific year
- `POST /api/holidays` - Create (admin only)

### 🔨 **Frontend Components to Create** (`client/src/components/leave/`)

**New Components:**
1. `leave-application-form.tsx` - Multi-step form (casual/permission/unpaid)
2. `leave-balance-widget.tsx` - Dashboard widget showing balance
3. `leave-history-table.tsx` - User's leave history
4. `tl-approval-list.tsx` - Team Lead approval interface
5. `hr-approval-list.tsx` - HR final approval interface
6. `leave-calendar-view.tsx` - Calendar with leave visualization
7. `permission-time-picker.tsx` - Specialized 2-hour permission picker

### 🔨 **Page Enhancements** (`client/src/pages/leave.tsx`)

**Current State:** Basic table with search, empty apply dialog

**Needs:**
1. Tabs for different views:
   - My Leaves
   - Apply Leave
   - Team Approvals (if TL)
   - HR Approvals (if HR)
   - Leave Calendar

2. Full leave application form integration
3. Balance display widget at top
4. Approval workflow UI
5. Leave statistics cards

### 🔨 **Dashboard Integration** (`client/src/pages/dashboard.tsx`)

**Add to Dashboard:**
1. Leave balance widget (show current month balance)
2. Pending leave approvals (for TL/HR) - use existing `pending-approvals-card`
3. Team on leave today (for TL)
4. Upcoming leaves calendar widget

---

## Implementation Strategy

### Phase 1: Backend Foundation (Week 1)
✅ **Already Done:**
- Basic leave schema ✓
- Basic CRUD endpoints ✓
- User hierarchy with reportingManagerId ✓
- Leave permissions ✓

🔨 **To Build:**
1. Enhanced leave schemas in `shared/schema.ts`
2. Leave balance schema and Fixed holiday schema
3. Update storage interface with new methods
4. Create leave-balance-service.ts
5. Create leave-service.ts with workflow logic

### Phase 2: API Layer (Week 1-2)
🔨 **To Build:**
1. Enhance existing leave endpoints
2. Add new balance endpoints
3. Add approval workflow endpoints
4. Add holiday management endpoints
5. Add middleware for TL/HR permission checks

### Phase 3: Frontend Components (Week 2)
🔨 **To Build:**
1. Create all leave components in `components/leave/`
2. Integrate with TanStack Query
3. Add form validation with zod
4. Create approval interfaces

### Phase 4: Page Integration (Week 3)
🔨 **To Build:**
1. Complete leave.tsx page with all features
2. Add leave widgets to dashboard.tsx
3. Update sidebar navigation (already has entry)
4. Add notifications for approvals

### Phase 5: Automation & Testing (Week 3-4)
🔨 **To Build:**
1. Monthly balance reset cron job
2. Annual holiday setup automation
3. Payroll integration for unpaid leaves
4. Comprehensive testing
5. User training materials

---

## File Structure Plan

### Backend Files
```
server/
├── services/
│   ├── leave-service.ts           [NEW]
│   ├── leave-balance-service.ts   [NEW]
│   └── payroll-service.ts         [ENHANCE - add leave deduction]
├── routes.ts                       [ENHANCE - add leave routes]
└── storage.ts                      [ENHANCE - add leave methods]

shared/
└── schema.ts                       [ENHANCE - add complete leave schemas]
```

### Frontend Files
```
client/src/
├── components/
│   ├── leave/                      [NEW FOLDER]
│   │   ├── leave-application-form.tsx
│   │   ├── leave-balance-widget.tsx
│   │   ├── leave-history-table.tsx
│   │   ├── tl-approval-list.tsx
│   │   ├── hr-approval-list.tsx
│   │   ├── leave-calendar-view.tsx
│   │   └── permission-time-picker.tsx
│   └── dashboard/
│       └── pending-approvals-card.tsx   [REUSE for leave]
├── pages/
│   ├── leave.tsx                   [MAJOR ENHANCEMENT]
│   └── dashboard.tsx               [ADD leave widgets]
└── lib/
    └── leave-utils.ts              [NEW - helper functions]
```

---

## Key Integration Points

### 1. **With Attendance System**
- Check if employee has checked in before applying permission
- Validate permission hours against working hours
- Integrate with overtime system if needed

### 2. **With Payroll System**
- Calculate unpaid leave deductions
- Use existing perDaySalary calculation
- Add leave deduction line item in payroll slip
- Update payroll process to fetch approved unpaid leaves

### 3. **With User Management**
- Use reportingManagerId to identify Team Lead
- Leverage department/designation for HR identification
- Use existing permission system for access control

### 4. **With Notification System**
- Reuse existing toast notifications
- Add email notifications (if email service exists)
- In-app notifications for pending approvals

---

## Reusable Components Already Available

### From Dashboard
- `stats-card.tsx` - For leave statistics
- `pending-approvals-card.tsx` - For TL/HR approvals
- `activity-timeline.tsx` - For leave history

### From Attendance
- `attendance-table.tsx` - Reference for leave table structure
- `check-in-modal.tsx` - Reference for modal forms
- Location and time components

### From Site Visit
- `site-visit-card.tsx` - Reference for leave cards
- Form patterns from marketing/admin forms

### From Payroll
- `payroll-table.tsx` - Reference for deduction display

---

## Testing Checklist

### Backend Testing
- [ ] Leave balance creation and reset
- [ ] Leave application with validation
- [ ] TL approval workflow
- [ ] HR approval workflow
- [ ] Balance deduction on approval
- [ ] Payroll integration
- [ ] Holiday validation
- [ ] Date overlap checking

### Frontend Testing
- [ ] Leave application form (all types)
- [ ] Balance display accuracy
- [ ] TL approval interface
- [ ] HR approval interface
- [ ] Permission checks (who can see what)
- [ ] Responsive design
- [ ] Error handling

### Integration Testing
- [ ] End-to-end leave workflow
- [ ] Monthly balance reset
- [ ] Payroll deduction calculation
- [ ] Multi-user concurrent applications
- [ ] Permission hour validation with attendance

---

## Migration Plan

### Step 1: Schema Migration
1. Add new leave balance collection
2. Add fixed holidays collection
3. Enhance leave application schema
4. Create balance records for all active employees

### Step 2: Data Migration
1. Initialize current month balances (1 CL, 2h permission)
2. Set up current year fixed holidays
3. Migrate any existing leave records to new schema
4. Update existing leave statuses if needed

### Step 3: Feature Rollout
1. Deploy backend changes
2. Deploy frontend changes
3. Train Team Leads on approval process
4. Train HR on final approval
5. Communicate to all employees

---

## Estimated Timeline

| Phase | Tasks | Duration | Status |
|-------|-------|----------|--------|
| **Phase 1** | Backend schemas & services | 1 week | Not Started |
| **Phase 2** | API endpoints & validation | 1 week | Not Started |
| **Phase 3** | Frontend components | 1 week | Not Started |
| **Phase 4** | Page integration & testing | 1 week | Not Started |
| **Phase 5** | Automation & deployment | 1 week | Not Started |

**Total Estimated Time: 5 weeks**

---

## Success Criteria

### Technical Success
✅ All leave types working (casual, permission, unpaid)  
✅ Complete TL → HR approval workflow  
✅ Accurate balance tracking and reset  
✅ Payroll integration working  
✅ 100% test coverage on critical paths  

### User Success
✅ Employees can apply and track leaves easily  
✅ Team Leads can review team leaves with balance visibility  
✅ HR can perform final approvals efficiently  
✅ < 24 hour average approval time  
✅ 90%+ user adoption within 1 month  

---

## Next Steps

1. ✅ **Review this integration summary** - Understand what exists vs what's needed
2. ✅ **Get client approval** on approach and timeline
3. 🔨 **Start Phase 1** - Enhanced schemas and services
4. 🔨 **Continue with API layer** - Approval workflow endpoints
5. 🔨 **Build frontend components** - Leave application and approvals
6. 🔨 **Integration and testing** - End-to-end workflow
7. 🔨 **Deploy and train users** - Rollout to production

---

**Document Status: Ready for Implementation**  
**Next Action: Client approval to begin development**
