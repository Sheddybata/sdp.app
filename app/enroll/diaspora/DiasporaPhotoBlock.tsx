"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X } from "lucide-react";

export function readImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      reject(new Error("Image must be under 1.5 MB."));
      return;
    }
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Could not read the file."));
    fr.readAsDataURL(file);
  });
}

type FacingMode = "user" | "environment";

/** Matches `Step4Verification` camera + upload pattern for consistency with domestic enrollment. */
export function DiasporaPhotoBlock({
  label,
  hint,
  dataUrl,
  onDataUrl,
  facingMode,
  error,
  onError,
  useCameraLabel = "Use device camera",
  uploadLabel = "Upload Photo",
  removeLabel = "Remove photo",
  captureLabel = "Capture photo",
  cameraPermissionDenied = "Camera permission denied.",
  cameraNotAvailable = "Camera not available.",
}: {
  label: string;
  hint: string;
  dataUrl: string | null;
  onDataUrl: (url: string | null) => void;
  facingMode: FacingMode;
  error: string | null;
  onError: (msg: string | null) => void;
  useCameraLabel?: string;
  uploadLabel?: string;
  removeLabel?: string;
  captureLabel?: string;
  cameraPermissionDenied?: string;
  cameraNotAvailable?: string;
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    onError(null);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video:
          facingMode === "environment"
            ? { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not access camera";
      setCameraError(
        msg.includes("Permission") ? cameraPermissionDenied : cameraNotAvailable
      );
    }
  }, [cameraNotAvailable, cameraPermissionDenied, facingMode, onError]);

  useEffect(() => {
    if (!showCamera || !streamRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
    return () => {
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [showCamera]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.readyState < 2) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    const url = canvas.toDataURL("image/jpeg", 0.92);
    if (url.length > 2_000_000) {
      onError("Photo is too large. Try upload with a smaller image.");
      stopCamera();
      return;
    }
    onDataUrl(url);
    onError(null);
    stopCamera();
  }, [onDataUrl, onError, stopCamera]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    onError(null);
    try {
      const url = await readImageDataUrl(file);
      onDataUrl(url);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not load image.");
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {showCamera && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-900 p-2">
          <div className="relative aspect-[4/3] max-h-[280px] overflow-hidden rounded-md bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: facingMode === "user" ? "scaleX(-1)" : undefined }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 rounded-full"
              onClick={stopCamera}
              aria-label="Close camera"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {cameraError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {cameraError}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <Button type="button" className="min-h-[44px] flex-1" onClick={capturePhoto}>
              <Camera className="mr-2 h-4 w-4" />
              {captureLabel}
            </Button>
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={stopCamera}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!showCamera && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
              aria-label="Upload image from device"
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] flex-1"
              onClick={startCamera}
            >
              <Camera className="h-4 w-4" />
              {useCameraLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] flex-1"
              onClick={() => uploadInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploadLabel}
            </Button>
          </div>
          {dataUrl && (
            <div className="mt-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dataUrl}
                alt="Preview"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-sdp-primary"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => onDataUrl(null)}>
                {removeLabel}
              </Button>
            </div>
          )}
        </>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-neutral-500">{hint}</p>
      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </div>
  );
}
