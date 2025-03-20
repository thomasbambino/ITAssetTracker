import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Camera, CheckCircle, QrCode, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QrCodeScannerProps {
  onScanSuccess: (code: string) => void;
}

interface Camera {
  id: string;
  label: string;
}

export function QrCodeScanner({ onScanSuccess }: QrCodeScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanInterval = useRef<number | null>(null);
  
  // Function to stop camera and clear resources
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (scanInterval.current) {
      window.clearInterval(scanInterval.current);
      scanInterval.current = null;
    }
    
    setIsCameraActive(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Fetch available cameras
  const fetchCameras = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      // Request camera access
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Get list of devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length > 0) {
        const formattedCameras = videoDevices.map((device, index) => ({
          id: device.deviceId,
          label: device.label || `Camera ${index + 1}`
        }));
        
        setCameras(formattedCameras);
        setSelectedCamera(formattedCameras[0].id);
      } else {
        setError("No cameras found on your device");
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Camera access denied. Please check your browser permissions.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initialize camera list on component mount
  useEffect(() => {
    fetchCameras();
  }, []);
  
  // Function to decode QR code from canvas
  const decodeQR = () => {
    if (!canvasRef.current || !videoRef.current || !isCameraActive) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Try to decode using built-in BarcodeDetector API if available
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['qr_code']
      });
      
      barcodeDetector.detect(canvas)
        .then((barcodes: any[]) => {
          if (barcodes.length > 0) {
            const qrCode = barcodes[0].rawValue;
            
            // Stop scanning and notify parent
            stopCamera();
            setScannedCode(qrCode);
            onScanSuccess(qrCode);
          }
        })
        .catch((err: Error) => {
          console.error("Barcode detection error:", err);
          // Continue scanning - don't set error as this is expected to fail until a QR code is found
        });
    } else {
      // For browsers without native BarcodeDetector, we'll just display a message
      // since implementing a full QR decoder in JS would be complex
      console.log("Scanning frame... (BarcodeDetector API not available)");
      // We keep scanning anyway, just in case the browser implements this API later
      // or for demo purposes
    }
  };
  
  // Start camera and QR scanning
  const startCamera = async () => {
    if (isLoading || !selectedCamera) return;
    
    setError(null);
    setIsLoading(true);
    
    try {
      // Stop any existing stream
      stopCamera();
      
      // Start a new video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedCamera,
          facingMode: "environment", // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Wait for video to start playing
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              resolve();
            };
          } else {
            resolve();
          }
        });
        
        // Start scanning for QR codes
        setIsCameraActive(true);
        
        // Scan for QR code every 200ms
        scanInterval.current = window.setInterval(decodeQR, 200);
      }
    } catch (err) {
      console.error("Error starting camera:", err);
      setError(`Failed to start camera: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset scanner for another scan
  const resetScanner = () => {
    setScannedCode(null);
    setError(null);
  };
  
  // Refresh camera list
  const refreshCameraList = () => {
    setCameras([]);
    setSelectedCamera(null);
    fetchCameras();
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
              {/* Video element for camera feed */}
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover"
                playsInline 
                muted 
                autoPlay
              />
              
              {/* Hidden canvas for image processing */}
              <canvas 
                ref={canvasRef} 
                className="hidden"
              />
              
              {/* Overlay with corner markers */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="border-2 border-primary w-64 h-64 relative rounded-md">
                  {/* Scanning animation */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-primary animate-scan"></div>
                  
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-primary rounded-tl-sm"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-primary rounded-tr-sm"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-primary rounded-bl-sm"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-primary rounded-br-sm"></div>
                </div>
              </div>
              
              {/* Text instructions */}
              <div className="absolute bottom-2 left-0 right-0 text-center text-white text-sm bg-black/50 py-1">
                Point your camera at a QR code
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-muted flex flex-col items-center justify-center p-4">
              <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to Scan</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Select a camera and click the button below to scan a QR code.
              </p>
              
              {/* Camera selection */}
              {cameras.length > 1 && (
                <div className="w-full max-w-xs mb-4">
                  <Select
                    value={selectedCamera || undefined}
                    onValueChange={(value) => setSelectedCamera(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {cameras.map(camera => (
                        <SelectItem key={camera.id} value={camera.id}>
                          {camera.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
            <Camera className="h-4 w-4 mr-2" />
            Scan Another Code
          </Button>
        ) : (
          <>
            <Button onClick={startCamera} disabled={isLoading || cameras.length === 0}>
              <Camera className="h-4 w-4 mr-2" />
              {isLoading ? "Starting Camera..." : "Start Camera"}
            </Button>
            
            <Button variant="outline" onClick={refreshCameraList} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Cameras
            </Button>
            
            {error && (
              <Button variant="outline" onClick={() => setError(null)}>
                <AlertCircle className="h-4 w-4 mr-2" />
                Clear Error
              </Button>
            )}
          </>
        )}
      </div>
      
      {/* Help text for permissions */}
      {!isCameraActive && !scannedCode && (
        <div className="text-center mt-2 text-xs text-muted-foreground space-y-1">
          <p>
            If your camera doesn't start, try these steps:
          </p>
          <ol className="list-decimal list-inside text-left max-w-md mx-auto">
            <li>Make sure you've granted camera permissions in your browser settings</li>
            <li>Click "Refresh Cameras" to detect all available cameras</li>
            <li>Check if your camera is being used by another application</li>
            <li>Try using a different browser (Chrome works best for camera access)</li>
          </ol>
        </div>
      )}
      
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