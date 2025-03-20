import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Camera, CheckCircle, QrCode, RefreshCw, FileInput } from "lucide-react";
import { Input } from "@/components/ui/input";
import jsQR from "jsqr";

interface QrCodeScannerProps {
  onScanSuccess: (code: string) => void;
}

export function QrCodeScanner({ onScanSuccess }: QrCodeScannerProps) {
  // States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "unknown">("unknown");
  const [videoStarted, setVideoStarted] = useState(false); // Track video playback status
  const [debugInfo, setDebugInfo] = useState<string>(""); // For debugging
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  
  // Cleanup function for camera resources
  const cleanupCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Ensure video element is fully reset
    }
    
    setIsCameraActive(false);
    setVideoStarted(false);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, []);
  
  // Handle scan when camera is active
  const scanQRCode = () => {
    if (!isCameraActive || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Only scan if video is playing and has dimensions
    if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0) {
      return;
    }
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data for QR code scanning
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
      // Attempt to decode QR code
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      // If found a QR code
      if (code) {
        console.log("Found QR code:", code.data);
        setScannedCode(code.data);
        cleanupCamera();
        onScanSuccess(code.data);
      }
    } catch (err) {
      console.error("Error scanning QR code:", err);
      // We don't set error here as scan failures are expected until a QR code is found
    }
  };
  
  // Start camera
  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo("");
      
      // Request camera permission
      try {
        setDebugInfo("Requesting camera...");
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment",  // Prefer back camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        
        setDebugInfo("Camera permission granted");
        streamRef.current = stream;
        
        if (videoRef.current) {
          // Set up video element event listeners
          videoRef.current.addEventListener('loadedmetadata', () => {
            setDebugInfo(prev => prev + "\nVideo metadata loaded");
          });
          
          videoRef.current.addEventListener('playing', () => {
            setDebugInfo(prev => prev + "\nVideo is playing");
            setVideoStarted(true);
          });
          
          videoRef.current.addEventListener('error', (e) => {
            setDebugInfo(prev => prev + `\nVideo error: ${(e.target as any)?.error?.message || 'unknown'}`);
          });
          
          setDebugInfo(prev => prev + "\nSetting video source");
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true; // Ensure video is muted
          videoRef.current.setAttribute('playsinline', 'true'); // For iOS
          
          try {
            setDebugInfo(prev => prev + "\nPlaying video");
            await videoRef.current.play();
            setCameraPermission("granted");
            setIsCameraActive(true);
            
            // Start scanning interval
            scanIntervalRef.current = window.setInterval(scanQRCode, 200); // Scan every 200ms
          } catch (playError) {
            setDebugInfo(prev => prev + `\nPlay error: ${playError instanceof Error ? playError.message : String(playError)}`);
            setError(`Video playback failed: ${playError instanceof Error ? playError.message : 'Autoplay may be blocked'}`);
          }
        }
      } catch (err) {
        console.error("Camera permission error:", err);
        setCameraPermission("denied");
        setError(`Camera access denied. ${err instanceof Error ? err.message : 'Please check your browser settings.'}`);
      }
      
    } catch (err) {
      console.error("Error setting up camera:", err);
      setError(`Failed to start camera: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    cleanupCamera();
  };
  
  // Reset scanner
  const resetScanner = () => {
    cleanupCamera();
    setScannedCode(null);
    setManualCode("");
    setError(null);
    setDebugInfo("");
  };
  
  // Handle manual code submission
  const handleManualSubmit = () => {
    if (!manualCode || manualCode.trim() === "") {
      setError("Please enter a QR code value");
      return;
    }
    
    setScannedCode(manualCode);
    onScanSuccess(manualCode);
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {scannedCode ? (
        <div className="p-4 border rounded-md bg-green-50 flex items-center space-x-4">
          <div className="bg-green-100 p-2 rounded-full">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-green-800">QR Code Scanned Successfully</h3>
            <p className="text-sm text-green-700">Code: <span className="font-mono">{scannedCode}</span></p>
          </div>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          {isCameraActive ? (
            <div className="aspect-video relative bg-black">
              {/* Video element for camera feed - using controls for debugging */}
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover"
                playsInline 
                muted 
                autoPlay
                controls={!videoStarted} // Show controls if video hasn't started
                style={{ objectFit: "cover" }}
              />
              
              {/* Hidden canvas for processing */}
              <canvas 
                ref={canvasRef} 
                className="hidden"
              />
              
              {/* Overlay with corner markers */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="border-2 border-primary/70 w-64 h-64 relative rounded-md">
                  {/* Scanning animation */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-scan"></div>
                  
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-primary rounded-tl-sm"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-primary rounded-tr-sm"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-primary rounded-bl-sm"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-primary rounded-br-sm"></div>
                </div>
              </div>
              
              {/* Text instructions */}
              <div className="absolute bottom-2 left-0 right-0 text-center text-white text-sm bg-black/50 py-1">
                {videoStarted ? 
                  "Point your camera at a QR code" : 
                  "Camera connecting... If you see the camera feed, click the video to start."
                }
              </div>
              
              {/* Debug Info - only in development */}
              {debugInfo && (
                <div className="absolute top-2 left-2 right-2 text-xs text-white bg-black/70 p-2 rounded max-h-24 overflow-auto">
                  {debugInfo.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              <div className="text-center mb-6">
                <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Scan QR Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use your camera to scan a QR code or enter it manually.
                </p>
              </div>
              
              <div className="space-y-6">
                {/* Camera Scanning Option */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Scan with Camera</h4>
                  <Button 
                    className="w-full" 
                    onClick={startCamera} 
                    disabled={isLoading || cameraPermission === "denied"}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {isLoading ? "Starting Camera..." : "Start Camera"}
                  </Button>
                  
                  {cameraPermission === "denied" && (
                    <p className="text-xs text-destructive mt-1">
                      Camera access was denied. Please check your browser settings and try again.
                    </p>
                  )}
                </div>
                
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">OR</span>
                  </div>
                </div>
                
                {/* Manual Entry */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Enter Code Manually</h4>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter QR code value" 
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleManualSubmit}>
                      <FileInput className="h-4 w-4 mr-2" />
                      Submit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="flex justify-center space-x-2">
        {isCameraActive ? (
          <Button onClick={stopCamera} variant="outline">
            Stop Camera
          </Button>
        ) : scannedCode ? (
          <Button onClick={resetScanner}>
            <QrCode className="h-4 w-4 mr-2" />
            Scan Another Code
          </Button>
        ) : null}
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes scan {
            0% {
              top: 0;
            }
            50% {
              top: 100%;
            }
            100% {
              top: 0;
            }
          }
          .animate-scan {
            animation: scan 2s linear infinite;
          }
        `
      }} />
    </div>
  );
}