import { useState, useRef, useEffect } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, Camera, MapPin, Clock } from "lucide-react";
// Removed deprecated formatTime import - using TimeDisplay component instead
import { TimeDisplay } from "@/components/time/time-display";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckInModal({ open, onOpenChange }: CheckInModalProps) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const geolocation = useGeolocation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [checkMode, setCheckMode] = useState<"in" | "out">("in");
  const [location, setLocation] = useState<"office" | "field">("office");
  const [customer, setCustomer] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  // Fetch today's attendance for the current user
  const { data: todayAttendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['/api/attendance', user?.id, new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/attendance?userId=${user.id}&date=${today}`);
      
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch attendance record');
      }
      
      return res.json();
    },
    enabled: !!user?.id && open,
  });

  // Fetch customers for field visits
  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers');
      if (!res.ok) {
        throw new Error('Failed to fetch customers');
      }
      return res.json();
    },
    enabled: checkMode === 'in' && location === 'field',
  });

  // Check in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          latitude: geolocation.latitude?.toString(),
          longitude: geolocation.longitude?.toString(),
          location,
          customerId: location === 'field' ? customer : undefined,
          reason: location === 'field' ? reason : undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check in');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          if (typeof queryKey === 'string') {
            return queryKey.includes('/api/attendance') || queryKey.includes('/api/activity-logs');
          }
          return false;
        }
      });
      toast({
        title: "Check in successfully",
        variant: "default",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const response = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          latitude: geolocation.latitude?.toString(),
          longitude: geolocation.longitude?.toString(),
          photoUrl: photoDataUrl,
          reason: reason || undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check out');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          if (typeof queryKey === 'string') {
            return queryKey.includes('/api/attendance') || queryKey.includes('/api/activity-logs');
          }
          return false;
        }
      });
      
      // Check if overtime was recorded
      if (data.overtimeHours && data.overtimeHours > 0) {
        toast({
          title: "Overtime Recorded",
          description: `${data.overtimeHours.toFixed(2)} hours of overtime has been recorded.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Check-out Successful",
          description: "You have successfully checked out for today.",
          variant: "default",
        });
      }
      
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Check-out Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Determine check mode based on attendance status
  useEffect(() => {
    if (todayAttendance) {
      setCheckMode(todayAttendance.checkOutTime ? 'in' : 'out');
    } else {
      setCheckMode('in');
    }
  }, [todayAttendance]);

  // Start camera for photo capture
  const startCamera = async () => {
    try {
      // Check for camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }
      
      // Enhanced video constraints for better compatibility
      const constraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: 'user' // Front-facing camera
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Check if video tracks are available
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No video tracks found in stream');
      }
      
      setIsCameraActive(true);
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Clear any existing content and reset state
        video.srcObject = null;
        video.load();
        
        // Set essential video properties
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.controls = false;
        
        // Assign the stream
        video.srcObject = stream;
        
        // Force play
        setTimeout(async () => {
          try {
            await video.play();
          } catch (playError) {
            console.warn('Auto-play failed, but stream should still be visible:', playError);
          }
        }, 100);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      
      let errorMessage = "Unable to access camera. ";
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += "Please allow camera permissions and try again.";
        } else if (error.name === 'NotFoundError') {
          errorMessage += "No camera found on this device.";
        } else if (error.name === 'NotReadableError') {
          errorMessage += "Camera is being used by another application.";
        } else {
          errorMessage += error.message;
        }
      }
      
      toast({
        title: "Camera Access Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsCameraActive(false);
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
  };
  
  // Capture photo with location and timestamp data
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame on the canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // First draw the video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add a dark overlay at the bottom for text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
        
        // Add timestamp and location data with white text
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        
        // Current date and time
        const now = new Date();
        const timestamp = now.toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium', 
          timeStyle: 'medium' 
        });
        ctx.fillText(`Time: ${timestamp}`, 10, canvas.height - 50);
        
        // Location data if available
        if (geolocation.latitude && geolocation.longitude) {
          ctx.fillText(
            `Location: ${geolocation.latitude.toFixed(6)}, ${geolocation.longitude.toFixed(6)}`, 
            10, 
            canvas.height - 25
          );
          
          // Office proximity data
          if (geolocation.officeLocation) {
            const distanceText = geolocation.isWithinOffice 
              ? "Inside office perimeter" 
              : `${Math.round(geolocation.distanceFromOffice || 0)}m from ${geolocation.officeLocation.name}`;
            ctx.fillText(distanceText, 10, canvas.height - 5);
          }
        }
        
        // Convert canvas to data URL with better quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPhotoDataUrl(dataUrl);
        
        // Stop the camera stream
        stopCamera();
        
        toast({
          title: "Photo Captured",
          description: "Verification photo has been taken successfully.",
          variant: "default",
        });
      }
    }
  };
  
  // Retake photo
  const retakePhoto = () => {
    setPhotoDataUrl(null);
    startCamera();
  };

  // Handle form submission
  const handleSubmit = () => {
    if (checkMode === 'in') {
      // Validate check-in
      // Enforce 9:30 AM start time requirement - uses the isBeforeCheckInTime variable defined earlier
      if (isBeforeCheckInTime) {
        toast({
          title: "Early Check-in",
          description: "Office hours start at 9:30 AM. Please wait until the official start time.",
          variant: "destructive",
        });
        return;
      }
      
      if (location === 'field') {
        if (!customer) {
          toast({
            title: "Validation Error",
            description: "Please select a customer for field visit.",
            variant: "destructive",
          });
          return;
        }
        
        if (!reason) {
          toast({
            title: "Validation Error",
            description: "Please provide a reason for field visit.",
            variant: "destructive",
          });
          return;
        }
        
        // Require photo for field check-in
        if (!photoDataUrl) {
          toast({
            title: "Photo Required",
            description: "You must take a photo when checking in at a field location.",
            variant: "destructive",
          });
          return;
        }
      }
      
      checkInMutation.mutate();
    } else {
      // Validate check-out
      const isOutOfOffice = !geolocation.isWithinOffice;
      
      if (isOutOfOffice && !photoDataUrl) {
        toast({
          title: "Photo Required",
          description: "You must take a photo when checking out from outside the office.",
          variant: "destructive",
        });
        return;
      }
      
      checkOutMutation.mutate();
    }
  };

  // Reset state when modal is closed
  useEffect(() => {
    if (!open) {
      setLocation('office');
      setCustomer('');
      setReason('');
      setPhotoDataUrl(null);
      if (isCameraActive) {
        stopCamera();
      }
    }
  }, [open, isCameraActive]);

  // Get current time
  const currentTime = new Date();
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  // Time restrictions
  const minCheckInTime = new Date(currentTime);
  minCheckInTime.setHours(9, 30, 0, 0);
  
  // Check if current time is before min check-in time
  const isBeforeCheckInTime = currentTime < minCheckInTime;
  
  // Calculate checkout time based on department
  const isFieldStaff = user?.department === 'sales' || user?.department === 'technical';
  const minCheckOutTime = new Date(currentTime);
  minCheckOutTime.setHours(isFieldStaff ? 19 : 18, 30, 0, 0);
  
  // Check if current time is before min check-out time
  const isBeforeCheckOutTime = currentTime < minCheckOutTime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {checkMode === 'in' ? 'Check In' : 'Check Out'}
          </DialogTitle>
          <DialogDescription>
            {checkMode === 'in'
              ? "Record your attendance for today. Check-in is only available after 9:30 AM."
              : `Record your check-out time. ${isFieldStaff 
                ? "Field staff can leave after 7:30 PM." 
                : "Office staff can leave after 6:30 PM."}`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Location Info */}
          <div className="px-1">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">Location Status</span>
            </div>
            <p className={`text-sm ${geolocation.isWithinOffice ? 'text-green-600' : 'text-amber-600'}`}>
              {geolocation.isWithinOffice 
                ? "✓ You are at the office" 
                : "⚠ You are not at the office"
              }
            </p>
            {geolocation.officeLocation && (
              <p className="text-xs text-gray-500 mt-1">
                {geolocation.isWithinOffice 
                  ? `Currently at: ${geolocation.officeLocation.name}`
                  : `Nearest office: ${geolocation.officeLocation.name} (${Math.round(geolocation.distanceFromOffice || 0)}m away)`}
              </p>
            )}
          </div>
          
          {/* Time Info */}
          <div className="px-1">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">Current Time</span>
            </div>
            <p className="text-lg">{formattedTime}</p>
          </div>
          
          {/* Check In Form */}
          {checkMode === 'in' && (
            <>
              {isBeforeCheckInTime && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Check-in Time Restriction</AlertTitle>
                  <AlertDescription>
                    Check-in is only available after 9:30 AM.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Location Type</label>
                  <Select
                    value={location}
                    onValueChange={(value) => setLocation(value as "office" | "field")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="field">Field/Customer Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {location === 'field' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Customer</label>
                      <Select
                        value={customer}
                        onValueChange={setCustomer}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers?.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Reason for Field Visit</label>
                      <Textarea
                        placeholder="Enter the reason for field visit"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          
          {/* Check Out Form */}
          {checkMode === 'out' && (
            <>
              {isBeforeCheckOutTime && (
                <Alert className="mb-4 bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Early Check-out</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    You are checking out before your scheduled time 
                    ({isFieldStaff ? "7:30 PM" : "6:30 PM"}). 
                    Please provide a reason.
                  </AlertDescription>
                </Alert>
              )}
              
              {!geolocation.isWithinOffice && (
                <Alert className="mb-4 bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Remote Check-out</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    You are checking out from outside the office. 
                    A photo verification is required.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Reason {isBeforeCheckOutTime ? "(Required)" : "(Optional)"}
                  </label>
                  <Textarea
                    placeholder={isBeforeCheckOutTime 
                      ? "Enter reason for early departure" 
                      : "Enter any additional notes (optional)"
                    }
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                </div>
                
                {!geolocation.isWithinOffice && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Photo Verification</label>
                    
                    {isCameraActive ? (
                      <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden bg-black">
                          <video
                            ref={videoRef}
                            className="w-full h-48 object-cover"
                            autoPlay
                            playsInline
                          />
                        </div>
                        <div className="flex justify-between">
                          <Button variant="outline" onClick={stopCamera}>
                            Cancel
                          </Button>
                          <Button onClick={capturePhoto}>
                            <Camera className="mr-2 h-4 w-4" />
                            Take Photo
                          </Button>
                        </div>
                      </div>
                    ) : photoDataUrl ? (
                      <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden">
                          <img
                            src={photoDataUrl}
                            alt="Captured"
                            className="w-full h-48 object-cover"
                          />
                        </div>
                        <Button variant="outline" onClick={retakePhoto}>
                          Retake Photo
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={startCamera}>
                        <Camera className="mr-2 h-4 w-4" />
                        Open Camera
                      </Button>
                    )}
                    
                    {/* Hidden canvas for photo capturing */}
                    <canvas
                      ref={canvasRef}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              (checkMode === 'in' && (
                isBeforeCheckInTime ||
                checkInMutation.isPending ||
                (location === 'field' && (!customer || !reason))
              )) ||
              (checkMode === 'out' && (
                checkOutMutation.isPending ||
                (isBeforeCheckOutTime && !reason) ||
                (!geolocation.isWithinOffice && !photoDataUrl)
              ))
            }
          >
            {(checkInMutation.isPending || checkOutMutation.isPending) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              checkMode === 'in' ? "Check In" : "Check Out"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}