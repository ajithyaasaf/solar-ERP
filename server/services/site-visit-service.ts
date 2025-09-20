/**
 * Site Visit Management Service
 * Handles all field operations for Technical, Marketing, and Admin departments
 */

import { db } from "../firebase";
import { Timestamp } from "firebase-admin/firestore";
import {
  SiteVisit,
  InsertSiteVisit,
  insertSiteVisitSchema,
  Location,
  CustomerDetails,
  TechnicalSiteVisit,
  MarketingSiteVisit,
  AdminSiteVisit,
  SitePhoto
} from "@shared/schema";

export class SiteVisitService {
  private collection = db.collection('siteVisits');

  /**
   * Create a new site visit
   */
  async createSiteVisit(data: InsertSiteVisit): Promise<SiteVisit> {
    try {
      console.log("SITE_VISIT_SERVICE: Creating site visit with data:", JSON.stringify(data, null, 2));
      
      // Data is already validated in the route, so we can use it directly
      const validatedData = data;
      
      // Convert dates to Firestore timestamps
      const firestoreData: any = {
        ...validatedData,
        siteInTime: Timestamp.fromDate(validatedData.siteInTime),
        siteOutTime: validatedData.siteOutTime ? Timestamp.fromDate(validatedData.siteOutTime) : null,
        createdAt: Timestamp.fromDate(validatedData.createdAt || new Date()),
        updatedAt: Timestamp.fromDate(validatedData.updatedAt || new Date()),
        sitePhotos: validatedData.sitePhotos?.map(photo => ({
          ...photo,
          timestamp: Timestamp.fromDate(photo.timestamp)
        })) || []
      };

      // Remove undefined values to prevent Firestore errors
      Object.keys(firestoreData).forEach(key => {
        if (firestoreData[key] === undefined) {
          delete firestoreData[key];
        }
      });

      console.log("SITE_VISIT_SERVICE: Prepared data for Firestore:", JSON.stringify(firestoreData, null, 2));

      const docRef = await this.collection.add(firestoreData);
      console.log("SITE_VISIT_SERVICE: Document created with ID:", docRef.id);
      
      const result = {
        id: docRef.id,
        ...this.convertFirestoreToSiteVisit(firestoreData)
      };
      
      console.log("SITE_VISIT_SERVICE: Returning site visit:", JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('SITE_VISIT_SERVICE: Error creating site visit:', error);
      throw new Error('Failed to create site visit');
    }
  }

  /**
   * Update site visit (for check-out and progress updates)
   */
  async updateSiteVisit(id: string, updates: Partial<InsertSiteVisit>): Promise<SiteVisit> {
    try {
      const docRef = this.collection.doc(id);
      
      // Convert dates to Firestore timestamps in updates
      const firestoreUpdates: any = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      };

      if (updates.siteOutTime) {
        // Handle both Date objects and ISO strings with error handling
        try {
          const siteOutDate = updates.siteOutTime instanceof Date 
            ? updates.siteOutTime 
            : new Date(updates.siteOutTime);
          firestoreUpdates.siteOutTime = Timestamp.fromDate(siteOutDate);
        } catch (error) {
          console.warn('Failed to parse siteOutTime, using current time:', error);
          firestoreUpdates.siteOutTime = Timestamp.fromDate(new Date());
        }
      }

      if (updates.sitePhotos) {
        firestoreUpdates.sitePhotos = updates.sitePhotos.map(photo => {
          const processedPhoto: any = { ...photo };
          
          // Handle timestamp conversion safely with try-catch
          if (photo.timestamp) {
            try {
              processedPhoto.timestamp = photo.timestamp instanceof Date 
                ? Timestamp.fromDate(photo.timestamp)
                : Timestamp.fromDate(new Date(photo.timestamp));
            } catch (error) {
              console.warn('Failed to parse photo timestamp, using current time:', error);
              processedPhoto.timestamp = Timestamp.fromDate(new Date());
            }
          } else {
            // If no timestamp, use current date
            processedPhoto.timestamp = Timestamp.fromDate(new Date());
          }
          
          return processedPhoto;
        });
      }

      // Handle checkout site photos (siteOutPhotos) with robust error handling
      if (updates.siteOutPhotos) {
        firestoreUpdates.siteOutPhotos = updates.siteOutPhotos.map((photo: any) => {
          const processedPhoto: any = { ...photo };
          
          // Handle timestamp conversion safely for checkout photos with try-catch
          if (photo.timestamp) {
            try {
              processedPhoto.timestamp = photo.timestamp instanceof Date 
                ? Timestamp.fromDate(photo.timestamp)
                : Timestamp.fromDate(new Date(photo.timestamp));
            } catch (error) {
              console.warn('Failed to parse checkout photo timestamp, using current time:', error);
              processedPhoto.timestamp = Timestamp.fromDate(new Date());
            }
          } else {
            // If no timestamp, use current date
            processedPhoto.timestamp = Timestamp.fromDate(new Date());
          }
          
          return processedPhoto;
        });
      }

      // Handle updatedAt conversion - can be Date object or ISO string
      if (updates.updatedAt) {
        try {
          const updatedAtDate = updates.updatedAt instanceof Date 
            ? updates.updatedAt 
            : new Date(updates.updatedAt);
          firestoreUpdates.updatedAt = Timestamp.fromDate(updatedAtDate);
        } catch (error) {
          console.warn('Failed to parse updatedAt, using current time:', error);
          firestoreUpdates.updatedAt = Timestamp.fromDate(new Date());
        }
      }

      // Remove undefined values to prevent Firestore errors
      Object.keys(firestoreUpdates).forEach(key => {
        if (firestoreUpdates[key] === undefined) {
          delete firestoreUpdates[key];
        }
      });

      console.log("=== FIRESTORE UPDATE PAYLOAD ===");
      console.log("Original updates:", JSON.stringify(updates, null, 2));
      console.log("Processed Firestore updates:", JSON.stringify({
        ...firestoreUpdates,
        // Convert timestamps to readable format for logging
        siteOutTime: firestoreUpdates.siteOutTime?.toDate?.() || firestoreUpdates.siteOutTime,
        updatedAt: firestoreUpdates.updatedAt?.toDate?.() || firestoreUpdates.updatedAt,
        sitePhotos: firestoreUpdates.sitePhotos ? `Array of ${firestoreUpdates.sitePhotos.length} photos` : undefined,
        siteOutPhotos: firestoreUpdates.siteOutPhotos ? `Array of ${firestoreUpdates.siteOutPhotos.length} photos` : undefined
      }, null, 2));

      await docRef.update(firestoreUpdates);
      
      const updatedDoc = await docRef.get();
      if (!updatedDoc.exists) {
        throw new Error('Site visit not found');
      }

      const result = {
        id: updatedDoc.id,
        ...this.convertFirestoreToSiteVisit(updatedDoc.data()!)
      };

      console.log("=== UPDATE SUCCESS ===");
      console.log("Site visit updated successfully:", {
        id: result.id,
        status: result.status,
        siteOutTime: result.siteOutTime,
        hasLocation: !!result.siteOutLocation,
        hasPhoto: !!result.siteOutPhotoUrl
      });
      console.log("======================");

      return result;
    } catch (error) {
      console.error('=== SITE VISIT UPDATE ERROR ===');
      console.error('Error updating site visit:', error);
      console.error('Error name:', (error as Error).name);
      console.error('Error message:', (error as Error).message);
      console.error('Error stack:', (error as Error).stack);
      console.error('Updates that caused error:', JSON.stringify(updates, null, 2));
      console.error('=====================================');
      throw new Error(`Failed to update site visit: ${(error as Error).message}`);
    }
  }

  /**
   * Get site visit by ID
   */
  async getSiteVisitById(id: string): Promise<SiteVisit | null> {
    try {
      const doc = await this.collection.doc(id).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...this.convertFirestoreToSiteVisit(doc.data()!)
      };
    } catch (error) {
      console.error('Error getting site visit:', error);
      throw new Error('Failed to get site visit');
    }
  }

  /**
   * Get site visits by user ID
   */
  async getSiteVisitsByUser(userId: string, limit = 50): Promise<SiteVisit[]> {
    try {
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreToSiteVisit(doc.data())
      }));
    } catch (error) {
      console.error('Error getting user site visits:', error);
      throw new Error('Failed to get user site visits');
    }
  }

  /**
   * Get site visits by department
   */
  async getSiteVisitsByDepartment(department: 'technical' | 'marketing' | 'admin', limit = 100): Promise<SiteVisit[]> {
    try {
      const snapshot = await this.collection
        .where('department', '==', department)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreToSiteVisit(doc.data())
      }));
    } catch (error) {
      console.error('Error getting department site visits:', error);
      throw new Error('Failed to get department site visits');
    }
  }

  /**
   * Get active (in-progress) site visits
   */
  async getActiveSiteVisits(): Promise<SiteVisit[]> {
    try {
      const snapshot = await this.collection
        .where('status', '==', 'in_progress')
        .orderBy('siteInTime', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreToSiteVisit(doc.data())
      }));
    } catch (error) {
      console.error('Error getting active site visits:', error);
      throw new Error('Failed to get active site visits');
    }
  }

  /**
   * Get site visits by date range
   */
  async getSiteVisitsByDateRange(startDate: Date, endDate: Date): Promise<SiteVisit[]> {
    try {
      const snapshot = await this.collection
        .where('siteInTime', '>=', Timestamp.fromDate(startDate))
        .where('siteInTime', '<=', Timestamp.fromDate(endDate))
        .orderBy('siteInTime', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreToSiteVisit(doc.data())
      }));
    } catch (error) {
      console.error('Error getting site visits by date range:', error);
      throw new Error('Failed to get site visits by date range');
    }
  }

  /**
   * Get site visits with filters
   */
  async getSiteVisitsWithFilters(filters: {
    userId?: string;
    department?: 'technical' | 'marketing' | 'admin';
    status?: 'in_progress' | 'completed' | 'cancelled';
    visitPurpose?: string;
    visitOutcome?: 'converted' | 'on_process' | 'cancelled';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<SiteVisit[]> {
    try {
      // Ultra-simplified approach: Get all data without any compound queries
      // This completely avoids Firebase index requirements
      let query: FirebaseFirestore.Query | FirebaseFirestore.CollectionReference = this.collection;

      // Only apply ONE simple equality filter if needed
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      } else if (filters.department) {
        query = query.where('department', '==', filters.department);
      }
      // For master admin, get all data without any query filters

      const snapshot = await query.limit(filters.limit || 100).get();
      let results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreToSiteVisit(doc.data())
      }));

      console.log(`SITE_VISIT_SERVICE: Retrieved ${results.length} documents from Firestore`);
      
      // DEBUG: Log the structure of the first result to check what data is included
      if (results.length > 0) {
        console.log('SITE_VISIT_DEBUG: Sample result structure:');
        console.log('- Has customer data:', !!results[0].customer);
        console.log('- Has marketing data:', !!results[0].marketingData);
        console.log('- Has technical data:', !!results[0].technicalData);
        console.log('- Has admin data:', !!results[0].adminData);
        console.log('- Total site photos:', results[0].sitePhotos ? results[0].sitePhotos.length : 0);
        console.log('- Checkout photos (siteOutPhotos):', results[0].siteOutPhotos ? results[0].siteOutPhotos.length : 0);
        console.log('- Has check-in photo:', !!results[0].siteInPhotoUrl);
        console.log('- Has check-out photo:', !!results[0].siteOutPhotoUrl);
        console.log('- Customer name:', results[0].customer?.name || 'N/A');
        console.log('- Status:', results[0].status);
        console.log('- Department:', results[0].department);
        if (results[0].marketingData) {
          console.log('- Marketing data keys:', Object.keys(results[0].marketingData));
        }
      }

      // Apply all other filters in memory to avoid compound index requirements
      if (filters.status) {
        const beforeCount = results.length;
        results = results.filter(sv => sv.status === filters.status);
        console.log(`SITE_VISIT_SERVICE: Applied status filter '${filters.status}' in memory, ${beforeCount} -> ${results.length} results`);
      }

      if (filters.startDate) {
        const beforeCount = results.length;
        results = results.filter(sv => sv.siteInTime >= filters.startDate!);
        console.log(`SITE_VISIT_SERVICE: Applied start date filter ${filters.startDate.toISOString()}, ${beforeCount} -> ${results.length} results`);
      }

      if (filters.endDate) {
        const beforeCount = results.length;
        results = results.filter(sv => sv.siteInTime <= filters.endDate!);
        console.log(`SITE_VISIT_SERVICE: Applied end date filter ${filters.endDate.toISOString()}, ${beforeCount} -> ${results.length} results`);
      }

      if (filters.visitPurpose) {
        results = results.filter(sv => sv.visitPurpose === filters.visitPurpose);
      }

      if (filters.visitOutcome) {
        const beforeCount = results.length;
        results = results.filter(sv => sv.visitOutcome === filters.visitOutcome);
        console.log(`SITE_VISIT_SERVICE: Applied visitOutcome filter '${filters.visitOutcome}' in memory, ${beforeCount} -> ${results.length} results`);
      }

      // Sort results by date descending (newest first)
      results.sort((a, b) => b.siteInTime.getTime() - a.siteInTime.getTime());

      return results;
    } catch (error) {
      console.error('Error getting filtered site visits:', error);
      throw new Error('Failed to get filtered site visits');
    }
  }

  /**
   * Delete site visit
   */
  async deleteSiteVisit(id: string): Promise<void> {
    try {
      await this.collection.doc(id).delete();
    } catch (error) {
      console.error('Error deleting site visit:', error);
      throw new Error('Failed to delete site visit');
    }
  }

  /**
   * Add photos to existing site visit
   */
  async addSitePhotos(siteVisitId: string, photos: SitePhoto[]): Promise<SiteVisit> {
    try {
      const docRef = this.collection.doc(siteVisitId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new Error('Site visit not found');
      }

      const currentData = doc.data()!;
      const currentPhotos = currentData.sitePhotos || [];
      
      // Convert new photos to Firestore format
      const firestorePhotos = photos.map(photo => ({
        ...photo,
        timestamp: Timestamp.fromDate(photo.timestamp)
      }));

      // Ensure we don't exceed 20 photos limit
      const updatedPhotos = [...currentPhotos, ...firestorePhotos].slice(0, 20);

      await docRef.update({
        sitePhotos: updatedPhotos,
        updatedAt: Timestamp.fromDate(new Date())
      });

      const updatedDoc = await docRef.get();
      return {
        id: updatedDoc.id,
        ...this.convertFirestoreToSiteVisit(updatedDoc.data()!)
      };
    } catch (error) {
      console.error('Error adding site photos:', error);
      throw new Error('Failed to add site photos');
    }
  }

  /**
   * Get site visit analytics/statistics
   */
  async getSiteVisitStats(filters?: {
    department?: 'technical' | 'marketing' | 'admin';
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      let query: FirebaseFirestore.Query | FirebaseFirestore.CollectionReference = this.collection;

      if (filters?.department) {
        query = query.where('department', '==', filters.department);
      }

      if (filters?.startDate) {
        query = query.where('siteInTime', '>=', Timestamp.fromDate(filters.startDate));
      }

      if (filters?.endDate) {
        query = query.where('siteInTime', '<=', Timestamp.fromDate(filters.endDate));
      }

      const snapshot = await query.get();
      const siteVisits = snapshot.docs.map((doc: any) => doc.data());

      return {
        total: siteVisits.length,
        inProgress: siteVisits.filter((sv: any) => sv.status === 'in_progress').length,
        completed: siteVisits.filter((sv: any) => sv.status === 'completed').length,
        cancelled: siteVisits.filter((sv: any) => sv.status === 'cancelled').length,
        byDepartment: {
          technical: siteVisits.filter((sv: any) => sv.department === 'technical').length,
          marketing: siteVisits.filter((sv: any) => sv.department === 'marketing').length,
          admin: siteVisits.filter((sv: any) => sv.department === 'admin').length
        },
        byPurpose: siteVisits.reduce((acc: any, sv: any) => {
          acc[sv.visitPurpose] = (acc[sv.visitPurpose] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      console.error('Error getting site visit stats:', error);
      throw new Error('Failed to get site visit statistics');
    }
  }

  /**
   * Get all site visits for monitoring dashboard (Master Admin and HR only)
   */
  async getAllSiteVisitsForMonitoring(): Promise<SiteVisit[]> {
    try {
      const snapshot = await this.collection
        .orderBy('siteInTime', 'desc')
        .limit(500) // Limit to recent 500 for performance
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreToSiteVisit(doc.data())
      }));
    } catch (error) {
      console.error('Error getting site visits for monitoring:', error);
      throw new Error('Failed to get site visits for monitoring');
    }
  }

  /**
   * Export site visits to Excel format
   */
  async exportSiteVisitsToExcel(filters?: {
    department?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Buffer> {
    try {
      // Import xlsx dynamically to avoid bundling issues
      const XLSX = await import('xlsx');
      
      let query: any = this.collection.orderBy('siteInTime', 'desc');

      // Apply filters
      if (filters?.department) {
        query = query.where('department', '==', filters.department);
      }
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters?.startDate) {
        query = query.where('siteInTime', '>=', Timestamp.fromDate(filters.startDate));
      }
      if (filters?.endDate) {
        query = query.where('siteInTime', '<=', Timestamp.fromDate(filters.endDate));
      }

      const snapshot = await query.get();
      const siteVisits = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...this.convertFirestoreToSiteVisit(doc.data())
      }));

      // Transform data for Excel export
      const excelData = siteVisits.map((visit: any) => ({
        'Visit ID': visit.id,
        'Employee Name': visit.userId,
        'Department': visit.department,
        'Customer Name': (visit as any).customerDetails?.name || visit.customerName || 'N/A',
        'Customer Phone': (visit as any).customerDetails?.phone || visit.customerPhone || 'N/A',
        'Customer Email': (visit as any).customerDetails?.email || visit.customerEmail || 'N/A',
        'Visit Purpose': visit.visitPurpose,
        'Status': visit.status,
        'Check-in Time': visit.siteInTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        'Check-in Location': visit.siteInLocation || 'N/A',
        'Check-out Time': visit.siteOutTime ? visit.siteOutTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not checked out',
        'Check-out Location': visit.siteOutLocation || 'N/A',
        'Notes': visit.notes || 'N/A',
        'Photos Count': visit.sitePhotos?.length || 0,
        'Created At': visit.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Auto-fit column widths
      const columnWidths = [
        { wch: 15 }, // Visit ID
        { wch: 20 }, // Employee Name
        { wch: 12 }, // Department
        { wch: 25 }, // Customer Name
        { wch: 15 }, // Customer Phone
        { wch: 25 }, // Customer Email
        { wch: 15 }, // Visit Purpose
        { wch: 12 }, // Status
        { wch: 20 }, // Check-in Time
        { wch: 30 }, // Check-in Location
        { wch: 20 }, // Check-out Time
        { wch: 30 }, // Check-out Location
        { wch: 40 }, // Notes
        { wch: 12 }, // Photos Count
        { wch: 20 }  // Created At
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Site Visits');

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return excelBuffer;
    } catch (error) {
      console.error('Error exporting site visits to Excel:', error);
      throw new Error('Failed to export site visits to Excel');
    }
  }

  /**
   * Convert Firestore data to SiteVisit object
   */
  private convertFirestoreToSiteVisit(data: any): Omit<SiteVisit, 'id'> {
    // Merge original site photos with checkout site photos
    const originalPhotos = (data.sitePhotos || []).map((photo: any) => ({
      ...photo,
      timestamp: photo.timestamp?.toDate() || new Date()
    }));
    
    const checkoutPhotos = (data.siteOutPhotos || []).map((photo: any) => ({
      ...photo,
      timestamp: photo.timestamp?.toDate() || new Date()
    }));

    // Combine both photo arrays, with checkout photos appearing after original photos
    const allPhotos = [...originalPhotos, ...checkoutPhotos];

    return {
      ...data,
      siteInTime: data.siteInTime?.toDate() || new Date(),
      siteOutTime: data.siteOutTime?.toDate() || undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      sitePhotos: allPhotos,
      // Keep the original siteOutPhotos field for reference
      siteOutPhotos: checkoutPhotos
    };
  }
}

// Export singleton instance
export const siteVisitService = new SiteVisitService();