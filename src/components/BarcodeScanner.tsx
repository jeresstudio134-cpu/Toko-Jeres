import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, RefreshCw, SwitchCamera, CheckCircle2, Image as ImageIcon, ArrowRight, ShieldAlert } from 'lucide-react';
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
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFileScanning, setIsFileScanning] = useState(false);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'barcode-scanner-viewport';
  const fileContainerId = 'barcode-file-viewport';
  const hasDetectedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      stopAndCleanup();
      setError(null);
      setIsPermissionDenied(false);
      setIsInitializing(false);
      setDetectedCode(null);
      hasDetectedRef.current = false;
      return;
    }

    hasDetectedRef.current = false;
    setIsInitializing(true);
    setError(null);
    setIsPermissionDenied(false);
    setDetectedCode(null);

    let isMounted = true;

    const startScanner = async () => {
      try {
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
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
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

        // Gunakan kamera yang dipilih atau kamera belakang secara langsung tanpa pre-query
        const cameraConfig = currentCameraId ? currentCameraId : { facingMode: 'environment' };

        await qrCode.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75);
              return { width: edge, height: edge };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (hasDetectedRef.current) return;
            hasDetectedRef.current = true;

            const cleanCode = decodedText.trim();
            setDetectedCode(cleanCode);

            playBeepSound();
            if (navigator.vibrate) {
              try {
                navigator.vibrate([70, 40, 70]);
              } catch {}
            }

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
          setIsPermissionDenied(false);

          // Ambil daftar kamera setelah streaming aktif agar tidak memicu prompt izin ganda di Safari
          Html5Qrcode.getCameras()
            .then(devices => {
              if (isMounted && devices && devices.length > 0) {
                setCameras(devices);
              }
            })
            .catch(() => {});
        }
      } catch (err: any) {
        console.error('Gagal mengakses kamera:', err);
        if (!isMounted) return;

        setIsInitializing(false);
        const errMsg = err?.message || String(err);
        if (
          errMsg.includes('NotAllowedError') ||
          errMsg.includes('Permission') ||
          errMsg.includes('denied')
        ) {
          setIsPermissionDenied(true);
          setError('Akses kamera tidak diizinkan oleh peramban (browser) atau sistem.');
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
  }, [isOpen, currentCameraId, retryKey]);

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
    const currentIdx = cameras.findIndex(c => c.id === currentCameraId);
    const nextIndex = (currentIdx + 1) % cameras.length;
    setCurrentCameraId(cameras[nextIndex].id);
  };

  const handleRetryPermission = async () => {
    setIsInitializing(true);
    setError(null);
    setIsPermissionDenied(false);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        stream.getTracks().forEach(t => t.stop());
      }
      setRetryKey(k => k + 1);
    } catch (err: any) {
      setIsInitializing(false);
      setIsPermissionDenied(true);
      setError('Izin kamera belum aktif. Buka pengaturan browser (ikon gembok/pengaturan di bilah URL) lalu ubah izin Kamera menjadi "Izinkan".');
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileScanning(true);
    setError(null);

    try {
      const fileScanner = new Html5Qrcode(fileContainerId, { verbose: false });
      const decodedText = await fileScanner.scanFile(file, true);
      fileScanner.clear();
      setIsFileScanning(false);

      if (decodedText) {
        const clean = decodedText.trim();
        setDetectedCode(clean);
        playBeepSound();
        if (navigator.vibrate) {
          try {
            navigator.vibrate([70, 40, 70]);
          } catch {}
        }
        setTimeout(() => {
          stopAndCleanup();
          onScan(clean);
        }, 400);
      }
    } catch {
      setIsFileScanning(false);
      setError('QR Code / Barcode tidak terdeteksi pada gambar. Pastikan foto jelas dan tidak buram.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    stopAndCleanup();
    onScan(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 print:hidden flex flex-col items-center justify-between bg-black/95 text-white p-4">
      {/* Hidden container for file-based QR scanning */}
      <div id={fileContainerId} className="hidden" />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileScan}
        className="hidden"
      />

      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between pt-2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-emerald-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight text-white">Pindai QR Code Nota</h3>
            <p className="text-[10px] text-neutral-400">
              {cameras.length > 0 && currentCameraId
                ? cameras.find(c => c.id === currentCameraId)?.label || 'Kamera Belakang'
                : 'Deteksi Otomatis'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {cameras.length > 1 && !isPermissionDenied && (
            <button
              onClick={handleSwitchCamera}
              title="Ganti Lensa Kamera"
              aria-label="Ganti Kamera"
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center gap-1 text-[11px] font-medium active:scale-95 transition-all"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              <span>Lensa</span>
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
          className={`w-full h-full overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover ${
            isPermissionDenied || error ? 'hidden' : 'block'
          }`}
        />

        {/* Viewfinder Guide Overlay */}
        {!error && !isInitializing && !detectedCode && !isPermissionDenied && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="relative w-56 h-56 border-2 border-emerald-400/90 rounded-2xl shadow-[0_0_25px_rgba(52,211,153,0.35)] bg-emerald-400/5">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
              <div className="w-full h-[2px] bg-emerald-400 shadow-[0_0_10px_#34d399] absolute top-1/2 -translate-y-1/2 animate-pulse" />
            </div>

            <p className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full mt-3 font-medium backdrop-blur-xs">
              Arahkan kamera ke QR Code nota
            </p>
          </div>
        )}

        {/* Notifikasi Berhasil Terdeteksi */}
        {detectedCode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/90 backdrop-blur-xs z-30 p-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 mb-3 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-xs font-bold text-emerald-200">QR Code Berhasil Terbaca!</p>
            <p className="text-sm font-mono font-bold text-white mt-1 bg-black/50 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              {detectedCode}
            </p>
          </div>
        )}

        {/* Loading Indicator */}
        {(isInitializing || isFileScanning) && !error && !isPermissionDenied && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 gap-2 z-20">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
            <p className="text-xs text-neutral-300">
              {isFileScanning ? 'Membaca gambar foto...' : 'Menghubungkan ke kamera...'}
            </p>
          </div>
        )}

        {/* Tampilan Khusus: Izin Kamera Ditolak / Diblokir */}
        {isPermissionDenied && (
          <div className="absolute inset-0 p-5 flex flex-col items-center justify-center bg-neutral-900/95 text-center gap-3 z-30">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-300 mb-1">Akses Kamera Belum Diizinkan</p>
              <p className="text-[11px] text-neutral-300 leading-relaxed max-w-xs">
                Peramban memblokir akses kamera. Anda bisa meminta izin ulang atau mengunggah foto nota langsung dari galeri:
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 pt-1 max-w-xs">
              <button
                type="button"
                onClick={handleRetryPermission}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Minta Izin Kamera Ulang</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-semibold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pilih Foto / Screenshot QR</span>
              </button>
            </div>

            <p className="text-[10px] text-neutral-500 pt-1 leading-tight">
              💡 Buka ikon gembok di URL peramban &gt; pilih Izin Kamera &gt; Izinkan.
            </p>
          </div>
        )}

        {/* Error Umum Kamera */}
        {error && !isPermissionDenied && (
          <div className="absolute inset-0 p-5 flex flex-col items-center justify-center bg-neutral-900/95 text-center gap-3 z-30">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-300 mb-1">Pemberitahuan Pemindai</p>
              <p className="text-[11px] text-neutral-400 leading-relaxed max-w-xs">{error}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1.5 border border-neutral-700"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unggah Foto</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setRetryKey(k => k + 1);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Alternatif Pemindaian */}
      <div className="w-full max-w-md pb-2 text-center z-10 space-y-2">
        {/* Tombol scan dari file gambar */}
        {!isPermissionDenied && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 px-3 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-800 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pindai dari Foto Galeri / Screenshot</span>
          </button>
        )}

        {/* Input manual sebagai alternatif tercepat jika kamera bermasalah */}
        <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
          <input
            type="text"
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
            placeholder="Atau ketik no. nota manual..."
            className="flex-1 bg-transparent text-xs text-white placeholder-neutral-500 px-2.5 py-1.5 outline-none"
          />
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={!manualCode.trim()}
            className="px-3 py-1.5 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
          >
            <span>Cari</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-medium rounded-xl transition-all"
        >
          Tutup Pemindai
        </button>
      </div>
    </div>
  );
};
