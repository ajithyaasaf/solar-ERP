import { useState, useRef, useEffect } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, MapPin, Clock, CheckCircle, XCircle, 
  Loader2, Timer, Wifi, WifiOff, RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TimeDisplay } from "@/components/time/time-display";

interface SmartUnifiedCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentAttendance: any;
  departmentTiming?: any;
}

export function SmartUnifiedCheckout({ 
  isOpen, 
  onClose, 
  onSuccess, 
  currentAttendance, 
  departmentTiming
}: SmartUnifiedCheckoutProps) {
  const { user } = useAuthContext();
  const { toast } = useToast();

  // Form states
  const [reason, setReason] = useState("");
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

  // Calculate simple working hours for display
  const calculateWorkingHours = () => {
    if (!currentAttendance?.checkInTime) {
      return { totalWorked: 0 };
    }
    
    const checkInTime = new Date(currentAttendance.checkInTime);
    const currentTime = new Date();
    const totalWorkingMinutes = Math.floor((currentTime.getTime() - checkInTime.getTime()) / (1000 * 60));
    const totalWorked = totalWorkingMinutes / 60;
    
    return {
      totalWorked: Number(totalWorked.toFixed(1))
    };
  };

  const workingHours = calculateWorkingHours();

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

  // Simple checkout submission
  const handleCheckout = async () => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please capture your location before checking out.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simple checkout - just update attendance record with checkout time and location
      const checkoutResponse = await apiRequest(`/api/attendance/${currentAttendance.id}`, 'PATCH', {
        checkOutTime: new Date().toISOString(),
        checkOutLatitude: location.latitude,
        checkOutLongitude: location.longitude,
        checkOutAddress: locationAddress,
        checkOutImageUrl: capturedPhoto,
        reason: reason || "Regular checkout"
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        throw new Error(errorData.message || 'Failed to check out');
      }

      toast({
        title: "Successfully Checked Out",
        description: `Total working time: ${workingHours.totalWorked} hours`,
      });

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

  // Validate current attendance
  if (!currentAttendance || currentAttendance.checkOutTime) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Invalid Action</DialogTitle>
            <DialogDescription>
              Cannot check out: You are not currently checked in or have already checked out.
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Timer className="h-5 w-5" />
            Check Out from Work
          </DialogTitle>
          <DialogDescription>
            Complete your work session and record your location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Working Hours Summary */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Today's Work Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-xs text-muted-foreground">Check In Time</div>
                  <div className="font-semibold text-green-600">
                    <TimeDisplay time={currentAttendance.checkInTime} format12Hour={true} />
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-xs text-muted-foreground">Hours Worked</div>
                  <div className="font-semibold text-blue-600">
                    {workingHours.totalWorked}h
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Checkout Location
                {!isOnline && <WifiOff className="h-4 w-4 text-red-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingLocation ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting your location...
                </div>
              ) : locationError ? (
                <div className="space-y-2">
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      {locationError}
                    </AlertDescription>
                  </Alert>
                  <Button onClick={getCurrentLocation} variant="outline" size="sm" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : location ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Location captured</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {locationAddress || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
                    </p>
                  </div>
                </div>
              ) : (
                <Button onClick={getCurrentLocation} variant="outline" size="sm" className="w-full">
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Location
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Photo Section (Optional) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Checkout Photo (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!capturedPhoto && !isCameraActive && (
                <Button onClick={startCamera} variant="outline" size="sm" className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
              )}

              {/* Camera view */}
              {isCameraActive && !capturedPhoto && (
                <div className="space-y-2">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-48 object-cover"
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
                      alt="Checkout photo" 
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

          {/* Reason Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Checkout Notes (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any notes about your work session today..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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
            disabled={isSubmitting || !location}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Timer className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'Checking Out...' : 'Check Out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}