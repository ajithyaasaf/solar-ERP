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
- **Attendance Management**: Enterprise-grade geolocation validation with indoor GPS compensation, photo verification, real-time location tracking (simplified to remove geofencing restrictions), and automated late arrival/overtime calculations. Unified validation requires location access and a selfie photo for check-in/out. **Manual Overtime System (Aug 2025)**: COMPLETED transition from automatic OT calculation to user-controlled OT sessions with "Start OT" and "End OT" buttons. Each OT session captures selfie photos and GPS location at start/end with Google Maps reverse geocoding for human-readable addresses. Fixed critical timezone parsing bug where 6:00 PM IST was incorrectly interpreted as 11:30 PM, causing OT buttons to show wrong availability times. System now correctly handles IST timezone conversion (UTC+5:30) and enables OT buttons after department checkout time as designed.
- **Business Operations**: CRM for customer management, solar energy product catalog, quotation generation, invoice management, and comprehensive payroll calculation.
- **Site Visit System**: Complete location capture with Google Maps API reverse geocoding successfully implemented. Follow-up modal now displays human-readable addresses (e.g., "123 Main St, City, State") instead of coordinates. Enhanced location capture with manual fallback, automated customer data handling via autocomplete, and enterprise-grade validation with proper TypeScript compliance across all forms (Marketing, Admin, Technical). **Visit History Timeline**: Implemented scalable timeline solution replacing single "View Details" button with individual access to all visits (original + follow-ups) in chronological order. Timeline displays latest visits first, supports 200-500+ visits per customer with scrollable interface, individual view details buttons for each visit, and enhanced status indicators. **Follow-up Checkout System**: Fully resolved critical 400 error blocking follow-up checkout completion. Fixed through comprehensive debugging infrastructure, enhanced error logging, direct fetch implementation bypassing query client, and raw request tracking. **Follow-up Checkout Images Issue (Aug 2025)**: RESOLVED - Fixed critical data corruption in follow-up service where `siteOutPhotos` were being processed as complex objects instead of simple URL strings. Updated `convertSiteOutPhotos` method to handle both formats correctly, ensuring checkout images display properly in Follow-Up Visit Details modal. System now stores and retrieves follow-up checkout photos as simple URL arrays while maintaining backward compatibility for any corrupted legacy data. **Mobile Responsiveness (Aug 2025)**: COMPLETED - Achieved perfect mobile responsiveness across all site visit modals (Start, Checkout, Follow-up, Follow-up Details) tested on Realme 7 Pro. Fixed horizontal scrolling issues in follow-up forms by implementing mobile-first step indicators with vertical progress bars, full-width responsive buttons, optimized modal heights (80vh), and mobile-optimized layouts. All modals now provide native app-like experience with proper touch interaction and optimal screen space usage.
- **Payroll System**: Dynamic earnings and deductions based on salary structure, proper EPF/ESI calculations, and handling of various attendance statuses (overtime, half-day, early checkout).
- **Enterprise Time Service**: Centralized 12-hour format standardization, real-time overtime calculation based on department schedules, and intelligent caching.
- **Code Optimization**: Comprehensive code splitting and bundle optimization using strategic component splitting and lazy loading for performance gains.

## External Dependencies

- **Firebase Services**: Firebase Auth (user authentication), Firestore (primary database).
- **Cloudinary**: Image storage and optimization for attendance photos.
- **TanStack Query**: Server state management and caching.
- **Radix UI**: Accessible component primitives.
- **Google Maps API**: For reverse geocoding in enhanced location capture.