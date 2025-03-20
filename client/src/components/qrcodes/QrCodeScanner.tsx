import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Camera, CheckCircle, QrCode, FileInput, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";

interface QrCodeScannerProps {
  onScanSuccess: (code: string) => void;
}

export function QrCodeScanner({ onScanSuccess }: QrCodeScannerProps) {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  // Handle manual code submission
  const handleManualSubmit = () => {
    if (!manualCode || manualCode.trim() === "") {
      setError("Please enter a QR code value");
      return;
    }
    
    setScannedCode(manualCode);
    onScanSuccess(manualCode);
  };
  
  // Reset scanner
  const resetScanner = () => {
    setScannedCode(null);
    setManualCode("");
    setError(null);
  };
  
  // Note to user about QR scanning
  const showCameraDisabledMessage = () => {
    setError("Camera-based QR scanning is currently disabled due to technical limitations. Please use manual entry instead.");
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
            <h3 className="font-medium text-green-800">QR Code Processed Successfully</h3>
            <p className="text-sm text-green-700">Code: <span className="font-mono">{scannedCode}</span></p>
          </div>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden p-4">
          <div className="text-center mb-6">
            <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">QR Code Entry</h3>
            <p className="text-sm text-muted-foreground">
              Enter a QR code manually by typing it below.
            </p>
          </div>
          
          <div className="space-y-4">
            {/* Manual QR code entry */}
            <div className="space-y-2">
              <div className="font-medium text-sm">Enter QR Code Manually</div>
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
            
            {/* Disabled camera option with explanation */}
            <div className="space-y-2 border-t pt-4 mt-4">
              <div className="font-medium text-sm">Scan with Camera</div>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={showCameraDisabledMessage}
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan QR Code with Camera
              </Button>
              <p className="text-xs text-muted-foreground italic">
                Note: Camera-based scanning is currently disabled due to compatibility issues.
                Please use manual entry instead.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {scannedCode && (
        <div className="flex justify-center">
          <Button onClick={resetScanner}>
            <QrCode className="h-4 w-4 mr-2" />
            Enter Another Code
          </Button>
        </div>
      )}
    </div>
  );
}