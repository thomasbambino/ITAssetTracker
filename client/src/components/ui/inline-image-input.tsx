import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineImageInputProps {
  value: string;
  onChange: (value: string) => void;
  onImagesChange: (images: File[]) => void;
  images: File[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxImages?: number;
  maxImageSize?: number; // in bytes
}

export function InlineImageInput({
  value,
  onChange,
  onImagesChange,
  images,
  placeholder = "Type your message...",
  className,
  disabled = false,
  maxImages = 5,
  maxImageSize = 5 * 1024 * 1024 // 5MB
}: InlineImageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  const validateImage = (file: File): string | null => {
    if (!allowedImageTypes.includes(file.type)) {
      return 'Only images (JPEG, PNG, GIF, WebP) are allowed';
    }
    if (file.size > maxImageSize) {
      return `Image size must be less than ${Math.round(maxImageSize / (1024 * 1024))}MB`;
    }
    return null;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const validImages: File[] = [];
    let hasError = false;

    for (const file of fileArray) {
      const error = validateImage(file);
      if (error) {
        setError(error);
        hasError = true;
        break;
      }
      validImages.push(file);
    }

    if (!hasError) {
      setError(null);
      const totalImages = [...images, ...validImages];
      if (totalImages.length > maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }
      onImagesChange(totalImages);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    setError(null);
  };

  const createImagePreview = (file: File) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Images Preview */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
          {images.map((image, index) => (
            <div key={index} className="relative">
              <img
                src={URL.createObjectURL(image)}
                alt={`Preview ${index + 1}`}
                className="w-20 h-20 object-cover rounded-lg border"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded-md">
          {error}
        </div>
      )}

      {/* Text Input */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-12 resize-none min-h-[80px]"
        />
        
        {/* Image Upload Button */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || images.length >= maxImages}
            title="Add images"
          >
            <Image className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageUpload}
        disabled={disabled}
      />

      {/* Image Counter */}
      {images.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {images.length} / {maxImages} images
        </div>
      )}
    </div>
  );
}