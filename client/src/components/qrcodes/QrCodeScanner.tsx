import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Camera, CheckCircle, QrCode, RefreshCw, Settings } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
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
  const [scanAttempts, setScanAttempts] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Function to fetch available cameras
  const fetchCameras = async () => {
    setError(null);
    try {
      // Request camera permission first
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        console.log("Camera permission granted");
      } catch (error) {
        console.error("Camera permission denied:", error);
        setError("Camera permission denied. Please enable camera access in your browser settings.");
        return;
      }
      
      // Now get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const formattedCameras = devices.map(device => ({
          id: device.id,
          label: device.label || `Camera ${devices.indexOf(device) + 1}`
        }));
        setCameras(formattedCameras);
        setSelectedCamera(formattedCameras[0].id);
        console.log("Cameras detected:", formattedCameras);
      } else {
        console.error("No cameras found");
        setError("No cameras detected on your device. QR scanning requires a camera.");
      }
    } catch (err) {
      console.error("Error getting cameras:", err);
      setError("Failed to access camera list. Please try again or use a different device.");
    }
  };

  // Manual refresh camera list
  const refreshCameraList = async () => {
    setCameras([]);
    setSelectedCamera(null);
    await fetchCameras();
  };

  // Initialize cameras and clean up the scanner on unmount
  useEffect(() => {
    fetchCameras();

    // Clean up on unmount
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch (err) {
          console.error("Error stopping scanner:", err);
        }
      }
    };
  }, []);

  // Wait for the DOM to be ready to ensure the container is available
  useEffect(() => {
    // Add a class to the body when the scanner is active to prevent scrolling
    if (isCameraActive) {
      document.body.classList.add('qr-scanner-active');
    } else {
      document.body.classList.remove('qr-scanner-active');
    }
    
    return () => {
      document.body.classList.remove('qr-scanner-active');
    };
  }, [isCameraActive]);

  // Function to start the camera and scanner
  const startCamera = async () => {
    setError(null);
    setIsLoading(true);
    setScanAttempts(0);
    
    try {
      // Ensure we have access to camera permissions first
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err) {
        console.error("Camera permission error:", err);
        setError("Camera access denied. Please check your browser settings and allow camera access.");
        setIsLoading(false);
        return;
      }
      
      if (!selectedCamera && cameras.length === 0) {
        setError("No cameras available. Please ensure your device has a camera and you've granted permission.");
        setIsLoading(false);
        return;
      }
      
      // Use the selected camera or the first one if none is selected
      const cameraId = selectedCamera || cameras[0]?.id;
      
      if (!cameraId) {
        setError("No camera selected.");
        setIsLoading(false);
        return;
      }
      
      // If there's an existing scanner instance, ensure it's properly stopped
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current = null;
        } catch (err) {
          console.warn("Error stopping existing scanner:", err);
        }
      }
      
      // Wait for DOM to be sure the container element is available
      setTimeout(() => {
        try {
          // Get the container element directly 
          const containerElement = document.getElementById('scanner-container');
          
          if (!containerElement) {
            console.error("Scanner container element not found in DOM");
            setError("Scanner initialization failed. The scanner container element was not found. Try refreshing the page.");
            setIsLoading(false);
            return;
          }
          
          console.log("Container found, initializing scanner with ID:", containerElement.id);
          
          // Create a fresh scanner instance
          scannerRef.current = new Html5Qrcode("scanner-container", {
            verbose: true, // Set to true for debugging
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
          });
          
          console.log("Scanner created, starting camera with ID:", cameraId);
          
          // Start the scanner with the selected camera
          scannerRef.current.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              console.log("QR Code scanned:", decodedText);
              // QR Code scanned successfully
              setScannedCode(decodedText);
              
              // Stop the scanner after successful scan
              if (scannerRef.current) {
                scannerRef.current.stop().catch(err => {
                  console.error("Error stopping scanner after scan:", err);
                });
              }
              
              setIsCameraActive(false);
              
              // Call the success callback
              onScanSuccess(decodedText);
            },
            (errorMessage) => {
              // QR Code scanning error (Do nothing here, this is called frequently)
              // Optionally increment attempt count for debugging
              setScanAttempts(prev => prev + 1);
            }
          ).catch(err => {
            console.error("Error starting scanner:", err);
            setError(`Failed to start scanner: ${err instanceof Error ? err.message : String(err)}`);
            setIsLoading(false);
          });
          
          setIsCameraActive(true);
          console.log("Camera started successfully");
          setIsLoading(false);
        } catch (err) {
          console.error("QR Scanner error:", err);
          setError(`Could not access camera: ${err instanceof Error ? err.message : String(err)}. Please ensure your camera is not being used by another application.`);
          setIsLoading(false);
        }
      }, 500); // Wait 500ms for the DOM to be ready
    } catch (err) {
      console.error("QR Scanner initialization error:", err);
      setError(`Camera initialization failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };

  // Function to stop the camera
  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
    }
    
    setIsCameraActive(false);
  };
  
  // Function to reset the scanner for another scan
  const resetScanner = () => {
    setScannedCode(null);
    setError(null);
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
              {/* QR Scanner Container */}
              <div id="scanner-container" ref={containerRef} className="w-full h-full"></div>
              
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

              {/* Scanning counter (invisible in production but useful for debugging) */}
              <div className="absolute top-2 right-2 text-white text-xs opacity-10">
                Scanning: {scanAttempts}
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