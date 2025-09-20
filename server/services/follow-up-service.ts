/**
 * Follow-Up Site Visit Service
 * Handles follow-up visit data separately from main site visits
 */

import { db } from "../firebase";
import { Timestamp } from "firebase-admin/firestore";
import {
  FollowUpSiteVisit,
  InsertFollowUpSiteVisit,
  insertFollowUpSiteVisitSchema,
  Location,
  CustomerDetails
} from "@shared/schema";

export class FollowUpService {
  private collection = db.collection('followUpVisits');
  private siteVisitsCollection = db.collection('siteVisits');

  /**
   * Create a new follow-up visit
   */
  async createFollowUp(data: InsertFollowUpSiteVisit): Promise<FollowUpSiteVisit> {
    try {
      console.log("FOLLOW_UP_SERVICE: Creating follow-up with data:", JSON.stringify(data, null, 2));
      
      // Validate data
      const validatedData = insertFollowUpSiteVisitSchema.parse(data);
      
      // Convert dates to Firestore timestamps and filter out undefined values
      const firestoreData: any = {
        ...validatedData,
        siteInTime: Timestamp.fromDate(validatedData.siteInTime),
        siteOutTime: validatedData.siteOutTime ? Timestamp.fromDate(validatedData.siteOutTime) : null,
        createdAt: Timestamp.fromDate(validatedData.createdAt || new Date()),
        updatedAt: Timestamp.fromDate(validatedData.updatedAt || new Date())
      };

      // Remove undefined values to prevent Firestore errors
      Object.keys(firestoreData).forEach(key => {
        if (firestoreData[key] === undefined) {
          delete firestoreData[key];
        }
      });

      console.log("FOLLOW_UP_SERVICE: Cleaned data for Firestore:", JSON.stringify(firestoreData, null, 2));

      console.log("FOLLOW_UP_SERVICE: Prepared data for Firestore:", JSON.stringify(firestoreData, null, 2));

      // Create the follow-up document
      const docRef = await this.collection.add(firestoreData);
      console.log("FOLLOW_UP_SERVICE: Document created with ID:", docRef.id);
      
      // Update the original visit to increment follow-up count
      try {
        const originalVisitRef = this.siteVisitsCollection.doc(validatedData.originalVisitId);
        const originalVisitDoc = await originalVisitRef.get();
        
        if (originalVisitDoc.exists) {
          const currentCount = originalVisitDoc.data()?.followUpCount || 0;
          await originalVisitRef.update({
            followUpCount: currentCount + 1,
            hasFollowUps: true,
            updatedAt: Timestamp.fromDate(new Date())
          });
          console.log("FOLLOW_UP_SERVICE: Updated original visit follow-up count:", currentCount + 1);
        }
      } catch (error) {
        console.error("FOLLOW_UP_SERVICE: Error updating original visit:", error);
        // Don't fail the follow-up creation if original visit update fails
      }
      
      const result = {
        id: docRef.id,
        ...this.convertFirestoreToFollowUp(firestoreData)
      };
      
      console.log("FOLLOW_UP_SERVICE: Returning follow-up:", JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('FOLLOW_UP_SERVICE: Error creating follow-up:', error);
      throw new Error('Failed to create follow-up visit');
    }
  }

  /**
   * Update follow-up visit (for check-out)
   */
  async updateFollowUp(id: string, updates: Partial<InsertFollowUpSiteVisit>): Promise<FollowUpSiteVisit> {
    try {
      const docRef = this.collection.doc(id);
      
      // Convert dates to Firestore timestamps in updates
      const firestoreUpdates: any = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      };

      if (updates.siteOutTime) {
        firestoreUpdates.siteOutTime = Timestamp.fromDate(updates.siteOutTime);
      }

      // Handle siteOutPhotos - FIXED: Ensure proper URL string storage
      if (updates.siteOutPhotos && Array.isArray(updates.siteOutPhotos)) {
        console.log("FOLLOW_UP_SERVICE: Processing siteOutPhotos:", updates.siteOutPhotos);
        
        // Always convert to simple string array to prevent corruption
        firestoreUpdates.siteOutPhotos = updates.siteOutPhotos.map((photo: any) => {
          if (typeof photo === 'string') {
            return photo; // Already a string URL
          } else if (photo && typeof photo === 'object' && photo.url) {
            return photo.url; // Extract URL from photo object
          } else {
            console.warn('FOLLOW_UP_SERVICE: Invalid photo format, skipping:', photo);
            return null;
          }
        }).filter(Boolean); // Remove null/undefined values
        
        console.log("FOLLOW_UP_SERVICE: Cleaned siteOutPhotos:", firestoreUpdates.siteOutPhotos);
        
        // Additional validation to ensure all are strings
        const allStrings = firestoreUpdates.siteOutPhotos.every((url: any) => typeof url === 'string');
        if (!allStrings) {
          console.error("FOLLOW_UP_SERVICE: ERROR - Not all photo URLs are strings, forcing conversion");
          firestoreUpdates.siteOutPhotos = firestoreUpdates.siteOutPhotos.map((url: any) => String(url));
        }
      }

      // Remove undefined values to prevent Firestore errors
      Object.keys(firestoreUpdates).forEach(key => {
        if (firestoreUpdates[key] === undefined) {
          delete firestoreUpdates[key];
        }
      });

      console.log("=== FOLLOW-UP SERVICE UPDATE DEBUG ===");
      console.log("Follow-up ID:", id);
      console.log("Original updates:", JSON.stringify(updates, null, 2));
      console.log("Firestore updates:", JSON.stringify(firestoreUpdates, null, 2));
      console.log("======================================");

      await docRef.update(firestoreUpdates);
      
      const updatedDoc = await docRef.get();
      if (!updatedDoc.exists) {
        throw new Error('Follow-up visit not found after update');
      }

      return {
        id: updatedDoc.id,
        ...this.convertFirestoreToFollowUp(updatedDoc.data()!)
      };
    } catch (error) {
      console.error('FOLLOW_UP_SERVICE: Error updating follow-up:', error);
      throw new Error('Failed to update follow-up visit');
    }
  }

  /**
   * Get follow-up by ID
   */
  async getFollowUpById(id: string): Promise<FollowUpSiteVisit | null> {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...this.convertFirestoreToFollowUp(doc.data()!)
      };
    } catch (error) {
      console.error('FOLLOW_UP_SERVICE: Error getting follow-up:', error);
      return null;
    }
  }

  /**
   * Get all follow-ups for an original visit
   */
  async getFollowUpsByOriginalVisit(originalVisitId: string): Promise<FollowUpSiteVisit[]> {
    try {
      const snapshot = await this.collection
        .where('originalVisitId', '==', originalVisitId)
        .get();

      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreToFollowUp(doc.data())
      }));

      return docs.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime; // Most recent first
      });
    } catch (error) {
      console.error('FOLLOW_UP_SERVICE: Error getting follow-ups for original visit:', error);
      return [];
    }
  }

  /**
   * Get follow-ups by user with filtering
   */
  async getFollowUpsByUser(
    userId: string, 
    department?: string,
    status?: string
  ): Promise<FollowUpSiteVisit[]> {
    try {
      console.log("FOLLOW_UP_SERVICE: Getting follow-ups for user:", userId);
      
      // Simple query to avoid index issues
      const snapshot = await this.collection.where('userId', '==', userId).get();
      
      console.log("FOLLOW_UP_SERVICE: Found", snapshot.size, "documents");
      
      // Filter and map in memory
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreToFollowUp(doc.data())
      })).filter(doc => {
        // Apply additional filters in memory
        if (department && doc.department !== department) return false;
        if (status && doc.status !== status) return false;
        return true;
      });

      console.log("FOLLOW_UP_SERVICE: After filtering:", docs.length, "documents");
      console.log("FOLLOW_UP_SERVICE: Documents:", docs);

      return docs.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime; // Most recent first
      });
    } catch (error) {
      console.error('FOLLOW_UP_SERVICE: Error getting follow-ups by user:', error);
      return [];
    }
  }

  /**
   * Helper method to convert siteOutPhotos from Firestore format
   * FIXED: Handle both string arrays and complex photo objects
   */
  private convertSiteOutPhotos(siteOutPhotos: any): any[] {
    if (!Array.isArray(siteOutPhotos)) {
      return [];
    }
    
    // For follow-ups, siteOutPhotos are stored as simple string URLs
    // For regular site visits, they might be complex objects
    return siteOutPhotos.map((photo: any) => {
      if (typeof photo === 'string') {
        // Simple string URL format - return as-is for follow-ups
        return photo;
      } else if (photo && typeof photo === 'object') {
        // Complex photo object format - convert timestamp
        return {
          ...photo,
          timestamp: photo.timestamp?.toDate ? photo.timestamp.toDate() : new Date(photo.timestamp || Date.now())
        };
      } else {
        // Invalid format - return empty string or skip
        console.warn('FOLLOW_UP_SERVICE: Invalid siteOutPhotos format:', photo);
        return null;
      }
    }).filter(Boolean); // Remove any null values
  }

  /**
   * Convert Firestore document to FollowUpSiteVisit object
   */
  private convertFirestoreToFollowUp(data: any): Omit<FollowUpSiteVisit, 'id'> {
    return {
      originalVisitId: data.originalVisitId,
      userId: data.userId,
      department: data.department,
      siteInTime: data.siteInTime?.toDate() || new Date(),
      siteInLocation: data.siteInLocation,
      siteInPhotoUrl: data.siteInPhotoUrl,
      siteOutTime: data.siteOutTime?.toDate() || undefined,
      siteOutLocation: data.siteOutLocation,
      siteOutPhotoUrl: data.siteOutPhotoUrl,
      siteOutPhotos: this.convertSiteOutPhotos(data.siteOutPhotos || []),
      followUpReason: data.followUpReason,
      description: data.description,
      sitePhotos: data.sitePhotos || [],
      status: data.status || 'in_progress',
      notes: data.notes,
      customer: data.customer,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }
}

// Export singleton instance
export const followUpService = new FollowUpService();