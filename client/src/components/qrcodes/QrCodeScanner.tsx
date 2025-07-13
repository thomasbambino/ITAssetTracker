import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Camera, CheckCircle, QrCode, FileInput, RotateCcw, X } from "lucide-react";
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
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [showScanFlash, setShowScanFlash] = useState(false);
  
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

  // Switch to next camera
  const switchCamera = async () => {
    console.log('Switch camera clicked!');
    console.log('Available cameras count:', availableCameras.length);
    console.log('Available cameras:', availableCameras);
    console.log('Current camera index:', currentCameraIndex);
    
    if (availableCameras.length <= 1) {
      console.log('Not enough cameras to switch');
      return;
    }
    
    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    console.log('Switching to camera index:', nextIndex);
    
    // First update the camera index
    setCurrentCameraIndex(nextIndex);
    
    // Force a complete restart of the camera system
    try {
      // Immediate cleanup without waiting for promises
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            // Don't await - just fire and forget to avoid media interruption errors
            scannerRef.current.stop().catch(() => {
              // Silently ignore all stop errors during switching
            });
          }
        } catch (stopErr) {
          // Ignore all stop errors
        }
        
        // Clear references immediately
        scannerRef.current = null;
        scannerInitializedRef.current = false;
      }
      
      // Force DOM cleanup by hiding camera immediately
      setShowCamera(false);
      
      // Wait longer before restart to ensure complete cleanup
      setTimeout(() => {
        if (mountedRef.current) {
          console.log('Restarting camera with new selection...');
          setShowCamera(true);
        }
      }, 300);
      
    } catch (err) {
      console.log("Camera switch initiated despite error:", err);
      // Force restart even on error
      setShowCamera(false);
      setTimeout(() => {
        if (mountedRef.current) {
          setShowCamera(true);
        }
      }, 500);
    }
  };
  
  // Haptic feedback function with audio cue
  const triggerHapticFeedback = () => {
    try {
      // Haptic feedback
      if ('vibrate' in navigator) {
        // Pattern: short-pause-medium for success
        navigator.vibrate([100, 50, 200]);
      }
      // Fallback for older devices
      else if ('webkitVibrate' in navigator) {
        (navigator as any).webkitVibrate([100, 50, 200]);
      }
      
      // Audio feedback - success beep
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // High pitch
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
    } catch (error) {
      // Silently fail if haptic/audio feedback is not supported
      console.log('Haptic/audio feedback not supported:', error);
    }
  };

  // Handle manual code submission
  const handleManualSubmit = () => {
    if (!manualCode || manualCode.trim() === "") {
      setError("Please enter a QR code value");
      return;
    }
    
    // Trigger haptic feedback for manual scan success
    triggerHapticFeedback();
    
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
            // Ignore media interruption errors during cleanup
            if (!err.message?.includes('media was removed') && !err.message?.includes('play() request was interrupted')) {
              console.log("Error stopping scanner:", err);
            }
          });
        }
        scannerRef.current = null;
      }
      scannerInitializedRef.current = false;
    } catch (err) {
      // Ignore media interruption errors during cleanup
      if (!err.message?.includes('media was removed') && !err.message?.includes('play() request was interrupted')) {
        console.log("Error during scanner cleanup:", err);
      }
    }
  };

  // Set mounted flag to false on unmount and add error handler
  useEffect(() => {
    mountedRef.current = true;
    
    // Global error handler for media interruption errors
    const handleError = (event: ErrorEvent) => {
      if (event.message && (
        event.message.includes('media was removed') ||
        event.message.includes('play() request was interrupted') ||
        event.message.includes('The play() request was interrupted')
      )) {
        // Prevent these errors from showing in console
        event.preventDefault();
        console.log('Media interruption error caught and handled during camera switch');
        return false;
      }
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      mountedRef.current = false;
      window.removeEventListener('error', handleError);
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
        // Check if we're on iOS Safari first
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isIOS && isSafari) {
          console.log('iOS Safari detected - using fallback approach');
        }
        
        // Dynamically import the HTML5QrCode library with iOS-specific error handling
        let Html5Qrcode;
        try {
          const Html5QrcodeModule = await import('html5-qrcode');
          Html5Qrcode = Html5QrcodeModule.Html5Qrcode;
        } catch (importErr) {
          console.error("Failed to import HTML5-QrCode library:", importErr);
          
          // Check if this is the iOS MIME type error or general loading issue
          if (importErr instanceof Error && (
            importErr.message.includes('MIME type') || 
            importErr.message.includes('text/html') ||
            importErr.message.includes('not valid Javascript') ||
            importErr.message.includes('Failed to fetch')
          )) {
            setError("Camera scanner is not available on this device. Please use manual code entry below.");
          } else {
            setError(`Scanner library failed to load: ${importErr instanceof Error ? importErr.message : String(importErr)}`);
          }
          setShowCamera(false);
          return;
        }
        
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
          
          // Store available cameras
          console.log('Available cameras found:', devices);
          console.log('Camera count:', devices.length);
          devices.forEach((device, index) => {
            console.log(`Camera ${index + 1}: ${device.label} (ID: ${device.id})`);
          });
          
          setAvailableCameras(devices);
          
          // Skip if component was unmounted
          if (!mountedRef.current) return;
          
          // Prioritize back-facing cameras for mobile devices
          let selectedCameraId = devices[0].id;
          let selectedIndex = 0;
          
          // Look for back-facing camera (environment)
          const backCamera = devices.find((device, index) => {
            const label = device.label.toLowerCase();
            if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
              selectedIndex = index;
              return true;
            }
            return false;
          });
          
          if (backCamera) {
            selectedCameraId = backCamera.id;
            setCurrentCameraIndex(selectedIndex);
          } else {
            // If no explicit back camera found, use current camera index
            selectedCameraId = devices[currentCameraIndex]?.id || devices[0].id;
          }
          
          console.log(`Starting camera: ${selectedCameraId} (${devices[selectedIndex]?.label || 'Unknown'})`);
          
          // Start scanner with selected camera
          await scannerRef.current.start(
            selectedCameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0, // Square aspect ratio
            },
            (decodedText: string) => {
              console.log(`QR Code detected: ${decodedText}`);
              
              // Trigger visual flash effect
              setShowScanFlash(true);
              setTimeout(() => setShowScanFlash(false), 500);
              
              // Trigger haptic feedback for successful scan
              triggerHapticFeedback();
              
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
  }, [showCamera, scannedCode, onScanSuccess, currentCameraIndex]);
  
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
            <>
              <div className="aspect-video relative bg-black">
                {/* Camera Container */}
                <div className="camera-container w-full h-full">
                  {/* Scanner will be attached to this div by the useEffect hook */}
                </div>
                
                {/* Success Flash Overlay */}
                {showScanFlash && (
                  <div className="absolute inset-0 bg-green-400 opacity-70 z-40 animate-pulse pointer-events-none" />
                )}
                
                {/* Camera Info */}
                {availableCameras.length > 0 && (
                  <div className="absolute bottom-2 left-2 z-50 pointer-events-none">
                    <div className="bg-black/80 text-white text-xs px-3 py-2 rounded shadow-lg backdrop-blur-sm">
                      <div>Camera: {availableCameras[currentCameraIndex]?.label || 'Unknown'}</div>
                      <div>({currentCameraIndex + 1}/{availableCameras.length}) - {availableCameras.length > 1 ? 'Switch available' : 'Single camera'}</div>
                    </div>
                  </div>
                )}
              </div>
              

            </>
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
                  <p className="text-xs text-muted-foreground">
                    If camera scanning isn't working, type or paste the QR code value here
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter QR code value" 
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
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
          <>
            {availableCameras.length > 1 && (
              <Button onClick={switchCamera} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Switch Camera
              </Button>
            )}
            <Button onClick={stopCamera} variant="outline">
              Stop Camera
            </Button>
          </>
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