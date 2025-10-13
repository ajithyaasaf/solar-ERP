# Prakash Greens Energy Dashboard

## Overview

This is an enterprise-grade dashboard application for Prakash Greens Energy, designed as a comprehensive business management system. It aims to streamline operations by handling attendance tracking, customer management, product catalog, quotations, invoices, payroll, and user management with sophisticated role-based access control. The project's ambition is to provide a robust, scalable solution for efficient business management in the energy sector.

## User Preferences

Preferred communication style: Simple, everyday language.
Time format preference: 12-hour format (AM/PM) throughout the application.
Business logic preference: Google-level enterprise approach with department-based time management.
Overtime calculation: Simple rule - any work beyond department checkout time is considered overtime.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context for authentication, TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized builds
- **UI/UX Decisions**: Clean, simple interface focused on core requirements (photo + location + timing). Enhanced error messages with plain language and context-aware guidance. Consistent 12-hour format enforcement across all time displays and inputs.

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Authentication**: Firebase Auth with custom token verification
- **Database**: Firebase Firestore (NoSQL document database)
- **File Storage**: Cloudinary for attendance photos and document storage
- **API Design**: RESTful endpoints with comprehensive error handling.

### Authentication & Authorization
- **Two-layer permission model**: Department-based feature access and Designation-based action permissions.
- **Role Hierarchy**: master_admin → admin → employee.
- **Permission System**: Granular access control with 50+ permissions.

### Key Features & Technical Implementations
- **User Management**: Role-based access control with department and designation assignments.
- **Attendance Management**: Enterprise-grade geolocation validation with indoor GPS compensation, photo verification, real-time location tracking (simplified to remove geofencing restrictions), and automated late arrival/overtime calculations. Unified validation requires location access and a selfie photo for check-in/out. **Manual Overtime System (Aug 2025)**: COMPLETED transition from automatic OT calculation to user-controlled OT sessions with "Start OT" and "End OT" buttons. Each OT session captures selfie photos and GPS location at start/end with Google Maps reverse geocoding for human-readable addresses. Fixed critical timezone parsing bug where 6:00 PM IST was incorrectly interpreted as 11:30 PM, causing OT buttons to show wrong availability times. System now correctly handles IST timezone conversion (UTC+5:30) and enables OT buttons after department checkout time as designed. **Smart Unified Checkout System (Aug 2025)**: IMPLEMENTED intelligent single-button checkout system that eliminates UX confusion between regular checkout and manual OT end sessions. System automatically detects current state (regular work vs active OT) and shows appropriate action with accurate working hours calculation (fixed early arrival + late departure overtime logic). Replaces dual-button confusion with context-aware interface that guides users to the correct action. **OT Calculation & Payroll Integration (Aug 2025)**: VERIFIED and PRODUCTION READY - Fixed critical calculation bug in Enterprise Time Service where overtime was incorrectly included in regular working hours. System now properly separates regular time (9h for 9AM-6PM schedule) from overtime (early arrival + late departure). Complete payroll integration confirmed working with 1.5x OT rate, monthly aggregation, and proper salary calculations for all employees. **Forgotten Checkout Management System (Aug 2025)**: FULLY IMPLEMENTED and CONSOLIDATED - Comprehensive solution for handling forgotten employee checkouts with unified tab structure. Features smart detection system identifying incomplete records (check-in without checkout), consolidated "Corrections" tab handling both incomplete records and general edits, department-based suggested checkout times, quick-fix options for bulk corrections, enhanced edit modal with visual cues, and admin-only corrections maintaining data integrity. System follows approved approach of leaving checkout blank for admin correction rather than auto-checkout or false overtime assumptions. **Tab Structure Optimization (Aug 2025)**: COMPLETED - Simplified attendance management interface from 4 tabs to 3 tabs by consolidating "Incomplete" and "Corrections" into unified "Corrections" tab, eliminating user confusion while preserving all functionality with enhanced workflow. **Comprehensive Mobile Responsiveness (Aug 2025)**: FULLY IMPLEMENTED - Complete mobile-first responsive design overhaul across all attendance components. Features dual-view system with mobile card layouts for small screens and table layouts for desktop, responsive tab navigation with truncated text for mobile, grid-based action buttons that stack appropriately on different screen sizes, optimized filter controls that stack vertically on mobile, and enhanced status cards with proper text truncation and icon placement. All attendance management and employee attendance pages now provide native app-like experience with proper touch interaction and optimal screen space usage across all device sizes.
- **Business Operations**: CRM for customer management, solar energy product catalog, quotation generation, invoice management, and comprehensive payroll calculation.
- **Site Visit System**: Complete location capture with Google Maps API reverse geocoding successfully implemented. Follow-up modal now displays human-readable addresses (e.g., "123 Main St, City, State") instead of coordinates. Enhanced location capture with manual fallback, automated customer data handling via autocomplete, and enterprise-grade validation with proper TypeScript compliance across all forms (Marketing, Admin, Technical). **Visit History Timeline**: Implemented scalable timeline solution replacing single "View Details" button with individual access to all visits (original + follow-ups) in chronological order. Timeline displays latest visits first, supports 200-500+ visits per customer with scrollable interface, individual view details buttons for each visit, and enhanced status indicators. **Follow-up Checkout System**: Fully resolved critical 400 error blocking follow-up checkout completion. Fixed through comprehensive debugging infrastructure, enhanced error logging, direct fetch implementation bypassing query client, and raw request tracking. **Follow-up Checkout Images Issue (Aug 2025)**: RESOLVED - Fixed critical data corruption in follow-up service where `siteOutPhotos` were being processed as complex objects instead of simple URL strings. Updated `convertSiteOutPhotos` method to handle both formats correctly, ensuring checkout images display properly in Follow-Up Visit Details modal. System now stores and retrieves follow-up checkout photos as simple URL arrays while maintaining backward compatibility for any corrupted legacy data. **Mobile Responsiveness (Aug 2025)**: COMPLETED - Achieved perfect mobile responsiveness across all site visit modals (Start, Checkout, Follow-up, Follow-up Details) tested on Realme 7 Pro. Fixed horizontal scrolling issues in follow-up forms by implementing mobile-first step indicators with vertical progress bars, full-width responsive buttons, optimized modal heights (80vh), and mobile-optimized layouts. All modals now provide native app-like experience with proper touch interaction and optimal screen space usage. **Photo Overlay System (Aug 2025)**: FULLY IMPLEMENTED - Comprehensive photo overlay feature across all site visit photo capture points using reusable utility (`photo-overlay-utils.ts`). System automatically adds timestamp and location information to all captured photos including site visit start (check-in), checkout, follow-up visits, and additional photo uploads. Overlay displays professional dark background with white text showing precise timestamp and human-readable address at bottom of photos. Provides irrefutable documentation for legal purposes, client verification, audit trails, and quality control across all departments (Technical, Marketing, Admin).
- **Payroll System**: Dynamic earnings and deductions based on salary structure, proper EPF/ESI calculations, and handling of various attendance statuses (overtime, half-day, early checkout).
- **Enterprise Time Service**: Centralized 12-hour format standardization, real-time overtime calculation based on department schedules, and intelligent caching.
- **Code Optimization**: Comprehensive code splitting and bundle optimization using strategic component splitting and lazy loading for performance gains.

## External Dependencies

- **Firebase Services**: Firebase Auth (user authentication), Firestore (primary database).
- **Cloudinary**: Image storage and optimization for attendance photos.
- **TanStack Query**: Server state management and caching.
- **Radix UI**: Accessible component primitives.
- **Google Maps API**: For reverse geocoding in enhanced location capture.

## Recent Changes

### Quotation System - Critical Pricing Calculation Fixes (October 2025)

**Problem Resolved**: Fixed critical subsidy calculation errors that were causing incorrect pricing and customer payments in the solar quotation system.

**Root Causes Identified**:
1. **Math.floor() precision loss**: kW calculations were truncating decimal values (e.g., 5.9 kW → 5 kW), causing incorrect subsidy ranges
2. **Wrong subsidy logic**: System was using per-kW multiplication instead of range-based tiers
3. **Missing property type check**: Off-grid residential systems were incorrectly receiving subsidies
4. **Range gaps**: Exact equality checks (kw === 2) caused values like 1.2 kW or 2.1 kW to receive ₹0 subsidy

**Fixes Implemented**:

1. **Precise kW Calculation**:
   - Changed from `Math.floor()` to `Math.round(kw * 100) / 100` for 2 decimal precision
   - Frontend: `(panelWatts × panelCount) / 1000` with full precision
   - Backend: `QuotationTemplateService.calculateSystemKW()` updated to match

2. **Correct Subsidy Range Logic**:
   - **Up to 1 kW**: ₹30,000
   - **1-2 kW** (kw > 1 && kw <= 2): ₹60,000
   - **2-10 kW** (kw > 2 && kw <= 10): ₹78,000
   - **Above 10 kW**: ₹0 (no subsidy)

3. **Eligibility Enforcement**:
   - Subsidy applies ONLY to **residential** properties
   - Subsidy applies ONLY to **on_grid** and **hybrid** projects (NOT off_grid)
   - Both frontend and backend enforce these checks

4. **Implementation Locations**:
   - Frontend: `client/src/pages/quotation-creation.tsx` - calculateSubsidy function
   - Backend: `server/services/quotation-template-service.ts` - calculateSubsidy and calculateSystemKW methods

**Technical Details**:
- projectValue is treated as total including GST
- basePrice = projectValue / (1 + GST%)
- GST amount = projectValue - basePrice
- Subsidy calculation uses precise kW value with range-based lookup
- Customer payment = projectValue - subsidy

**Impact**: All quotations now calculate subsidies correctly based on precise kW ranges, ensuring accurate pricing for residential on_grid/hybrid solar installations.