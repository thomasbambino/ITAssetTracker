import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Camera, CheckCircle, QrCode } from "lucide-react";

interface QrCodeScannerProps {
  onScanSuccess: (code: string) => void;
}

export function QrCodeScanner({ onScanSuccess }: QrCodeScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Function to start the camera
  const startCamera = async () => {
    setError(null);
    
    try {
      // In a real implementation, this would use a QR code scanning library
      // For this demo, we'll simulate a successful scan after a delay
      setIsCameraActive(true);
      
      // Simulate finding a QR code after 3 seconds
      setTimeout(() => {
        const simulatedCode = "ASSET" + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        setScannedCode(simulatedCode);
        
        // Call the success callback
        onScanSuccess(simulatedCode);
      }, 3000);
      
    } catch (err) {
      setError("Could not access camera. Please make sure you have granted camera permissions.");
      setIsCameraActive(false);
    }
  };

  // Function to stop the camera
  const stopCamera = () => {
    setIsCameraActive(false);
    setScannedCode(null);
    
    // In a real implementation, we would also stop the media stream
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
            <div className="aspect-video relative bg-black flex items-center justify-center">
              {/* Video element for camera feed */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {/* Overlay with scanning animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-primary w-2/3 h-2/3 relative">
                  {/* Scanning animation */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-primary animate-scan"></div>
                  
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-primary"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-primary"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-primary"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-primary"></div>
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
                Click the button below to activate your camera and scan a QR code.
              </p>
            </div>
          )}
        </div>
      )}
      
      <div className="flex justify-center">
        {isCameraActive ? (
          <Button onClick={stopCamera} variant="outline">
            Stop Camera
          </Button>
        ) : (
          <Button onClick={startCamera} disabled={!!scannedCode}>
            <Camera className="h-4 w-4 mr-2" />
            {scannedCode ? "Scan Another Code" : "Start Camera"}
          </Button>
        )}
      </div>
      
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