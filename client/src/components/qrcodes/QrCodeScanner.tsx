import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Camera, CheckCircle, QrCode, RefreshCw, Settings } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
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

  // Initialize cameras and clean up the scanner on unmount
  useEffect(() => {
    // Get available cameras
    const fetchCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const formattedCameras = devices.map(device => ({
            id: device.id,
            label: device.label || `Camera ${devices.indexOf(device) + 1}`
          }));
          setCameras(formattedCameras);
          setSelectedCamera(formattedCameras[0].id);
        }
      } catch (err) {
        console.error("Error getting cameras:", err);
      }
    };

    fetchCameras();

    // Clean up on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Function to start the camera and scanner
  const startCamera = async () => {
    setError(null);
    setIsLoading(true);
    setScanAttempts(0);
    
    try {
      if (!containerRef.current) return;
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
      
      // Create a scanner instance
      scannerRef.current = new Html5Qrcode("scanner-container");
      
      // Start the scanner with the selected camera
      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // QR Code scanned successfully
          setScannedCode(decodedText);
          
          // Stop the scanner after successful scan
          if (scannerRef.current) {
            scannerRef.current.stop().catch(console.error);
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
      );
      
      setIsCameraActive(true);
    } catch (err) {
      console.error("QR Scanner error:", err);
      setError("Could not access camera. Please make sure you have granted camera permissions and your camera is not being used by another application.");
    } finally {
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
            
            {error && (
              <Button variant="outline" onClick={() => setError(null)} className="ml-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </>
        )}
      </div>
      
      {/* Help text for permissions */}
      {!isCameraActive && !scannedCode && (
        <div className="text-center mt-2 text-xs text-muted-foreground">
          <p>
            If your camera doesn't start, please make sure you've granted camera permissions in your browser settings.
          </p>
        </div>
      )}
      
      <style jsx global>{`
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
      `}</style>
    </div>
  );
}