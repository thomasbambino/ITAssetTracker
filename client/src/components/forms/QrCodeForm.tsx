import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { QrCodeDisplay } from "@/components/qrcodes/QrCodeDisplay";

// Define the form schema
const formSchema = z.object({
  deviceId: z.number(),
  code: z.string().optional(),
});

// Define the props for the form
interface QrCodeFormProps {
  qrCode?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function QrCodeForm({ qrCode, onSuccess, onCancel }: QrCodeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Fetch devices for selection
  const { data: devices = [], isLoading: isDevicesLoading } = useQuery({
    queryKey: ['/api/devices'],
  });

  // Fetch existing QR codes to avoid duplicates
  const { data: existingQrCodes = [] } = useQuery({
    queryKey: ['/api/qrcodes'],
  });

  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deviceId: qrCode?.deviceId || 0,
      code: qrCode?.code || "",
    },
  });

  // Generate a random QR code
  const generateRandomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 10;
    let result = '';
    
    // Keep generating until we have a unique code
    let isUnique = false;
    while (!isUnique) {
      result = '';
      for (let i = 0; i < codeLength; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if this code already exists
      const exists = existingQrCodes.some((qr: any) => qr.code === result);
      isUnique = !exists;
    }
    
    setGeneratedCode(result);
    form.setValue('code', result);
  };

  // Autogenerate a code when deviceId changes
  const deviceId = form.watch('deviceId');
  
  const handleDeviceChange = (value: string) => {
    const id = parseInt(value);
    form.setValue('deviceId', id);
    
    // Check if this device already has a QR code
    const existingCode = existingQrCodes.find((qr: any) => qr.deviceId === id);
    if (existingCode) {
      setGeneratedCode(existingCode.code);
      form.setValue('code', existingCode.code);
    } else {
      generateRandomCode();
    }
  };

  // Submit handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Format data to ensure proper handling of dates and IDs
      const formattedData = {
        ...values,
        deviceId: values.deviceId ? parseInt(values.deviceId.toString()) : null,
        // QR codes may have createdAt or lastScanned dates
        createdAt: values.createdAt ? new Date(values.createdAt) : null,
        lastScanned: values.lastScanned ? new Date(values.lastScanned) : null
      };
      
      if (qrCode?.id) {
        // Update existing QR code
        await apiRequest(
          "PUT",
          `/api/qrcodes/${qrCode.id}`,
          formattedData
        );
      } else {
        // Create new QR code
        await apiRequest(
          "POST",
          "/api/qrcodes",
          formattedData
        );
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting QR code:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="deviceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device</FormLabel>
              <Select 
                onValueChange={handleDeviceChange} 
                defaultValue={field.value ? field.value.toString() : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a device" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isDevicesLoading ? (
                    <SelectItem value="" disabled>
                      Loading devices...
                    </SelectItem>
                  ) : devices.length === 0 ? (
                    <SelectItem value="" disabled>
                      No devices available
                    </SelectItem>
                  ) : (
                    devices.map((device: any) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.brand} {device.model} ({device.assetTag})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the device for which to generate a QR code
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>QR Code</FormLabel>
              <div className="flex space-x-2">
                <FormControl>
                  <Input 
                    placeholder="Auto-generated code" 
                    {...field} 
                    value={field.value || ""}
                    readOnly
                    className="font-mono"
                  />
                </FormControl>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={generateRandomCode}
                >
                  Regenerate
                </Button>
              </div>
              <FormDescription>
                This is the unique code that will be encoded in the QR code
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {generatedCode && (
          <div className="border rounded-md p-4 flex flex-col items-center justify-center bg-muted/30">
            <div className="mb-2 text-sm font-medium">Preview:</div>
            <div className="bg-white p-4 rounded-md shadow-sm">
              {deviceId ? (
                <QrCodeDisplay 
                  value={generatedCode} 
                  size={160}
                  label={devices.find((d: any) => d.id === deviceId)?.assetTag || 'Asset'}
                  assetTag={devices.find((d: any) => d.id === deviceId)?.brand + ' ' + devices.find((d: any) => d.id === deviceId)?.model}
                  includeBorder={false}
                />
              ) : (
                <QrCodeDisplay value={generatedCode} size={160} includeBorder={false} />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              QR code will be saved to the database when you click Generate
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || !deviceId}>
            {isSubmitting ? "Saving..." : qrCode ? "Update QR Code" : "Generate QR Code"}
          </Button>
        </div>
      </form>
    </Form>
  );
}