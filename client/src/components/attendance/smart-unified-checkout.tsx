import { useState, useRef, useEffect } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, MapPin, Clock, AlertTriangle, CheckCircle, XCircle, 
  Loader2, Timer, Zap, Wifi, WifiOff, RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TimeDisplay } from "@/components/time/time-display";

interface SmartUnifiedCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentAttendance: any;
  departmentTiming?: any;
  otStatus?: any;
}

export function SmartUnifiedCheckout({ 
  isOpen, 
  onClose, 
  onSuccess, 
  currentAttendance, 
  departmentTiming,
  otStatus
}: SmartUnifiedCheckoutProps) {
  const { user } = useAuthContext();
  const { toast } = useToast();

  // Form states
  const [reason, setReason] = useState("");
  const [otReason, setOtReason] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Location states
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Network status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Determine checkout mode based on current state
  const getCheckoutMode = () => {
    if (otStatus?.hasActiveOT) {
      return {
        mode: 'ot_only',
        title: 'End Overtime Session',
        description: 'End your current overtime session. Your regular attendance will remain open.',
        actionText: 'End OT Session',
        requiresPhoto: true,
        color: 'orange'
      };
    } else if (currentAttendance && !currentAttendance.checkOutTime) {
      return {
        mode: 'regular_checkout',
        title: 'Check Out from Work',
        description: 'Complete your work session. Overtime will be calculated automatically.',
        actionText: 'Check Out',
        requiresPhoto: false, // Will be determined by overtime calculation
        color: 'red'
      };
    } else {
      return {
        mode: 'invalid',
        title: 'Invalid State',
        description: 'Cannot determine checkout action.',
        actionText: 'Close',
        requiresPhoto: false,
        color: 'gray'
      };
    }
  };

  const checkoutMode = getCheckoutMode();

  // Calculate real-time working hours preview (fixed calculation)
  const calculateWorkingHoursPreview = () => {
    if (!currentAttendance?.checkInTime || !departmentTiming) {
      return { 
        totalWorked: 0, 
        regularHours: 0, 
        overtimeHours: 0, 
        isCurrentlyOvertime: false,
        earlyCheckout: false 
      };
    }
    
    const checkInTime = new Date(currentAttendance.checkInTime);
    const currentTime = new Date();
    
    // Parse department schedule
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const parseTime12Hour = (timeStr: string): Date => {
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) {
        const fallback = new Date(today);
        fallback.setHours(timeStr.includes('out') ? 18 : 9, 0, 0, 0);
        return fallback;
      }
      
      let [, hours, minutes, period] = timeMatch;
      let hour24 = parseInt(hours);
      if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
      if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
      
      const date = new Date(today);
      date.setHours(hour24, parseInt(minutes), 0, 0);
      return date;
    };
    
    const departCheckIn = parseTime12Hour(departmentTiming.checkInTime);
    const departCheckOut = parseTime12Hour(departmentTiming.checkOutTime);
    
    // Calculate total working time
    const totalWorkingMinutes = Math.floor((currentTime.getTime() - checkInTime.getTime()) / (1000 * 60));
    const totalWorked = totalWorkingMinutes / 60;
    
    // Calculate regular vs overtime hours (early arrival + late departure)
    let overtimeMinutes = 0;
    
    // Early arrival overtime
    if (checkInTime < departCheckIn) {
      overtimeMinutes += Math.floor((departCheckIn.getTime() - checkInTime.getTime()) / (1000 * 60));
    }
    
    // Late departure overtime (only if currently past dept checkout time)
    if (currentTime > departCheckOut) {
      overtimeMinutes += Math.floor((currentTime.getTime() - departCheckOut.getTime()) / (1000 * 60));
    }
    
    // Calculate regular working time (within department schedule)
    const workStart = new Date(Math.max(checkInTime.getTime(), departCheckIn.getTime()));
    const workEnd = new Date(Math.min(currentTime.getTime(), departCheckOut.getTime()));
    const regularMinutes = Math.max(0, Math.floor((workEnd.getTime() - workStart.getTime()) / (1000 * 60)));
    
    const regularHours = regularMinutes / 60;
    const overtimeHours = overtimeMinutes / 60;
    const isCurrentlyOvertime = overtimeMinutes > 0;
    
    // Check if early checkout (less than department working hours)
    const expectedWorkingHours = departmentTiming.workingHours || 8;
    const earlyCheckout = regularHours < expectedWorkingHours && !isCurrentlyOvertime;
    
    return {
      totalWorked: Number(totalWorked.toFixed(2)),
      regularHours: Number(regularHours.toFixed(2)),
      overtimeHours: Number(overtimeHours.toFixed(2)),
      isCurrentlyOvertime,
      earlyCheckout,
      overtimeMinutes
    };
  };

  const workingHours = calculateWorkingHoursPreview();

  // Determine if photo is required
  const requiresPhoto = () => {
    if (checkoutMode.mode === 'ot_only') return true;
    if (workingHours.isCurrentlyOvertime) return true;
    if (workingHours.earlyCheckout) return true;
    return false;
  };

  const needsPhoto = requiresPhoto();

  // Camera management
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      setIsCameraActive(false);
      toast({
        title: "Camera Access Failed",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(photoDataUrl);
        
        // Stop camera
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setIsCameraActive(false);
        setStream(null);
      }
    }
  };

  const resetPhoto = () => {
    setCapturedPhoto(null);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
    setStream(null);
  };

  // Location management
  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000
        });
      });
      
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      
      setLocation(coords);
      
      // Get address using Google Maps API
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${apiKey}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              setLocationAddress(data.results[0].formatted_address);
            }
          }
        }
      } catch (error) {
        console.error('Address fetch failed:', error);
      }
      
      if (!locationAddress) {
        setLocationAddress(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
      }
      
    } catch (error) {
      console.error('Location access failed:', error);
      setLocationError("Unable to get location. Please enable GPS and try again.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Handle unified checkout submission
  const handleCheckout = async () => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please capture your location before checking out.",
        variant: "destructive",
      });
      return;
    }

    if (needsPhoto && !capturedPhoto) {
      toast({
        title: "Photo Required",
        description: "Please take a selfie photo for verification.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (checkoutMode.mode === 'ot_only') {
        // End OT session only
        const otResponse = await apiRequest('/api/attendance/ot-end', 'POST', {
          userId: user?.uid,
          latitude: location.latitude,
          longitude: location.longitude,
          address: locationAddress,
          photo: capturedPhoto,
          reason: otReason || reason
        });

        if (!otResponse.ok) {
          const errorData = await otResponse.json();
          throw new Error(errorData.message || 'Failed to end overtime session');
        }

        toast({
          title: "Overtime Session Ended",
          description: "Your overtime session has been successfully ended.",
        });
      } else {
        // Regular checkout
        const checkoutResponse = await apiRequest(`/api/attendance/${currentAttendance.id}`, 'PATCH', {
          checkOutTime: new Date().toISOString(),
          checkOutLatitude: location.latitude,
          checkOutLongitude: location.longitude,
          checkOutAddress: locationAddress,
          checkOutImageUrl: capturedPhoto,
          reason: reason,
          overtimeReason: workingHours.isCurrentlyOvertime ? (otReason || reason) : undefined
        });

        if (!checkoutResponse.ok) {
          const errorData = await checkoutResponse.json();
          throw new Error(errorData.message || 'Failed to check out');
        }

        toast({
          title: "Successfully Checked Out",
          description: `Total working time: ${workingHours.totalWorked.toFixed(1)} hours`,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Checkout failed:', error);
      toast({
        title: "Checkout Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup effects
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (!isOpen && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  }, [isOpen, stream]);

  // Auto-get location when modal opens
  useEffect(() => {
    if (isOpen && !location) {
      getCurrentLocation();
    }
  }, [isOpen]);

  if (checkoutMode.mode === 'invalid') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Invalid Action</DialogTitle>
            <DialogDescription>
              Cannot determine the appropriate checkout action. Please refresh the page and try again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose} variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 text-${checkoutMode.color}-600`}>
            {checkoutMode.mode === 'ot_only' ? (
              <Zap className="h-5 w-5" />
            ) : (
              <Timer className="h-5 w-5" />
            )}
            {checkoutMode.title}
          </DialogTitle>
          <DialogDescription>
            {checkoutMode.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Working Hours Preview */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Working Hours Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-xs text-muted-foreground">Regular Hours</div>
                  <div className="font-semibold text-green-600">
                    {workingHours.regularHours.toFixed(1)}h
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-xs text-muted-foreground">Overtime Hours</div>
                  <div className={`font-semibold ${workingHours.isCurrentlyOvertime ? 'text-orange-600' : 'text-gray-400'}`}>
                    {workingHours.overtimeHours.toFixed(1)}h
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-xs text-muted-foreground">Total Time</div>
                  <div className="font-semibold text-blue-600">
                    {workingHours.totalWorked.toFixed(1)}h
                  </div>
                </div>
              </div>

              {/* Status indicators */}
              {workingHours.isCurrentlyOvertime && (
                <Alert className="mt-3 border-orange-200 bg-orange-50">
                  <Zap className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700">
                    Currently in overtime: {workingHours.overtimeMinutes} minutes beyond department schedule
                  </AlertDescription>
                </Alert>
              )}

              {workingHours.earlyCheckout && (
                <Alert className="mt-3 border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700">
                    Early checkout detected: Less than {departmentTiming?.workingHours || 8} hours worked
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Location Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!location ? (
                <Button 
                  onClick={getCurrentLocation} 
                  disabled={isLoadingLocation}
                  variant="outline" 
                  className="w-full"
                >
                  {isLoadingLocation ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4 mr-2" />
                  )}
                  {isLoadingLocation ? 'Getting Location...' : 'Get Current Location'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Location captured</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {locationAddress || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
                  </div>
                </div>
              )}
              
              {locationError && (
                <Alert className="mt-2 border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">{locationError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Photo Section (only if required) */}
          {needsPhoto && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Photo Verification
                  <Badge variant="secondary" className="text-xs">Required</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!capturedPhoto && !isCameraActive && (
                  <Button onClick={startCamera} variant="outline" className="w-full">
                    <Camera className="h-4 w-4 mr-2" />
                    Take Selfie
                  </Button>
                )}

                {/* Camera view */}
                {isCameraActive && (
                  <div className="space-y-2">
                    <div className="relative bg-black rounded border overflow-hidden">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline
                        muted
                        className="w-full h-64 object-cover"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        LIVE
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={capturePhoto} className="flex-1">
                        <Camera className="h-4 w-4 mr-2" />
                        Capture
                      </Button>
                      <Button onClick={resetPhoto} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Captured photo */}
                {capturedPhoto && (
                  <div className="space-y-2">
                    <div className="relative">
                      <img 
                        src={capturedPhoto} 
                        alt="Captured selfie" 
                        className="w-full h-32 object-cover rounded border"
                      />
                      <div className="absolute top-2 right-2">
                        <Button onClick={resetPhoto} size="sm" variant="outline">
                          Retake
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Photo captured</span>
                    </div>
                  </div>
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </CardContent>
            </Card>
          )}

          {/* Reason Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Reason {(workingHours.isCurrentlyOvertime || workingHours.earlyCheckout) && "(Required)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={
                  checkoutMode.mode === 'ot_only' 
                    ? "Reason for ending overtime session..."
                    : workingHours.isCurrentlyOvertime 
                      ? "Reason for overtime work..."
                      : workingHours.earlyCheckout
                        ? "Reason for early checkout..."
                        : "Optional reason for checkout..."
                }
                value={checkoutMode.mode === 'ot_only' ? otReason : reason}
                onChange={(e) => checkoutMode.mode === 'ot_only' ? setOtReason(e.target.value) : setReason(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button onClick={onClose} variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleCheckout} 
            disabled={
              isSubmitting || 
              !location || 
              (needsPhoto && !capturedPhoto) ||
              ((workingHours.isCurrentlyOvertime || workingHours.earlyCheckout) && 
               !(checkoutMode.mode === 'ot_only' ? otReason : reason))
            }
            className={`bg-${checkoutMode.color}-600 hover:bg-${checkoutMode.color}-700`}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : checkoutMode.mode === 'ot_only' ? (
              <Zap className="h-4 w-4 mr-2" />
            ) : (
              <Timer className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'Processing...' : checkoutMode.actionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}