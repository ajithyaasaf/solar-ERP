/**
 * Follow-Up Details Modal Component
 * Displays follow-up visit details separately from original site visits
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MapPin, Clock, User, Phone, Building, 
  RefreshCw, FileText, AlertCircle, CheckCircle,
  Camera, Eye, ExternalLink, Zap, Calendar, Settings
} from "lucide-react";
import { format } from "date-fns";

interface FollowUpDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUpId: string;
  onCheckout?: (followUpId: string) => void;
}

export function FollowUpDetailsModal({ 
  isOpen, 
  onClose, 
  followUpId,
  onCheckout 
}: FollowUpDetailsModalProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data: followUpData, isLoading } = useQuery({
    queryKey: [`/api/follow-ups/${followUpId}`],
    enabled: isOpen && !!followUpId
  });

  const followUp = (followUpData as any)?.data;
  
  console.log("FOLLOW_UP_MODAL_DEBUG:", {
    followUpId,
    followUpData,
    followUp,
    department: followUp?.department,
    status: followUp?.status,
    hasCheckInPhoto: !!followUp?.siteInPhotoUrl,
    hasCheckOutPhoto: !!followUp?.siteOutPhotoUrl,
    sitePhotosCount: followUp?.sitePhotos?.length || 0,
    sitePhotosType: Array.isArray(followUp?.sitePhotos) ? (typeof followUp?.sitePhotos[0]) : 'not array'
  });

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) {
      return {
        date: 'Not available',
        time: 'Not available'
      };
    }
    
    const date = new Date(timeString);
    if (isNaN(date.getTime())) {
      return {
        date: 'Invalid date',
        time: 'Invalid time'
      };
    }
    
    return {
      date: format(date, 'MMM dd, yyyy'),
      time: format(date, 'h:mm a')
    };
  };

  const followUpReasons = {
    'additional_work_required': 'Additional Work Required',
    'issue_resolution': 'Issue Resolution',
    'status_check': 'Status Check', 
    'customer_request': 'Customer Request',
    'maintenance': 'Maintenance',
    'other': 'Other'
  };

  const statusColors = {
    'in_progress': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
  };

  const departmentColors = {
    'technical': 'bg-orange-100 text-orange-800',
    'marketing': 'bg-green-100 text-green-800', 
    'admin': 'bg-blue-100 text-blue-800'
  };

  const handleCheckout = () => {
    if (onCheckout && followUp?.id) {
      setIsCheckingOut(true);
      onCheckout(followUp.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto p-2 sm:p-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!followUp) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto p-2 sm:p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold">Follow-up Not Found</h3>
            <p className="text-muted-foreground text-sm">The follow-up visit could not be found.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const siteInTime = formatTime(followUp.siteInTime);
  const siteOutTime = followUp.siteOutTime ? formatTime(followUp.siteOutTime) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto p-2 sm:p-6">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="flex items-center gap-2 justify-center sm:justify-start text-lg sm:text-xl">
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
            Follow-up Visit Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 sm:space-y-3">
          {/* Status and Department */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Badge className={departmentColors[followUp.department as keyof typeof departmentColors] || "bg-gray-100 text-gray-800"}>
              {followUp.department ? followUp.department.charAt(0).toUpperCase() + followUp.department.slice(1) : 'Unknown'}
            </Badge>
            <Badge className={statusColors[followUp.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
              {followUp.status ? followUp.status.replace('_', ' ') : 'Unknown'}
            </Badge>
          </div>

          {/* Customer Information */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
              <User className="h-4 w-4" />
              Customer Information
            </h3>
            {followUp.customer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{followUp.customer.name || 'Not available'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {followUp.customer.mobile || 'Not available'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-1 flex-shrink-0" />
                    {followUp.customer.address || 'Not available'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Property Type</p>
                  <p className="font-medium flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {followUp.customer.propertyType || 'Not specified'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Customer information not available</p>
            )}
          </div>



          {/* Visit Timeline */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Visit Timeline
            </h3>
            <div className="space-y-4">
              {/* Check-in */}
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Checked In</p>
                  <p className="text-sm text-muted-foreground">
                    {siteInTime.date} at {siteInTime.time}
                  </p>
                  {followUp.siteInLocation?.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {followUp.siteInLocation.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Check-out */}
              {siteOutTime ? (
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Checked Out</p>
                    <p className="text-sm text-muted-foreground">
                      {siteOutTime.date} at {siteOutTime.time}
                    </p>
                    {followUp.siteOutLocation?.address && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {followUp.siteOutLocation.address}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-100 p-2 rounded-full">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">In Progress</p>
                    <p className="text-sm text-muted-foreground">Visit is currently ongoing</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Department-Specific Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {followUp.department === 'technical' && <Zap className="h-5 w-5" />}
                {followUp.department === 'marketing' && <Building className="h-5 w-5" />}
                {followUp.department === 'admin' && <FileText className="h-5 w-5" />}
                {followUp.department ? (followUp.department.charAt(0).toUpperCase() + followUp.department.slice(1)) : 'Department'} Follow-up
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <Badge variant="outline" className="capitalize">
                    {followUp.department || 'Unknown'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Visit Type</p>
                  <Badge variant="secondary">
                    Follow-up Visit
                  </Badge>
                </div>
              </div>

              {/* Department-Specific Context */}
              {followUp.department === 'technical' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium">Technical Follow-up</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    This follow-up visit focuses on technical work completion, issue resolution, 
                    or equipment maintenance and installation verification.
                  </p>
                </div>
              )}

              {followUp.department === 'marketing' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <Building className="h-4 w-4" />
                    <span className="font-medium">Marketing Follow-up</span>
                  </div>
                  <p className="text-sm text-green-600">
                    This follow-up visit addresses customer requirements updates, project discussions, 
                    or additional marketing support and consultations.
                  </p>
                </div>
              )}

              {followUp.department === 'admin' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-700 mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Administrative Follow-up</span>
                  </div>
                  <p className="text-sm text-purple-600">
                    This follow-up visit handles documentation, paperwork completion, 
                    regulatory processes, or administrative support requirements.
                  </p>
                </div>
              )}

              {/* Enhanced Follow-up Reason Display */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Follow-up Reason</p>
                <div className="flex items-center gap-2">
                  {followUp.followUpReason === 'maintenance' && <Settings className="h-4 w-4 text-orange-600" />}
                  {followUp.followUpReason === 'additional_work_required' && <RefreshCw className="h-4 w-4 text-blue-600" />}
                  {followUp.followUpReason === 'issue_resolution' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  {followUp.followUpReason === 'status_check' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {followUp.followUpReason === 'customer_request' && <User className="h-4 w-4 text-purple-600" />}
                  <Badge variant="outline" className="capitalize">
                    {followUp.followUpReason ? (followUpReasons[followUp.followUpReason as keyof typeof followUpReasons] || followUp.followUpReason.replace('_', ' ')) : 'Not specified'}
                  </Badge>
                </div>
              </div>

              {/* Work Details */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Work Description</p>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <p className="text-sm">
                    {followUp.description || 'No detailed description provided for this follow-up visit.'}
                  </p>
                </div>
              </div>

              {followUp.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Additional Notes</p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">{followUp.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Site Photos - Check-in, Check-out, and Additional Photos */}
          {(followUp.siteInPhotoUrl || followUp.siteOutPhotoUrl || (followUp.sitePhotos && followUp.sitePhotos.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Follow-up Photos ({(followUp.siteInPhotoUrl ? 1 : 0) + (followUp.siteOutPhotoUrl ? 1 : 0) + (followUp.sitePhotos?.length || 0)})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Check-in Photo */}
                {followUp.siteInPhotoUrl && (
                  <div>
                    <h4 className="font-medium text-sm text-green-700 mb-2 flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Check-in Photo
                    </h4>
                    <div className="relative group">
                      <img
                        src={followUp.siteInPhotoUrl}
                        alt="Follow-up check-in photo"
                        className="w-full max-w-md h-48 object-cover rounded-lg border transition-transform hover:scale-105 cursor-pointer"
                        onClick={() => window.open(followUp.siteInPhotoUrl, '_blank')}
                      />
                      <Badge className="absolute top-2 right-2 text-xs bg-green-600 text-white">
                        Check-in
                      </Badge>
                      
                      {/* Eye icon overlay for viewing */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                        <Eye className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Check-out Photo */}
                {followUp.siteOutPhotoUrl && (
                  <div>
                    <h4 className="font-medium text-sm text-red-700 mb-2 flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Check-out Photo
                    </h4>
                    <div className="relative group">
                      <img
                        src={followUp.siteOutPhotoUrl}
                        alt="Follow-up check-out photo"
                        className="w-full max-w-md h-48 object-cover rounded-lg border transition-transform hover:scale-105 cursor-pointer"
                        onClick={() => window.open(followUp.siteOutPhotoUrl, '_blank')}
                      />
                      <Badge className="absolute top-2 right-2 text-xs bg-red-600 text-white">
                        Check-out
                      </Badge>
                      
                      {/* Eye icon overlay for viewing */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                        <Eye className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Site Photos Gallery - Enhanced for Multiple Photos */}
                {followUp.sitePhotos && followUp.sitePhotos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-blue-700 flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Site Photos ({followUp.sitePhotos.length}/20)
                      </h4>
                      {followUp.sitePhotos.length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          {followUp.sitePhotos.length > 12 ? 'Comprehensive Documentation' : 'Good Coverage'}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Enhanced Grid Layout for Multiple Photos */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {followUp.sitePhotos.map((photo: any, index: number) => {
                        // Handle both string URLs and photo objects
                        const photoUrl = typeof photo === 'string' ? photo : photo.url;
                        const photoDescription = typeof photo === 'object' ? photo.description : null;
                        const photoTimestamp = typeof photo === 'object' ? photo.timestamp : null;
                        
                        return (
                          <div key={index} className="space-y-2">
                            <div className="relative group">
                              <img
                                src={photoUrl}
                                alt={`Follow-up site photo ${index + 1}`}
                                className="w-full h-32 sm:h-36 object-cover rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-transparent hover:border-blue-300"
                                onClick={() => window.open(photoUrl, '_blank')}
                              />
                              <Badge className="absolute top-1 right-1 text-xs bg-blue-600/90 text-white px-1.5 py-0.5">
                                {index + 1}
                              </Badge>
                              
                              {/* Eye icon overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            
                            {/* Description (only for first few photos to avoid clutter) */}
                            {photoDescription && index < 3 && (
                              <p className="text-xs text-muted-foreground bg-gray-50 p-1.5 rounded truncate" title={photoDescription}>
                                {photoDescription}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Photo Summary Info */}
                    {followUp.sitePhotos.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-blue-700 font-medium">
                              📸 {followUp.sitePhotos.length} Photos Captured
                            </span>
                            {followUp.sitePhotos[0] && typeof followUp.sitePhotos[0] === 'object' && followUp.sitePhotos[0].timestamp && (
                              <span className="text-blue-600 text-xs">
                                First: {format(new Date(followUp.sitePhotos[0].timestamp), 'HH:mm')}
                              </span>
                            )}
                            {followUp.sitePhotos.length > 1 && followUp.sitePhotos[followUp.sitePhotos.length - 1] && 
                             typeof followUp.sitePhotos[followUp.sitePhotos.length - 1] === 'object' && 
                             followUp.sitePhotos[followUp.sitePhotos.length - 1].timestamp && (
                              <span className="text-blue-600 text-xs">
                                Last: {format(new Date(followUp.sitePhotos[followUp.sitePhotos.length - 1].timestamp), 'HH:mm')}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-blue-700 border-blue-300 hover:bg-blue-100"
                            onClick={() => {
                              // Open all photos in separate tabs (limited to first 10 to avoid overwhelming)
                              const photosToOpen = followUp.sitePhotos.slice(0, 10);
                              photosToOpen.forEach((photo: any) => {
                                const photoUrl = typeof photo === 'string' ? photo : photo.url;
                                window.open(photoUrl, '_blank');
                              });
                              if (followUp.sitePhotos.length > 10) {
                                alert(`Opened first 10 photos. ${followUp.sitePhotos.length - 10} more available - click individual photos to view.`);
                              }
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View All
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Site Out Photos Gallery - Checkout Site Photos */}
                {followUp.siteOutPhotos && followUp.siteOutPhotos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-red-700 flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Checkout Site Photos ({followUp.siteOutPhotos.length}/10)
                      </h4>
                      <Badge variant="outline" className="text-xs text-red-700 border-red-300">
                        Check-out Documentation
                      </Badge>
                    </div>
                    
                    {/* Grid Layout for Checkout Site Photos */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {followUp.siteOutPhotos.map((photo: any, index: number) => {
                        // Debug logging (enhanced)
                        if (index === 0) {
                          const keys = Object.keys(photo);
                          const isCharObject = keys.length > 0 && keys.every(key => !isNaN(Number(key))) && typeof photo[0] === 'string';
                          console.log("First checkout photo structure:", { 
                            type: typeof photo, 
                            isCharObject, 
                            keyCount: keys.length,
                            firstFewKeys: keys.slice(0, 5),
                            firstFewValues: keys.slice(0, 5).map(k => photo[k])
                          });
                        }
                        
                        // Handle ALL possible photo data formats - comprehensive reconstruction
                        let photoUrl = null;
                        let photoDescription = null;
                        let photoTimestamp = null;
                        
                        console.log(`Processing photo ${index + 1}:`, { type: typeof photo, photo });
                        
                        if (typeof photo === 'string') {
                          // Simple string URL
                          photoUrl = photo;
                          console.log(`Photo ${index + 1} is string:`, photoUrl);
                        } else if (typeof photo === 'object' && photo !== null) {
                          const keys = Object.keys(photo);
                          
                          // Method 1: Check if it's a character-split object (corrupted string)
                          const allKeysNumeric = keys.every(key => !isNaN(Number(key)));
                          const hasCharacterData = typeof photo[0] === 'string' && photo[0].length === 1;
                          
                          if (allKeysNumeric && hasCharacterData) {
                            // Reconstruct URL from character object
                            try {
                              const sortedKeys = keys.map(k => parseInt(k)).sort((a, b) => a - b);
                              const chars = sortedKeys.map(i => photo[i.toString()]);
                              photoUrl = chars.join('');
                              console.log(`Photo ${index + 1} reconstructed from characters:`, photoUrl);
                            } catch (error) {
                              console.error(`Failed to reconstruct photo ${index + 1}:`, error);
                            }
                          } else {
                            // Method 2: Normal photo object with properties
                            photoUrl = photo.url || photo.photoUrl || photo.src || photo.imageUrl;
                            photoDescription = photo.description || photo.caption || photo.note;
                            photoTimestamp = photo.timestamp || photo.createdAt || photo.date;
                            console.log(`Photo ${index + 1} is object with URL:`, photoUrl);
                          }
                          
                          // Method 3: Fallback - try to find any URL-like string in the object
                          if (!photoUrl) {
                            for (const [key, value] of Object.entries(photo)) {
                              if (typeof value === 'string' && (value.startsWith('http') || value.includes('cloudinary'))) {
                                photoUrl = value;
                                console.log(`Photo ${index + 1} found URL in property ${key}:`, photoUrl);
                                break;
                              }
                            }
                          }
                        }
                        
                        // Skip if no valid URL found
                        if (!photoUrl) {
                          console.warn("No valid photo URL found for checkout photo:", photo);
                          return null;
                        }
                        
                        return (
                          <div key={index} className="space-y-2">
                            <div className="relative group">
                              <img
                                src={photoUrl}
                                alt={`Checkout site photo ${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg border transition-transform hover:scale-105 cursor-pointer"
                                onClick={() => window.open(photoUrl, '_blank')}
                              />
                              <Badge className="absolute top-1 right-1 text-xs bg-red-600 text-white">
                                {index + 1}
                              </Badge>
                              
                              {/* Eye icon overlay for viewing */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            
                            {/* Photo metadata */}
                            {(photoDescription || photoTimestamp) && (
                              <div className="px-1">
                                {photoDescription && (
                                  <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                                    {photoDescription}
                                  </p>
                                )}
                                {photoTimestamp && (
                                  <span className="text-red-600 text-xs">
                                    {format(new Date(photoTimestamp), 'HH:mm')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* View All Button for Checkout Photos */}
                    {followUp.siteOutPhotos.length > 5 && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-red-700">
                            <span className="font-medium">{followUp.siteOutPhotos.length} checkout photos captured</span>
                            {typeof followUp.siteOutPhotos[0] === 'object' && 
                             followUp.siteOutPhotos[0].timestamp && 
                             followUp.siteOutPhotos[followUp.siteOutPhotos.length - 1].timestamp && (
                              <span className="text-red-600 text-xs">
                                Last: {format(new Date(followUp.siteOutPhotos[followUp.siteOutPhotos.length - 1].timestamp), 'HH:mm')}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-red-700 border-red-300 hover:bg-red-100"
                            onClick={() => {
                              // Open all checkout photos in separate tabs (limited to first 10)
                              const photosToOpen = followUp.siteOutPhotos.slice(0, 10);
                              photosToOpen.forEach((photo: any) => {
                                const photoUrl = typeof photo === 'string' ? photo : photo.url;
                                window.open(photoUrl, '_blank');
                              });
                              if (followUp.siteOutPhotos.length > 10) {
                                alert(`Opened first 10 checkout photos. ${followUp.siteOutPhotos.length - 10} more available - click individual photos to view.`);
                              }
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View All Checkout Photos
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto order-2 sm:order-1 h-10 sm:h-9 text-sm sm:text-base"
            >
              Close
            </Button>
            {followUp.status === 'in_progress' && onCheckout && (
              <Button 
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full sm:w-auto order-1 sm:order-2 h-10 sm:h-9 text-sm sm:text-base"
              >
                {isCheckingOut ? 'Processing...' : 'Checkout'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}