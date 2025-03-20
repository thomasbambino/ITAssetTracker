import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Camera, CheckCircle, QrCode, FileInput } from "lucide-react";
import { Input } from "@/components/ui/input";

interface QrCodeScannerProps {
  onScanSuccess: (code: string) => void;
}

export function QrCodeScanner({ onScanSuccess }: QrCodeScannerProps) {
  // States
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // Store scanner instance in a ref for access across renders
  const scannerRef = useRef<any>(null);
  const mountedRef = useRef<boolean>(true);
  const scannerInitializedRef = useRef<boolean>(false);
  
  // Start actual scanning
  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    setShowCamera(true);
    setIsLoading(false);
  };
  
  // Stop scanning
  const stopCamera = () => {
    setShowCamera(false);
  };
  
  // Reset scanner
  const resetScanner = () => {
    setScannedCode(null);
    setManualCode("");
    setError(null);
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
  
  // Cleanup scanner resources
  const cleanupScanner = () => {
    try {
      if (scannerRef.current) {
        // Only try to stop if it's scanning
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch((err: any) => {
            console.log("Error stopping scanner:", err);
          });
        }
        scannerRef.current = null;
      }
      scannerInitializedRef.current = false;
    } catch (err) {
      console.log("Error during scanner cleanup:", err);
    }
  };

  // Set mounted flag to false on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupScanner();
    };
  }, []);
  
  // This effect will be called when the camera is shown/hidden
  useEffect(() => {
    if (!showCamera || scannedCode) {
      cleanupScanner();
      return;
    }
    
    // Don't re-initialize if already done
    if (scannerInitializedRef.current) {
      return;
    }
    
    const initCamera = async () => {
      try {
        // Dynamically import the HTML5QrCode library
        const Html5QrcodeModule = await import('html5-qrcode');
        const Html5Qrcode = Html5QrcodeModule.Html5Qrcode;
        
        // Skip if component was unmounted during the import
        if (!mountedRef.current) return;
        
        // Create necessary container
        const scannerDivId = "qrcode-scanner-" + Date.now(); // Unique ID each time
        
        // Get container and prepare it
        const cameraContainer = document.querySelector('.camera-container');
        if (!cameraContainer) {
          setError("Camera container not found");
          setShowCamera(false);
          return;
        }
        
        // Clear any existing content
        cameraContainer.innerHTML = '';
        
        // Create new div for scanner
        const scannerDiv = document.createElement('div');
        scannerDiv.id = scannerDivId;
        scannerDiv.style.width = '100%';
        scannerDiv.style.height = '100%';
        cameraContainer.appendChild(scannerDiv);
        
        // Short delay to ensure DOM is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check again if mounted
        if (!mountedRef.current) return;
        
        // Initialize scanner
        try {
          scannerRef.current = new Html5Qrcode(scannerDivId);
          scannerInitializedRef.current = true;
        } catch (initErr) {
          console.error("Failed to initialize scanner:", initErr);
          setError(`Scanner initialization failed: ${initErr instanceof Error ? initErr.message : String(initErr)}`);
          setShowCamera(false);
          return;
        }
        
        // Get available cameras
        try {
          const devices = await Html5Qrcode.getCameras();
          if (!devices || devices.length === 0) {
            setError("No cameras detected on your device");
            setShowCamera(false);
            return;
          }
          
          // Skip if component was unmounted
          if (!mountedRef.current) return;
          
          // Start scanner with first camera
          await scannerRef.current.start(
            devices[0].id,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText: string) => {
              console.log(`QR Code detected: ${decodedText}`);
              
              // Ensure scanner is stopped before navigation
              try {
                if (scannerRef.current && scannerRef.current.isScanning) {
                  scannerRef.current.stop().catch(console.error);
                }
              } catch (stopErr) {
                console.error("Error stopping scanner after scan:", stopErr);
              }
              
              // Only update state if still mounted
              if (mountedRef.current) {
                setScannedCode(decodedText);
                setShowCamera(false);
                onScanSuccess(decodedText);
              }
            },
            (errorMessage: string) => {
              // Don't show errors for normal scanning
              if (!errorMessage.includes('No QR code found')) {
                console.error(`QR Scan error: ${errorMessage}`);
              }
            }
          );
        } catch (err) {
          console.error("Camera access error:", err);
          if (mountedRef.current) {
            setError(`Camera error: ${err instanceof Error ? err.message : String(err)}`);
            setShowCamera(false);
          }
        }
      } catch (err) {
        console.error("Failed to import or initialize QR scanner:", err);
        if (mountedRef.current) {
          setError(`Scanner error: ${err instanceof Error ? err.message : String(err)}`);
          setShowCamera(false);
        }
      }
    };
    
    // Initialize camera
    initCamera();
    
    // Always clean up on effect cleanup
    return () => {
      cleanupScanner();
    };
  }, [showCamera, scannedCode, onScanSuccess]);
  
  // Cleanup on navigation
  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, []);

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
          {showCamera ? (
            <div className="aspect-video relative bg-black camera-container">
              {/* Scanner will be attached to this div by the useEffect hook */}
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
                    disabled={isLoading}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {isLoading ? "Starting Camera..." : "Start Camera"}
                  </Button>
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
        {showCamera ? (
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
    </div>
  );
}