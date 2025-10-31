import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting
export function formatDate(date: Date | string | any): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return "";
  
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format time from Date object to 12-hour format (REMOVED)
 * @deprecated This function has been removed. Use TimeDisplay component with format12Hour={true} instead
 */
// REMOVED: formatTime function - use TimeDisplay component instead

// Enhanced time formatting for 12-hour consistency
export function formatTime12Hour(time: string | Date): string {
  if (!time) return "";
  
  const date = typeof time === 'string' ? new Date(time) : time;
  
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Currency formatting for Indian Rupees
export function formatCurrency(amount: number): string {
  // Amount is already in rupees (not paise)
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Get initials from name
export function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Check if a time is between two times
export function isTimeBetween(time: Date, start: string, end: string): boolean {
  const [startHours, startMinutes] = start.split(":").map(Number);
  const [endHours, endMinutes] = end.split(":").map(Number);
  
  const startTime = new Date(time);
  startTime.setHours(startHours, startMinutes, 0);
  
  const endTime = new Date(time);
  endTime.setHours(endHours, endMinutes, 0);
  
  return time >= startTime && time <= endTime;
}

// Calculate distance between two coordinates in meters
export function getDistanceBetweenCoordinates(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return d; // Distance in meters
}

// Generate a random ID
export function generateId(prefix: string = ""): string {
  return `${prefix}${Math.random().toString(36).substring(2, 9)}`;
}

// Check if user is within office geo-fence
export function isWithinGeoFence(
  userLat: number,
  userLng: number,
  officeLat: number,
  officeLng: number,
  radiusInMeters: number
): boolean {
  const distance = getDistanceBetweenCoordinates(
    userLat,
    userLng,
    officeLat,
    officeLng
  );
  return distance <= radiusInMeters;
}

// Convert a file to a data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Format time string to 12-hour format (REMOVED)
 * @deprecated This function has been removed. Use TimeDisplay component with format12Hour={true} instead
 */
// REMOVED: formatTimeString function - use TimeDisplay component instead
