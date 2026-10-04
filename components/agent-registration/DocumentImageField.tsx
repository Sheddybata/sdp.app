"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { compressDrawable, compressImageFile } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

type Facing = "user" | "environment";

/**
 * Photo/document upload. "Take photo" opens the device camera in the page with a
 * front/back switch; "Upload" picks an existing image. Images are shrunk before storing.
 */
export function DocumentImageField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  defaultFacing = "environment",
  maxSide,
  maxBytes,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (dataUrl: string) => void;
  error?: string;
  /** Camera to open first: "user" (front) for portraits, "environment" (back) for documents. */
  defaultFacing?: Facing;
  maxSide?: number;
  maxBytes?: number;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facing, setFacing] = useState<Facing>(defaultFacing);
  const [starting, setStarting] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const closeCamera = useCallback(() => {
    stopStream();
    setCameraOpen(false);
    setStarting(false);
  }, [stopStream]);

  useEffect(() => stopStream, [stopStream]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (cameraOpen && !starting && video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [cameraOpen, starting]);

  const startCamera = async (face: Facing) => {
    setLocalError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      nativeCameraRef.current?.click();
      return;
    }
    stopStream();
    setStarting(true);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: face }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setFacing(face);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setLocalError(
        /permission|denied|notallowed/i.test(msg)
          ? "Camera permission was denied. Allow camera access in your browser settings, or use Upload."
          : "Could not open the camera. Use Upload instead."
      );
      setCameraOpen(false);
    } finally {
      setStarting(false);
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    try {
      onChange(compressDrawable(video, video.videoWidth, video.videoHeight, { maxSide, maxBytes }));
      closeCamera();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not capture the photo.");
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLocalError(null);
    setBusy(true);
    try {
      onChange(await compressImageFile(file, { maxSide, maxBytes }));
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not load this image.");
    } finally {
      setBusy(false);
      if (uploadRef.current) uploadRef.current.value = "";
      if (nativeCameraRef.current) nativeCameraRef.current.value = "";
    }
  };

  const shownError = localError ?? error;

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-upload`}>{label}</Label>
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}

      <input
        ref={uploadRef}
        id={`${id}-upload`}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={nativeCameraRef}
        type="file"
        accept="image/*"
        capture={defaultFacing}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-hidden
        tabIndex={-1}
      />

      {cameraOpen ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-900 p-2">
          <div className="relative aspect-[4/3] max-h-[320px] overflow-hidden rounded-md bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
            />
            {starting ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 rounded-full"
              onClick={closeCamera}
              aria-label="Close camera"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-[44px] flex-1"
              onClick={capture}
              disabled={starting}
            >
              <Camera className="h-4 w-4" />
              Capture photo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() => startCamera(facing === "user" ? "environment" : "user")}
              disabled={starting}
            >
              <RefreshCw className="h-4 w-4" />
              {facing === "user" ? "Use back camera" : "Use front camera"}
            </Button>
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={closeCamera}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center",
            shownError ? "border-red-300 bg-red-50/40" : "border-neutral-300 bg-neutral-50/60"
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={`${label} preview`}
              className="h-24 w-full rounded-md border border-neutral-200 bg-white object-contain sm:h-20 sm:w-28"
            />
          ) : (
            <div className="flex h-20 w-full items-center justify-center rounded-md border border-neutral-200 bg-white text-xs text-neutral-400 sm:w-28">
              {busy ? <Loader2 className="h-5 w-5 animate-spin text-sdp-primary" /> : "No image yet"}
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] flex-1"
              onClick={() => startCamera(defaultFacing)}
              disabled={busy}
            >
              <Camera className="h-4 w-4" />
              {value ? "Retake photo" : "Take photo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] flex-1"
              onClick={() => uploadRef.current?.click()}
              disabled={busy}
            >
              <Upload className="h-4 w-4" />
              {value ? "Replace" : "Upload"}
            </Button>
          </div>
        </div>
      )}

      {shownError ? (
        <p className="text-sm text-red-600" role="alert">
          {shownError}
        </p>
      ) : null}
    </div>
  );
}
