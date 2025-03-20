import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Camera, CheckCircle, QrCode, FileInput } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Html5Qrcode } from "html5-qrcode";

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
  
  // References
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  
  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Create a unique ID for the scanner element
  const scannerId = "qrcode-scanner-container";

  // Start camera and QR scanning
  const startScanner = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if the container exists
      if (!document.getElementById(scannerId)) {
        setError("Scanner container not found");
        setIsLoading(false);
        return;
      }
      
      // Create new scanner instance
      try {
        if (scannerRef.current) {
          await scannerRef.current.clear();
        }
        
        scannerRef.current = new Html5Qrcode(scannerId);
      } catch (err) {
        console.error("Error creating scanner:", err);
        setError(`Failed to initialize scanner: ${err instanceof Error ? err.message : String(err)}`);
        setIsLoading(false);
        return;
      }
      
      try {
        // List available cameras
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setError("No cameras detected on your device");
          setIsLoading(false);
          return;
        }
        
        // Start scanning with first available camera
        const cameraId = devices[0].id;
        
        await scannerRef.current.start(
          cameraId, 
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            console.log(`Code detected: ${decodedText}`);
            setScannedCode(decodedText);
            
            // Stop scanning after successful scan
            if (scannerRef.current) {
              scannerRef.current.stop().catch(console.error);
            }
            
            setIsCameraActive(false);
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            // QR code error callbacks are common during scanning
            // Only log as errors if not a normal QR scanning error
            if (!errorMessage.includes("No QR code found")) {
              console.error(`QR scanning error: ${errorMessage}`);
            }
          }
        );
        
        setIsCameraActive(true);
      } catch (err) {
        console.error("Camera error:", err);
        setError(`Camera error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } catch (err) {
      console.error("Error setting up scanner:", err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsCameraActive(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };
  
  const resetScanner = () => {
    setScannedCode(null);
    setManualCode("");
    setError(null);
  };
  
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
            <div className="aspect-video relative bg-gray-900">
              <div id={scannerId} className="w-full h-full"></div>
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
                    onClick={startScanner} 
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
        {isCameraActive ? (
          <Button onClick={stopScanner} variant="outline">
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