'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import crypto from 'crypto';

interface ProductImage {
  url: string;
  type: 'primary' | 'secondary' | 'uploaded';
  uploaded_at: string;
  size: number;
  hash: string;
  filename: string;
}

interface ProductImageUploadProps {
  productId?: string;
  userId: string;
  existingImages?: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
}

export function ProductImageUpload({
  productId,
  userId,
  existingImages = [],
  onImagesChange,
  maxImages = 4,
  maxSizeMB = 2,
}: ProductImageUploadProps) {
  const [images, setImages] = useState<ProductImage[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const supabase = createClient();

  const validateFile = (file: File): string | null => {
    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'File must be an image';
    }

    // Check allowed formats
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedFormats.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are allowed';
    }

    return null;
  };

  const uploadImage = async (file: File): Promise<ProductImage | null> => {
    try {
      setError(null);

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return null;
      }

      // Generate hash for filename
      const arrayBuffer = await file.arrayBuffer();
      const hashHex = crypto
        .createHash('sha256')
        .update(new Uint8Array(arrayBuffer))
        .digest('hex')
        .substring(0, 16);

      const fileExt = file.name.split('.').pop();
      const fileName = `${hashHex}.${fileExt}`;
      const filePath = `${userId}/${productId || 'temp'}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('product-images').getPublicUrl(filePath);

      const newImage: ProductImage = {
        url: publicUrl,
        type: images.length === 0 ? 'primary' : 'secondary',
        uploaded_at: new Date().toISOString(),
        size: file.size,
        hash: hashHex,
        filename: file.name,
      };

      return newImage;
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    const newImages: ProductImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        const uploadedImage = await uploadImage(file);
        if (uploadedImage) {
          newImages.push(uploadedImage);
        }
      }
    }

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onImagesChange(updatedImages);
    }

    setUploading(false);
  };

  const handleRemove = async (index: number) => {
    const image = images[index];
    if (!image) return;

    try {
      // Try to delete from storage (may fail if file doesn't exist, that's okay)
      const pathMatch = image.url.match(/product-images\/(.+)$/);
      if (pathMatch && pathMatch[1]) {
        await supabase.storage.from('product-images').remove([pathMatch[1]]);
      }
    } catch (err) {
      console.error('Error removing image from storage:', err);
    }

    // Update local state regardless of storage deletion success
    const updatedImages = images.filter((_, i) => i !== index);

    // If we removed the primary image, make the first remaining image primary
    if (image.type === 'primary' && updatedImages.length > 0 && updatedImages[0]) {
      updatedImages[0].type = 'primary';
    }

    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [images]
  );

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-pg-accent bg-pg-accent/5'
              : 'border-pg-border hover:border-pg-accent/50'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="space-y-2">
            <div className="text-4xl">📸</div>
            <p className="text-sm font-medium text-pg-text">
              {uploading ? 'Uploading...' : 'Upload Product Images'}
            </p>
            <p className="text-xs text-pg-text-muted">
              Drag and drop or click to select ({images.length}/{maxImages} uploaded)
            </p>
            <p className="text-xs text-pg-text-muted">
              Max {maxSizeMB}MB per image • JPEG, PNG, WebP
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative group rounded-lg overflow-hidden border border-pg-border bg-pg-surface"
            >
              <div className="aspect-square relative">
                <Image
                  src={image.url}
                  alt={image.filename}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>

              {/* Overlay with info */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-xs text-white font-medium truncate px-2">
                    {image.filename}
                  </p>
                  <p className="text-xs text-white/70">
                    {(image.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() => handleRemove(index)}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Primary badge */}
              {image.type === 'primary' && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-pg-accent text-white text-xs font-medium rounded">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Note */}
      <p className="text-xs text-pg-text-muted">
        💡 Upload up to {maxImages} product images for reverse image search and visual comparison during scans
      </p>
    </div>
  );
}
