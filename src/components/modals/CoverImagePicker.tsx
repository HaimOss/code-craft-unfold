import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ImagePlus, X, Crop, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CoverImagePickerProps {
  value: string;
  onChange: (url: string) => void;
}

const ASPECT_RATIO = 16 / 7; // wide banner

const CoverImagePicker: React.FC<CoverImagePickerProps> = ({ value, onChange }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ w: 0, h: 0 });
  const [showCropper, setShowCropper] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'יש לבחור קובץ תמונה', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'הקובץ גדול מדי (מקסימום 10MB)', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewSrc(reader.result as string);
      setShowCropper(true);
      setCropOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;
    setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setCropOffset({ x: 0, y: 0 });
  }, []);

  const getCropBounds = useCallback(() => {
    const { w, h } = imageNaturalSize;
    if (w === 0 || h === 0) return { x: 0, y: 0, cw: 0, ch: 0 };
    
    const imgRatio = w / h;
    let cw: number, ch: number;

    if (imgRatio > ASPECT_RATIO) {
      // Image is wider — crop width
      ch = h;
      cw = h * ASPECT_RATIO;
    } else {
      // Image is taller — crop height
      cw = w;
      ch = w / ASPECT_RATIO;
    }

    const maxX = w - cw;
    const maxY = h - ch;
    const x = Math.max(0, Math.min(cropOffset.x, maxX));
    const y = Math.max(0, Math.min(cropOffset.y, maxY));

    return { x, y, cw, ch };
  }, [imageNaturalSize, cropOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, offsetX: cropOffset.x, offsetY: cropOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !imgRef.current) return;
    const container = imgRef.current.parentElement!;
    const scale = imageNaturalSize.w / container.clientWidth;
    const dx = (e.clientX - dragStart.current.x) * scale;
    const dy = (e.clientY - dragStart.current.y) * scale;
    setCropOffset({
      x: dragStart.current.offsetX - dx,
      y: dragStart.current.offsetY - dy,
    });
  };

  const handleMouseUp = () => { dragging.current = false; };

  const handleCropAndUpload = async () => {
    if (!previewSrc || !user) return;
    setUploading(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = previewSrc;
      });

      const { x, y, cw, ch } = getCropBounds();
      const outputW = Math.min(1920, cw);
      const outputH = Math.round(outputW / ASPECT_RATIO);

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, x, y, cw, ch, 0, 0, outputW, outputH);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85)
      );

      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('cover-images')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cover-images')
        .getPublicUrl(fileName);

      onChange(urlData.publicUrl);
      setShowCropper(false);
      setPreviewSrc(null);
      toast({ title: 'תמונה הועלתה בהצלחה! 🎉' });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: 'שגיאה בהעלאה', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground font-medium">תמונת כיסוי</label>
      
      {/* Current image preview */}
      {value && !showCropper && (
        <div className="relative rounded-xl overflow-hidden group" style={{ aspectRatio: `${ASPECT_RATIO}` }}>
          <img src={value} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-card text-foreground rounded-full p-2 shadow-lg hover:bg-secondary transition-colors"
              title="החלף תמונה"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="bg-card text-destructive rounded-full p-2 shadow-lg hover:bg-secondary transition-colors"
              title="הסר תמונה"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Upload button when no image */}
      {!value && !showCropper && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          style={{ aspectRatio: `${ASPECT_RATIO}` }}
        >
          <ImagePlus className="h-8 w-8" />
          <span className="text-sm font-medium">בחר תמונת כיסוי</span>
          <span className="text-xs">JPG, PNG עד 10MB</span>
        </button>
      )}

      {/* Cropper */}
      {showCropper && previewSrc && (
        <div className="space-y-3">
          <div
            className="relative rounded-xl overflow-hidden border border-border cursor-move select-none"
            style={{ aspectRatio: `${ASPECT_RATIO}` }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={(el) => { imgRef.current = el; }}
              src={previewSrc}
              onLoad={onImageLoad}
              alt="Preview"
              className="w-full h-full object-cover pointer-events-none"
              style={{
                objectPosition: imageNaturalSize.w > 0
                  ? `${(cropOffset.x / (imageNaturalSize.w)) * 100}% ${(cropOffset.y / (imageNaturalSize.h)) * 100}%`
                  : 'center',
              }}
              draggable={false}
            />
            <div className="absolute inset-0 border-2 border-primary/50 rounded-xl pointer-events-none" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-foreground/70 text-background text-xs px-3 py-1 rounded-full pointer-events-none">
              גרור כדי למקם את התמונה
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowCropper(false); setPreviewSrc(null); }}
              className="btn-secondary text-sm"
              disabled={uploading}
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleCropAndUpload}
              className="btn-primary text-sm flex items-center gap-1.5"
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crop className="h-4 w-4" />}
              {uploading ? 'מעלה...' : 'חתוך והעלה'}
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CoverImagePicker;