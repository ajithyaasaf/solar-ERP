import { auth as adminAuth } from '../firebase';
import { storage } from '../storage';
import { cacheService } from './cache-service';
import { emailService } from './email-service';
import { z } from 'zod';
import crypto from 'crypto';

// Generate a cryptographically secure random password
function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  // Use crypto for secure random number generation
  const getRandomInt = (max: number): number => {
    const randomBuffer = crypto.randomBytes(4);
    const randomInt = randomBuffer.readUInt32BE(0);
    return randomInt % max;
  };

  let password = '';
  // Ensure at least one of each type
  password += uppercase[getRandomInt(uppercase.length)];
  password += lowercase[getRandomInt(lowercase.length)];
  password += numbers[getRandomInt(numbers.length)];
  password += symbols[getRandomInt(symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[getRandomInt(allChars.length)];
  }

  // Shuffle the password using crypto random
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  return passwordArray.join('');
}

// Unified user creation schema - password is now optional (auto-generated if not provided)
export const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  createLogin: z.boolean().default(false), // Whether to create Firebase Auth account
  role: z.enum(["master_admin", "admin", "employee"]).default("employee"),
  department: z.enum(["operations", "admin", "hr", "marketing", "sales", "technical", "housekeeping"]).nullable().default(null)
});

// Import schemas from shared
import { paymentModes, maritalStatus, bloodGroups, employeeStatus, insertUserEnhancedSchema } from '@shared/schema';

// User update schema - includes all employee fields
export const updateUserSchema = z.object({
  displayName: z.string().min(2).optional(),
  role: z.enum(["master_admin", "admin", "employee"]).optional(),
  department: z.enum(["operations", "admin", "hr", "marketing", "sales", "technical", "housekeeping"]).nullable().optional(),
  designation: z.enum([
    "ceo", "gm", "officer", "executive", "cre", "team_leader", "technician", "welder", "house_man"
  ]).nullable().optional(),
  employeeId: z.string().optional(),
  reportingManagerId: z.string().nullable().optional(),
  payrollGrade: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"]).nullable().optional(),
  joinDate: z.date().optional(),
  isActive: z.boolean().optional(),
  photoURL: z.string().nullable().optional(),

  // Statutory Information
  esiNumber: z.string().optional(),
  epfNumber: z.string().optional(),
  aadharNumber: z.string().optional(),
  panNumber: z.string().optional(),

  // Personal Details
  fatherName: z.string().optional(),
  spouseName: z.string().optional(),
  dateOfBirth: z.date().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  maritalStatus: z.enum(maritalStatus).optional(),
  bloodGroup: z.enum(bloodGroups).optional(),

  // Professional Information
  educationalQualification: z.string().optional(),
  experienceYears: z.number().min(0).optional(),

  // Employment Lifecycle
  dateOfLeaving: z.date().optional(),
  employeeStatus: z.enum(employeeStatus).optional(),

  // Contact Information
  contactNumber: z.string().optional(),
  emergencyContactPerson: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
  permanentAddress: z.string().optional(),
  presentAddress: z.string().optional(),
  location: z.string().optional(),

  // Payroll Information
  paymentMode: z.enum(paymentModes).optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  ifscCode: z.string().optional(),

  // Document Management
  documents: z.object({
    marksheets: z.array(z.string()).optional(),
    certificates: z.array(z.string()).optional(),
    idProofs: z.array(z.string()).optional(),
    bankDocuments: z.array(z.string()).optional(),
    others: z.array(z.string()).optional()
  }).optional()
});

export class UserService {
  /**
   * Create a new user with Firebase Auth and store profile in Firestore
   * Supports auto-generated passwords and password reset emails
   */
  async createUser(userData: any) {
    try {
      // First validate with createUserSchema for basic auth fields
      const validatedData = createUserSchema.parse(userData);

      // Then validate all employee fields if provided (allows partial data)
      // This ensures server-side validation of employee-specific fields
      const employeeFieldValidation = insertUserEnhancedSchema.partial().safeParse(userData);
      if (!employeeFieldValidation.success) {
        console.error('Employee field validation failed:', employeeFieldValidation.error);
        throw new Error(`Invalid employee data: ${employeeFieldValidation.error.message}`);
      }

      let userRecord;
      let passwordResetSent = false;

      // Only create Firebase Auth account if createLogin is true
      if (validatedData.createLogin) {
        // Auto-generate password if not provided
        const password = validatedData.password || generateSecurePassword();

        // Create user in Firebase Auth
        userRecord = await adminAuth.createUser({
          email: validatedData.email,
          password: password,
          displayName: validatedData.displayName,
          emailVerified: false
        });

        // Send password reset email so user can set their own password
        try {
          const resetLink = await adminAuth.generatePasswordResetLink(validatedData.email);

          // Send email using Resend
          await emailService.sendPasswordResetEmail(
            validatedData.email,
            resetLink,
            validatedData.displayName
          );

          passwordResetSent = true;
          console.log(`Password reset email sent to ${validatedData.email}`);
        } catch (emailError) {
          console.error('Error sending password reset email:', emailError);
          // Continue even if password reset fails
        }
      } else {
        // Create a deterministic UID for users without login based on email
        // This ensures the same email always gets the same UID
        const emailHash = crypto.createHash('sha256').update(validatedData.email).digest('hex').substring(0, 28);
        userRecord = { uid: `emp_${emailHash}` };
      }

      // Create user profile in Firestore with all employee data
      const userProfile = await storage.createUser({
        uid: userRecord.uid,
        email: validatedData.email,
        displayName: validatedData.displayName,
        role: validatedData.role,
        department: validatedData.department,
        // Include all additional employee fields from userData
        ...userData
      });

      // Log activity
      await storage.createActivityLog({
        type: 'customer_created',
        title: validatedData.createLogin ? 'New Employee Created with Login' : 'New Employee Profile Created',
        description: `Employee ${validatedData.displayName} (${validatedData.email}) created successfully${passwordResetSent ? ' - Password reset email sent' : ''}`,
        entityId: userRecord.uid,
        entityType: 'user',
        userId: userRecord.uid
      });

      return {
        success: true,
        user: userProfile,
        firebaseUser: userRecord,
        loginCreated: validatedData.createLogin,
        passwordResetSent: passwordResetSent,
        message: validatedData.createLogin
          ? `Employee created successfully. ${passwordResetSent ? 'Password reset email has been sent to ' + validatedData.email : 'Login credentials created.'}`
          : 'Employee profile created successfully.'
      };

    } catch (error: any) {
      console.error('Error creating user:', error);

      // If Firebase user was created but Firestore failed, clean up
      if (error.uid) {
        try {
          await adminAuth.deleteUser(error.uid);
        } catch (cleanupError) {
          console.error('Error cleaning up Firebase user:', cleanupError);
        }
      }

      return {
        success: false,
        error: error.message || 'Failed to create user',
        code: error.code
      };
    }
  }

  /**
   * Sync existing Firebase Auth user with Firestore
   */
  async syncUserProfile(uid: string, additionalData?: Partial<z.infer<typeof updateUserSchema>>) {
    try {
      // Get user from Firebase Auth
      const firebaseUser = await adminAuth.getUser(uid);

      // Check if user already exists in our storage
      let existingUser = await storage.getUser(uid);

      if (existingUser) {
        // Update existing user with fresh Firebase Auth data
        const updatedUser = await storage.updateUser(uid, {
          email: firebaseUser.email || existingUser.email,
          displayName: firebaseUser.displayName || existingUser.displayName,
          ...additionalData
        });
        return { success: true, user: updatedUser, action: 'updated' };
      } else {
        // Create new user profile from Firebase Auth data
        // Preserve the displayName from Firebase Auth or use the one from additionalData
        const displayName = additionalData?.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';

        const newUser = await storage.createUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: displayName,
          role: additionalData?.role || 'employee',
          department: additionalData?.department || null,
          isActive: true,
          employeeStatus: 'active'
        });
        return { success: true, user: newUser, action: 'created' };
      }
    } catch (error: any) {
      console.error('Error syncing user profile:', error);
      return {
        success: false,
        error: error.message || 'Failed to sync user profile'
      };
    }
  }

  /**
   * Update user profile with validation
   */
  async updateUserProfile(uid: string, updateData: z.infer<typeof updateUserSchema>) {
    try {
      // Validate update data
      const validatedData = updateUserSchema.parse(updateData);

      // Update in our storage
      const updatedUser = await storage.updateUser(uid, validatedData);

      // Update cache with new user data
      cacheService.updateUser(uid, updatedUser);

      // Update Firebase Auth if display name changed
      if (validatedData.displayName) {
        await adminAuth.updateUser(uid, {
          displayName: validatedData.displayName
        });
      }

      // Log activity
      await storage.createActivityLog({
        type: 'customer_updated',
        title: 'User Profile Updated',
        description: `User profile updated for ${updatedUser.displayName}`,
        entityId: uid,
        entityType: 'user',
        userId: uid
      });

      return { success: true, user: updatedUser };
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        error: error.message || 'Failed to update user profile'
      };
    }
  }

  /**
   * Get all users with proper data validation and caching
   */
  async getAllUsers() {
    try {
      console.log('[UserService] Getting all users');

      // Always fetch fresh data from Firestore to ensure we get new users
      const users = await storage.listUsers();
      console.log(`[UserService] Retrieved ${users.length} users from Firestore`);

      // Validate and cache each user
      const validatedUsers = users.map(user => {
        // Cache the user data
        cacheService.setUser(user.uid, user);

        return {
          id: user.uid,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || null,
          role: user.role,
          department: user.department,
          designation: user.designation || null,
          reportingManagerId: user.reportingManagerId || null, // ✅ FIX: Include reporting manager
          createdAt: user.createdAt,
          photoURL: user.photoURL || null
        };
      });

      return { success: true, users: validatedUsers };
    } catch (error: any) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch users',
        users: []
      };
    }
  }

  /**
   * Delete user from both Firebase Auth and Firestore
   */
  async deleteUser(uid: string) {
    try {
      // Delete from Firebase Auth
      await adminAuth.deleteUser(uid);

      // Note: In Firestore, we should keep the user record for audit purposes
      // but mark it as deleted instead of actually deleting it
      await storage.updateUser(uid, {
        // Add a deleted flag if you want to implement soft delete
      } as any);

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete user'
      };
    }
  }
}

export const userService = new UserService();