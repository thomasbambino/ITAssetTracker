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

  // This effect will be called when the camera is shown
  useEffect(() => {
    // Skip if camera is not active or there's already a successful scan
    if (!showCamera || scannedCode) return;
    
    // Try to dynamically import html5-qrcode only when needed
    let scanner: any = null;
    let mounted = true;
    
    const initCamera = async () => {
      try {
        // Dynamically import the HTML5QrCode library
        const { Html5Qrcode } = await import('html5-qrcode');
        
        // Skip if component was unmounted during the import
        if (!mounted) return;
        
        // Create necessary container
        const scannerDivId = "qrcode-scanner";
        let scannerDiv = document.getElementById(scannerDivId);
        
        // Create div if it doesn't exist
        if (!scannerDiv) {
          const cameraContainer = document.querySelector('.camera-container');
          if (!cameraContainer) {
            setError("Camera container not found");
            return;
          }
          
          // Clear any existing content
          cameraContainer.innerHTML = '';
          
          // Create new div for scanner
          scannerDiv = document.createElement('div');
          scannerDiv.id = scannerDivId;
          scannerDiv.style.width = '100%';
          scannerDiv.style.height = '100%';
          cameraContainer.appendChild(scannerDiv);
        }

        // Initialize scanner
        scanner = new Html5Qrcode(scannerDivId);

        // Get available cameras
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setError("No cameras detected on your device");
          return;
        }
        
        // Start scanner with first camera
        await scanner.start(
          devices[0].id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText: string) => {
            console.log(`QR Code detected: ${decodedText}`);
            if (mounted) {
              setScannedCode(decodedText);
              setShowCamera(false);
              onScanSuccess(decodedText);
            }
            
            // Stop scanner
            if (scanner) {
              scanner.stop().catch(console.error);
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
        console.error("Failed to start QR scanner:", err);
        if (mounted) {
          setError(`Camera error: ${err instanceof Error ? err.message : String(err)}`);
          setShowCamera(false);
        }
      }
    };
    
    // Initialize camera
    initCamera();
    
    // Cleanup function
    return () => {
      mounted = false;
      if (scanner) {
        scanner.stop().catch(console.error);
      }
    };
  }, [showCamera, scannedCode, onScanSuccess]);

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
            <div className="aspect-video relative bg-gray-900 camera-container">
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