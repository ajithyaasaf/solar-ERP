/**
 * Site Visit Checkout Modal - Clean Implementation
 * Handles site visit checkout with location verification and photo capture
 */

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getAuth } from 'firebase/auth';
import { 
  MapPin, 
  Camera, 
  CheckCircle, 
  User,
  AlertTriangle,
  RotateCcw,
  X,
  ArrowRight,
  Loader2
} from "lucide-react";
import { EnhancedLocationCapture } from "./enhanced-location-capture";
import { LocationData } from "@/lib/location-service";

interface SiteVisitCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteVisit: any;
}

export function SiteVisitCheckoutModal({ isOpen, onClose, siteVisit }: SiteVisitCheckoutModalProps) {
  // Location state
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationCaptured, setLocationCaptured] = useState(false);
  
  // Form state
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(1);
  
  // Photo states
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentCamera, setCurrentCamera] = useState<'front' | 'back'>('front');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset all states
      setStep(1);
      setCurrentLocation(null);
      setLocationCaptured(false);
      setSelfiePhoto(null);
      setNotes('');
      setIsCameraActive(false);
      setIsVideoReady(false);
      setCurrentCamera('front');
    } else {
      // Cleanup on close
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  }, [isOpen]);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleLocationCaptured = (location: LocationData) => {
    console.log('✅ CHECKOUT: Location captured:', location);
    setCurrentLocation(location);
    setLocationCaptured(true);
  };

  const handleLocationError = (error: string) => {
    console.error('❌ CHECKOUT: Location error:', error);
    toast({
      title: "Location Error",
      description: error,
      variant: "destructive",
    });
  };

  // Simple camera functions
  const startCamera = async () => {
    setIsCameraActive(true);
    setIsVideoReady(false);
    
    try {
      const constraints = {
        video: {
          facingMode: currentCamera === 'front' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsVideoReady(true);
        };
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera error:', error);
      setIsCameraActive(false);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isVideoReady) {
      toast({
        title: "Not Ready",
        description: "Camera is not ready. Please wait.",
        variant: "destructive",
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      toast({
        title: "Capture Failed",
        description: "Browser does not support photo capture.",
        variant: "destructive",
      });
      return;
    }

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0);
    
    // Convert to base64
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setSelfiePhoto(photoDataUrl);
    
    // Stop camera
    stopCamera();
    
    toast({
      title: "Photo Captured",
      description: "Selfie captured successfully!",
    });
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setIsVideoReady(false);
  };

  const switchCamera = () => {
    const newCamera = currentCamera === 'front' ? 'back' : 'front';
    setCurrentCamera(newCamera);
    if (isCameraActive) {
      stopCamera();
      setTimeout(startCamera, 300);
    }
  };

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      console.log("=== CHECKOUT MUTATION START ===");
      
      let selfiePhotoUrl = undefined;
      
      // Upload selfie photo if provided
      if (selfiePhoto) {
        try {
          console.log("Uploading checkout selfie photo...");
          const photoPrefix = siteVisit.isFollowUp ? 'followup' : 'sitevisit';
          const uploadResponse = await apiRequest('/api/attendance/upload-photo', 'POST', {
            imageData: selfiePhoto,
            userId: `${photoPrefix}_checkout_selfie_${Date.now()}`,
            attendanceType: `${photoPrefix}_checkout_selfie`
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload selfie photo');
          }

          const uploadResult = await uploadResponse.json();
          selfiePhotoUrl = uploadResult.url;
          console.log("✅ Selfie uploaded:", selfiePhotoUrl);
        } catch (error) {
          console.error('❌ Selfie upload failed:', error);
          throw error;
        }
      }

      // Create checkout payload
      const checkoutPayload = {
        status: 'completed',
        siteOutTime: new Date(),
        siteOutLocation: currentLocation,
        ...(selfiePhotoUrl && { siteOutPhotoUrl: selfiePhotoUrl }),
        notes: notes,
        updatedAt: new Date()
      };

      console.log("Checkout payload:", checkoutPayload);
      
      // Use different endpoints for regular site visits vs follow-ups
      const endpoint = siteVisit.isFollowUp 
        ? `/api/follow-ups/${siteVisit.id}/checkout`
        : `/api/site-visits/${siteVisit.id}`;
      
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error("User not authenticated");
      }
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(checkoutPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Checkout failed');
      }

      return response.json();
    },
    onSuccess: () => {
      console.log("✅ CHECKOUT SUCCESS");
      toast({
        title: "Checkout Complete",
        description: "Site visit checked out successfully!",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/site-visits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/follow-ups'] });
      
      onClose();
    },
    onError: (error: any) => {
      console.error("❌ CHECKOUT ERROR:", error);
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to checkout. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    if (!locationCaptured) {
      toast({
        title: "Location Required",
        description: "Please capture your checkout location first.",
        variant: "destructive",
      });
      return;
    }

    checkoutMutation.mutate();
  };

  const canProceedToStep2 = locationCaptured;
  const canSubmit = locationCaptured;

  if (!siteVisit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Complete Site Visit
          </DialogTitle>
          <DialogDescription>
            Complete your site visit by capturing checkout location and photo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step >= 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
                1
              </div>
              <span className="font-medium">Checkout Location</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step >= 2 ? 'bg-primary text-white' : 'bg-muted'}`}>
                2
              </div>
              <span className="font-medium">Photo & Notes</span>
            </div>
          </div>

          {/* Site Visit Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Site Visit Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purpose:</span>
                <Badge variant="outline">{siteVisit.visitPurpose}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{siteVisit.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started:</span>
                <span>{new Date(siteVisit.siteInTime).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 1: Location Capture */}
          {step === 1 && (
            <div className="space-y-4">
              <EnhancedLocationCapture
                onLocationCaptured={handleLocationCaptured}
                onLocationError={handleLocationError}
                title="Site Check-Out Location"
                description="We need to detect your current location for site check-out"
                autoDetect={true}
                required={true}
                showAddress={true}
              />

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                >
                  Next: Photo & Notes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Photo & Notes */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Selfie Photo Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Checkout Selfie (Required)
                    {selfiePhoto && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {!selfiePhoto && !isCameraActive && (
                      <div className="space-y-3">
                        <Button onClick={startCamera} variant="outline" className="w-full">
                          <Camera className="h-4 w-4 mr-2" />
                          Take Checkout Selfie
                        </Button>
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Take a selfie to verify your identity at checkout
                          </p>
                        </div>
                      </div>
                    )}

                    {isCameraActive && !selfiePhoto && (
                      <div className="space-y-3">
                        <div className="relative">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-64 object-cover rounded-lg bg-black"
                          />
                          {!isVideoReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                              <div className="text-white text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                <p className="text-sm">Loading camera...</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between">
                          <Button variant="outline" onClick={switchCamera} disabled={!isVideoReady}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Switch Camera
                          </Button>
                          
                          <div className="flex gap-2">
                            <Button variant="destructive" onClick={stopCamera}>
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                            <Button onClick={capturePhoto} disabled={!isVideoReady}>
                              <Camera className="h-4 w-4 mr-2" />
                              Capture
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selfiePhoto && (
                      <div className="space-y-3">
                        <div className="relative">
                          <img
                            src={selfiePhoto}
                            alt="Checkout selfie"
                            className="w-full h-64 object-cover rounded-lg"
                          />
                          <Badge className="absolute top-2 right-2 bg-green-600">
                            Selfie Captured
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setSelfiePhoto(null)}
                          className="w-full"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retake Selfie
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Completion Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any final notes about the site visit completion..."
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Submit Section */}
              <div className="space-y-4">
                {/* Validation Alert */}
                {!selfiePhoto && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Selfie photo required to complete checkout</span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back to Location
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={checkoutMutation.isPending || !canSubmit || !selfiePhoto}
                    className="flex items-center gap-2"
                  >
                    {checkoutMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Complete Site Visit
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
}

export default SiteVisitCheckoutModal;