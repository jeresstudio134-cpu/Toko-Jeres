import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, RefreshCw, SwitchCamera, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedText: string) => void;
  theme?: 'light' | 'dark';
}

/**
 * Pemutar nada konfirmasi pemindaian berbasis Web Audio API
 */
const playBeepSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // abaikan jika audio otomatis dibatasi peramban
  }
};

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-scanner-viewport';
  const hasDetectedRef = useRef(false);

  // Ambil daftar kamera saat scanner dibuka
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Cari kamera belakang secara otomatis
          const backIdx = devices.findIndex(d =>
            /back|rear|environment|belakang/i.test(d.label)
          );
          setSelectedCameraIndex(backIdx >= 0 ? backIdx : 0);
        }
      })
      .catch(err => {
        console.warn('Gagal memuat daftar kamera:', err);
      });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      stopAndCleanup();
      setError(null);
      setIsInitializing(false);
      setDetectedCode(null);
      hasDetectedRef.current = false;
      return;
    }

    hasDetectedRef.current = false;
    setIsInitializing(true);
    setError(null);
    setDetectedCode(null);

    let isMounted = true;

    const startScanner = async () => {
      try {
        // Hentikan scanner aktif sebelumnya jika ada
        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
            html5QrCodeRef.current.clear();
          } catch {}
          html5QrCodeRef.current = null;
        }

        const qrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });

        html5QrCodeRef.current = qrCode;

        // Tentukan konfigurasi kamera: gunakan cameraId jika sudah terdeteksi, atau facingMode environment
        const cameraConfig =
          cameras.length > 0 && cameras[selectedCameraIndex]
            ? cameras[selectedCameraIndex].id
            : { facingMode: 'environment' };

        await qrCode.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Bidang pemindaian bujur sangkar optimal untuk QR Code
              const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
              return { width: edge, height: edge };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (hasDetectedRef.current) return;
            hasDetectedRef.current = true;

            const cleanCode = decodedText.trim();
            setDetectedCode(cleanCode);

            // Suara & getaran konfirmasi
            playBeepSound();
            if (navigator.vibrate) {
              try {
                navigator.vibrate([70, 40, 70]);
              } catch {}
            }

            // Beri jeda 400ms agar animasi sukses terlihat oleh pengguna
            setTimeout(() => {
              stopAndCleanup();
              onScan(cleanCode);
            }, 400);
          },
          () => {
            // Frame error diabaikan
          }
        );

        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (err: any) {
        console.error('Gagal memulai scanner:', err);
        if (!isMounted) return;

        setIsInitializing(false);
        const errMsg = err?.message || String(err);
        if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
          setError('Izin akses kamera ditolak. Silakan izinkan kamera di browser Anda.');
        } else if (errMsg.includes('NotFoundError') || errMsg.includes('DevicesNotFoundError')) {
          setError('Kamera tidak ditemukan pada perangkat Anda.');
        } else {
          setError('Kamera tidak dapat diakses atau sedang digunakan aplikasi lain.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopAndCleanup();
    };
  }, [isOpen, selectedCameraIndex, cameras.length]);

  const stopAndCleanup = () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current
            .stop()
            .catch(() => {})
            .finally(() => {
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

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const nextIndex = (selectedCameraIndex + 1) % cameras.length;
    setSelectedCameraIndex(nextIndex);
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
            <h3 className="text-xs font-bold tracking-tight text-white">Pindai QR Code Nota</h3>
            <p className="text-[10px] text-neutral-400">
              {cameras.length > 0 && cameras[selectedCameraIndex]
                ? cameras[selectedCameraIndex].label || 'Kamera Belakang'
                : 'Mendeteksi QR Code'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {cameras.length > 1 && (
            <button
              onClick={handleSwitchCamera}
              title="Ganti Lensa Kamera"
              aria-label="Ganti Kamera"
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center gap-1 text-[11px] font-medium active:scale-95 transition-all"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              <span>Ganti Lensa</span>
            </button>
          )}

          <button
            onClick={onClose}
            aria-label="Tutup pemindai"
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Scanner Viewport */}
      <div className="relative w-full max-w-sm flex-1 flex flex-col items-center justify-center my-3 overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl">
        {/* DOM Mount untuk Html5Qrcode */}
        <div
          id={scannerContainerId}
          className="w-full h-full overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
        />

        {/* Viewfinder Guide Overlay */}
        {!error && !isInitializing && !detectedCode && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="relative w-56 h-56 border-2 border-emerald-400/90 rounded-2xl shadow-[0_0_25px_rgba(52,211,153,0.35)] bg-emerald-400/5">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

              {/* Scanning Laser Line */}
              <div className="w-full h-[2px] bg-emerald-400 shadow-[0_0_10px_#34d399] absolute top-1/2 -translate-y-1/2 animate-pulse" />
            </div>

            <p className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full mt-3 font-medium backdrop-blur-xs">
              Arahkan kamera ke QR Code nota
            </p>
          </div>
        )}

        {/* Notifikasi Berhasil Terdeteksi */}
        {detectedCode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/85 backdrop-blur-xs z-30 p-4 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 mb-3 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-xs font-bold text-emerald-200">QR Code Terdeteksi!</p>
            <p className="text-sm font-mono font-bold text-white mt-1 bg-black/40 px-3 py-1 rounded-lg">
              {detectedCode}
            </p>
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
              onClick={onClose}
              className="mt-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl active:scale-95 transition-all"
            >
              Tutup Pemindai
            </button>
          </div>
        )}
      </div>

      {/* Bottom Instructions / Actions */}
      <div className="w-full max-w-md pb-3 text-center z-10 space-y-2.5">
        <div className="text-[11px] text-neutral-400 bg-neutral-900/80 px-3 py-2 rounded-xl border border-neutral-800">
          💡 <span className="text-neutral-300">Tips:</span> Jaga jarak kamera sekitar 10-20 cm dan pastikan barcode mendapat cahaya yang cukup.
        </div>
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
