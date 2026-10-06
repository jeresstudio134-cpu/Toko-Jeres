import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedText: string) => void;
  theme?: 'light' | 'dark';
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  theme = 'light',
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nativeStreamRef = useRef<MediaStream | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-scanner-region';
  const hasDetectedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      setError(null);
      setIsInitializing(false);
      hasDetectedRef.current = false;
      return;
    }

    hasDetectedRef.current = false;
    setIsInitializing(true);
    setError(null);

    let isMounted = true;

    const handleSuccess = (decodedText: string) => {
      if (hasDetectedRef.current) return;
      hasDetectedRef.current = true;
      const clean = decodedText.trim();
      cleanupScanner();
      onScan(clean);
    };

    const startScanner = async () => {
      // 1. Coba Native window.BarcodeDetector jika tersedia
      const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window;

      if (hasNative) {
        try {
          const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats().catch(() => []);
          const formatsToUse = ['code_128', 'qr_code'].filter(f => supportedFormats.includes(f));
          
          if (formatsToUse.length > 0) {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });

            if (!isMounted) {
              stream.getTracks().forEach(t => t.stop());
              return;
            }

            nativeStreamRef.current = stream;

            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play().catch(() => {});
            }

            const barcodeDetector = new (window as any).BarcodeDetector({ formats: formatsToUse });
            let animFrameId: number;

            const detectFrame = async () => {
              if (!isMounted || hasDetectedRef.current || !videoRef.current) return;

              if (videoRef.current.readyState >= 2) {
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                    handleSuccess(barcodes[0].rawValue);
                    return;
                  }
                } catch {
                  // ignore frame error
                }
              }

              if (isMounted && !hasDetectedRef.current) {
                animFrameId = requestAnimationFrame(detectFrame);
              }
            };

            setIsInitializing(false);
            animFrameId = requestAnimationFrame(detectFrame);
            return;
          }
        } catch (nativeErr: any) {
          console.warn('BarcodeDetector gagal atau tidak diizinkan, beralih ke html5-qrcode fallback:', nativeErr);
          if (nativeStreamRef.current) {
            nativeStreamRef.current.getTracks().forEach(t => t.stop());
            nativeStreamRef.current = null;
          }
        }
      }

      // 2. Fallback: Gunakan html5-qrcode library
      try {
        const qrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
          ],
          verbose: false,
        });

        html5QrCodeRef.current = qrCode;

        await qrCode.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const width = Math.min(viewfinderWidth * 0.85, 300);
              const height = Math.min(viewfinderHeight * 0.45, 160);
              return { width, height };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleSuccess(decodedText);
          },
          () => {
            // Abaikan kesalahan deteksi per-frame
          }
        );

        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (err: any) {
        console.error('Html5Qrcode error:', err);
        if (!isMounted) return;

        setIsInitializing(false);
        const errMsg = err?.message || String(err);
        if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
          setError('Izin akses kamera ditolak. Silakan izinkan kamera di peramban (browser) Anda.');
        } else if (errMsg.includes('NotFoundError') || errMsg.includes('DevicesNotFoundError')) {
          setError('Kamera tidak ditemukan pada perangkat ini.');
        } else {
          setError('Gagal mengaktifkan kamera. Pastikan kamera tidak sedang dipakai aplikasi lain.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      cleanupScanner();
    };
  }, [isOpen]);

  const cleanupScanner = () => {
    // Hentikan native video stream
    if (nativeStreamRef.current) {
      nativeStreamRef.current.getTracks().forEach(t => t.stop());
      nativeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Hentikan html5-qrcode
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
            try {
              html5QrCodeRef.current?.clear();
            } catch {}
            html5QrCodeRef.current = null;
          });
        } else {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        }
      } catch {
        html5QrCodeRef.current = null;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 print:hidden flex flex-col items-center justify-between bg-black/95 text-white p-4">
      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between pt-2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-emerald-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight text-white">Pindai Barcode Nota</h3>
            <p className="text-[10px] text-neutral-400">Code 128 / QR Code</p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Tutup pemindai"
          className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center active:scale-95 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Scanner Viewport */}
      <div className="relative w-full max-w-sm flex-1 flex flex-col items-center justify-center my-4 overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800">
        {/* Native video preview (used when BarcodeDetector is active) */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${nativeStreamRef.current ? 'block' : 'hidden'}`}
        />

        {/* Html5Qrcode DOM mount (used when html5-qrcode is active) */}
        <div
          id={scannerContainerId}
          className={`w-full h-full ${!nativeStreamRef.current ? 'block' : 'hidden'}`}
        />

        {/* Viewfinder Target Overlay (Guide Box) */}
        {!error && !isInitializing && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-64 h-36 border-2 border-emerald-400/90 rounded-xl shadow-[0_0_20px_rgba(52,211,153,0.3)] bg-emerald-400/5">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

              {/* Scanning Laser Line */}
              <div className="w-full h-[2px] bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399] absolute top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isInitializing && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 gap-2 z-20">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
            <p className="text-xs text-neutral-300">Menghubungkan ke kamera...</p>
          </div>
        )}

        {/* Error Alert Overlay */}
        {error && (
          <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-neutral-900/95 text-center gap-3 z-30">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-300 mb-1">Gagal Membuka Kamera</p>
              <p className="text-[11px] text-neutral-400 leading-relaxed max-w-xs">{error}</p>
            </div>
            <button
              onClick={() => {
                setError(null);
                setIsInitializing(true);
                cleanupScanner();
                // re-run by toggling isOpen briefly
                onClose();
              }}
              className="mt-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl active:scale-95 transition-all"
            >
              Tutup Pemindai
            </button>
          </div>
        )}
      </div>

      {/* Bottom Instructions / Actions */}
      <div className="w-full max-w-md pb-4 text-center z-10 space-y-3">
        <p className="text-xs text-neutral-400">
          Arahkan kamera ke barcode nota (Code 128 / QR)
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl active:scale-95 transition-all"
        >
          Batal
        </button>
      </div>
    </div>
  );
};
