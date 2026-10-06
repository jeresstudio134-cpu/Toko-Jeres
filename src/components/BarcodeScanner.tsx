import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Camera,
  AlertCircle,
  RefreshCw,
  SwitchCamera,
  CheckCircle2,
  Image as ImageIcon,
  ShieldAlert,
} from 'lucide-react';
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedText: string) => void;
  theme?: 'light' | 'dark';
}

type CameraState =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'denied'
  | 'error';

const playBeepSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as any).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + 0.12
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Audio boleh gagal karena policy browser.
  }
};

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [cameraState, setCameraState] =
    useState<CameraState>('idle');

  const [error, setError] = useState<string | null>(null);

  const [cameras, setCameras] = useState<
    { id: string; label: string }[]
  >([]);

  const [currentCameraId, setCurrentCameraId] =
    useState<string | null>(null);

  const [detectedCode, setDetectedCode] =
    useState<string | null>(null);

  const [isFileScanning, setIsFileScanning] =
    useState(false);

  

  const html5QrCodeRef =
    useRef<Html5Qrcode | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const hasDetectedRef = useRef(false);

  const isMountedRef = useRef(false);

  const scannerContainerId =
    'barcode-scanner-viewport';

  const fileContainerId =
    'barcode-file-viewport';

  /**
   * Bersihkan scanner dengan aman.
   */
  const stopAndCleanup = useCallback(async () => {
    const scanner = html5QrCodeRef.current;

    if (!scanner) return;

    html5QrCodeRef.current = null;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (err) {
      console.warn(
        'Scanner stop warning:',
        err
      );
    }

    try {
      scanner.clear();
    } catch (err) {
      console.warn(
        'Scanner clear warning:',
        err
      );
    }
  }, []);

  /**
   * Menentukan error kamera yang lebih jelas.
   */
  const getCameraErrorMessage = (
    err: any
  ): {
    denied: boolean;
    message: string;
  } => {
    const name = err?.name || '';
    const message = String(
      err?.message || err || ''
    ).toLowerCase();

    if (
      name === 'NotAllowedError' ||
      name === 'PermissionDeniedError' ||
      message.includes('permission') ||
      message.includes('notallowed') ||
      message.includes('denied')
    ) {
      return {
        denied: true,
        message:
          'Akses kamera diblokir oleh browser atau pengaturan perangkat.',
      };
    }

    if (
      name === 'NotFoundError' ||
      name === 'DevicesNotFoundError'
    ) {
      return {
        denied: false,
        message:
          'Kamera tidak ditemukan pada perangkat ini.',
      };
    }

    if (
      name === 'NotReadableError' ||
      name === 'TrackStartError'
    ) {
      return {
        denied: false,
        message:
          'Kamera sedang digunakan aplikasi lain. Tutup aplikasi yang menggunakan kamera lalu coba lagi.',
      };
    }

    if (
      name === 'OverconstrainedError'
    ) {
      return {
        denied: false,
        message:
          'Kamera belakang tidak dapat digunakan. Coba ganti kamera.',
      };
    }

    if (
      !window.isSecureContext
    ) {
      return {
        denied: true,
        message:
          'Kamera membutuhkan HTTPS atau localhost. Pastikan aplikasi dibuka melalui HTTPS.',
      };
    }

    return {
      denied: false,
      message:
        'Kamera tidak dapat diakses. Periksa izin kamera dan pastikan kamera tidak sedang digunakan aplikasi lain.',
    };
  };

  /**
   * Ambil daftar kamera setelah permission diberikan.
   */
  const loadCameras = useCallback(async () => {
    try {
      const devices =
        await Html5Qrcode.getCameras();

      if (!devices || devices.length === 0) {
        setCameras([]);
        return;
      }

      const normalized = devices.map(
        (device, index) => ({
          id: device.id,
          label:
            device.label ||
            `Kamera ${index + 1}`,
        })
      );

      setCameras(normalized);

      // Jangan memaksa kamera pertama.
      // Biarkan facingMode environment memilih kamera belakang.
      if (!currentCameraId) {
        const backCamera =
          normalized.find((camera) =>
            /back|rear|environment|belakang/i.test(
              camera.label
            )
          );

        if (backCamera) {
          setCurrentCameraId(
            backCamera.id
          );
        }
      }
    } catch (err) {
      console.warn(
        'Tidak dapat mengambil daftar kamera:',
        err
      );
    }
  }, [currentCameraId]);

  /**
   * Start Html5Qrcode.
   */
const startScanner = async (preferredCameraId?: string | null) => {
  if (!isOpen) return;

  await stopAndCleanup();

  setCameraState('initializing');
  setError(null);
  setDetectedCode(null);
  hasDetectedRef.current = false;

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        'Browser tidak mendukung akses kamera.'
      );
    }

    // 1. Minta permission kamera terlebih dahulu
    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

    // Setelah permission berhasil, matikan stream sementara
    stream.getTracks().forEach(track => {
      track.stop();
    });

    // 2. Ambil semua kamera
    const devices =
      await Html5Qrcode.getCameras();

    if (!devices || devices.length === 0) {
      throw new Error(
        'Kamera tidak ditemukan.'
      );
    }

    const cameraList = devices.map(
      (device, index) => ({
        id: device.id,
        label:
          device.label ||
          `Kamera ${index + 1}`,
      })
    );

    setCameras(cameraList);

    // 3. Cari kamera belakang
    const rearCamera =
      cameraList.find(camera =>
        /back|rear|environment|belakang|trase|main/i.test(
          camera.label
        )
      );

    // Kalau kamera belakang ditemukan gunakan itu.
    // Kalau tidak, gunakan kamera terakhir sebagai fallback.
    const chosenCamera = preferredCameraId
      ? cameraList.find(camera => camera.id === preferredCameraId)
      : undefined;

    const selectedCamera =
      chosenCamera ||
      rearCamera ||
      cameraList[cameraList.length - 1];

    setCurrentCameraId(
      selectedCamera.id
    );

    console.log(
      'Kamera tersedia:',
      cameraList
    );

    console.log(
      'Kamera dipilih:',
      selectedCamera
    );

    // 4. Buat scanner
    const scanner =
      new Html5Qrcode(
        scannerContainerId,
        {
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
        }
      );

    html5QrCodeRef.current = scanner;

    // 5. START DENGAN DEVICE ID KAMERA BELAKANG
    await scanner.start(
      selectedCamera.id,
      {
        fps: 15,

        qrbox: (
          viewfinderWidth,
          viewfinderHeight
        ) => {
          const edge = Math.floor(
            Math.min(
              viewfinderWidth,
              viewfinderHeight
            ) * 0.75
          );

          return {
            width: edge,
            height: edge,
          };
        },

        aspectRatio: 1,
      },

      decodedText => {
        if (hasDetectedRef.current) {
          return;
        }

        hasDetectedRef.current = true;

        const cleanCode =
          decodedText.trim();

        setDetectedCode(cleanCode);

        playBeepSound();

        if (navigator.vibrate) {
          try {
            navigator.vibrate([
              70,
              40,
              70,
            ]);
          } catch {}
        }

        setTimeout(async () => {
          await stopAndCleanup();
          onScan(cleanCode);
        }, 400);
      },

      () => {
        // frame gagal dibaca → abaikan
      }
    );

    setCameraState('ready');
    setError(null);

  } catch (err: any) {
    console.error(
      'Gagal membuka kamera:',
      err
    );

    await stopAndCleanup();

    const name = err?.name || '';
    const message =
      String(
        err?.message || err
      );

    if (
      name === 'NotAllowedError' ||
      message
        .toLowerCase()
        .includes('permission')
    ) {
      setCameraState('denied');

      setError(
        'Akses kamera ditolak. Izinkan kamera melalui pengaturan browser.'
      );
    } else {
      setCameraState('error');

      setError(
        message ||
          'Kamera tidak dapat digunakan.'
      );
    }
  }
};

  /**
   * Saat modal dibuka.
   */
  useEffect(() => {
    isMountedRef.current =
      true;

    if (!isOpen) {
      stopAndCleanup();

      setCameraState('idle');
      setError(null);
      setDetectedCode(null);
      setCameras([]);
      setCurrentCameraId(null);

      return () => {
        isMountedRef.current =
          false;
      };
    }

    hasDetectedRef.current =
      false;

    setError(null);
    setDetectedCode(null);
    setCameraState(
      'initializing'
    );

    /**
     * Jangan menunggu currentCameraId.
     * Gunakan kamera belakang terlebih dahulu.
     */
    startScanner();

    return () => {
      isMountedRef.current =
        false;

      stopAndCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /**
   * Ganti kamera.
   *
   * Kita restart scanner dengan camera ID baru.
   */
  const handleSwitchCamera =
    async () => {
      if (cameras.length <= 1)
        return;

      const currentIndex =
        cameras.findIndex(
          (camera) =>
            camera.id ===
            currentCameraId
        );

      const nextIndex =
        currentIndex < 0
          ? 0
          : (currentIndex + 1) %
            cameras.length;

      const nextCamera =
        cameras[nextIndex];

      if (!nextCamera) return;

      setCurrentCameraId(
        nextCamera.id
      );

      await startScanner(
        nextCamera.id
      );
    };

  /**
   * Request permission ulang.
   */
  const handleRetryPermission =
    async () => {
      setError(null);
      setCameraState(
        'initializing'
      );

      /**
       * Cek apakah permission API tersedia.
       */
      try {
        if (
          'permissions' in navigator &&
          (navigator as any)
            .permissions?.query
        ) {
          try {
            const permission =
              await (
                navigator as any
              ).permissions.query({
                name: 'camera',
              });

            console.log(
              'Camera permission:',
              permission.state
            );

            /**
             * Jika sudah denied,
             * browser biasanya tidak akan
             * menampilkan popup lagi.
             */
            if (
              permission.state ===
              'denied'
            ) {
              setCameraState(
                'denied'
              );

              setError(
                'Izin kamera sedang diblokir. Klik ikon gembok/pengaturan di address bar browser, ubah Kamera menjadi Izinkan, lalu coba lagi.'
              );

              return;
            }
          } catch {
            // Browser tertentu tidak mendukung
            // Permissions API untuk camera.
          }
        }
      } catch {}

      /**
       * Request permission langsung.
       */
      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: {
                  ideal: 'environment',
                },
              },
              audio: false,
            }
          );

        stream
          .getTracks()
          .forEach((track) => {
            try {
              track.stop();
            } catch {}
          });

        setCameraState(
          'initializing'
        );

        /**
         * Mulai scanner setelah permission berhasil.
         */
        await startScanner(
          currentCameraId
        );
      } catch (err: any) {
        console.error(
          'Permission kamera gagal:',
          err
        );

        const result =
          getCameraErrorMessage(err);

        setCameraState(
          result.denied
            ? 'denied'
            : 'error'
        );

        setError(
          result.denied
            ? 'Izin kamera belum aktif. Buka ikon 🔒 di address bar browser → Kamera → Izinkan, kemudian tekan tombol ini lagi.'
            : result.message
        );
      }
    };

  /**
   * Scan QR dari gambar.
   */
  const handleFileScan =
    async (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        e.target.files?.[0];

      if (!file) return;

      setIsFileScanning(true);
      setError(null);

      /**
       * Hentikan kamera sementara.
       */
      await stopAndCleanup();

      try {
        const fileScanner =
          new Html5Qrcode(
            fileContainerId,
            {
              verbose: false,
            }
          );

        const decodedText =
          await fileScanner.scanFile(
            file,
            true
          );

        try {
          fileScanner.clear();
        } catch {}

        setIsFileScanning(false);

        if (decodedText) {
          const clean =
            decodedText.trim();

          setDetectedCode(clean);

          playBeepSound();

          if (
            navigator.vibrate
          ) {
            try {
              navigator.vibrate([
                70,
                40,
                70,
              ]);
            } catch {}
          }

          setTimeout(() => {
            onScan(clean);
          }, 400);
        }
      } catch (err) {
        console.error(
          'Gagal membaca QR dari gambar:',
          err
        );

        setIsFileScanning(false);

        setError(
          'QR Code / Barcode tidak terdeteksi pada gambar. Pastikan QR terlihat jelas, tidak buram, dan seluruh QR masuk ke foto.'
        );
      } finally {
        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            '';
        }
      }
    };

  

  if (!isOpen) {
    return null;
  }

  const isPermissionDenied =
    cameraState === 'denied';

  const isInitializing =
    cameraState ===
    'initializing';

  const isCameraReady =
    cameraState === 'ready';

  return (
    <div className="fixed inset-0 z-[9999] print:hidden flex flex-col items-center justify-between bg-black/95 text-white p-4">

      {/* Hidden container untuk scan gambar */}
      <div
        id={fileContainerId}
        className="hidden"
      />

      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={
          handleFileScan
        }
        className="hidden"
      />

      {/* HEADER */}
      <div className="w-full max-w-md flex items-center justify-between pt-2 z-10">

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-emerald-400">
            <Camera className="w-4 h-4" />
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-tight text-white">
              Pindai QR Code Nota
            </h3>

            <p className="text-[10px] text-neutral-400">
              {currentCameraId &&
              cameras.length > 0
                ? cameras.find(
                    (camera) =>
                      camera.id ===
                      currentCameraId
                  )?.label ||
                  'Kamera'
                : 'Deteksi Otomatis'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">

          {cameras.length > 1 &&
            isCameraReady &&
            !detectedCode && (
              <button
                type="button"
                onClick={
                  handleSwitchCamera
                }
                title="Ganti Kamera"
                aria-label="Ganti Kamera"
                className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center gap-1 text-[11px] font-medium active:scale-95 transition-all"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span>Lensa</span>
              </button>
            )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemindai"
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SCANNER */}
      <div className="relative w-full max-w-sm flex-1 flex flex-col items-center justify-center my-3 overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl">

        {/* Html5Qrcode mount */}
        <div
          id={scannerContainerId}
          className={`w-full h-full overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover ${
            isPermissionDenied ||
            error
              ? 'hidden'
              : 'block'
          }`}
        />

        {/* QR Guide */}
        {isCameraReady &&
          !detectedCode &&
          !error &&
          !isPermissionDenied && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">

              <div className="relative w-56 h-56 border-2 border-emerald-400/90 rounded-2xl shadow-[0_0_25px_rgba(52,211,153,0.35)] bg-emerald-400/5">

                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />

                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />

                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />

                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                <div className="w-full h-[2px] bg-emerald-400 shadow-[0_0_10px_#34d399] absolute top-1/2 -translate-y-1/2 animate-pulse" />
              </div>

              <p className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full mt-3 font-medium backdrop-blur-sm">
                Arahkan kamera ke QR Code nota
              </p>
            </div>
          )}

        {/* LOADING */}
        {(isInitializing ||
          isFileScanning) &&
          !error &&
          !isPermissionDenied && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 gap-2 z-20">

              <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />

              <p className="text-xs text-neutral-300">
                {isFileScanning
                  ? 'Membaca gambar foto...'
                  : 'Meminta akses kamera...'}
              </p>
            </div>
          )}

        {/* BERHASIL */}
        {detectedCode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/90 backdrop-blur-sm z-30 p-4 text-center">

            <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 mb-3 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <p className="text-xs font-bold text-emerald-200">
              QR Code Berhasil Terbaca!
            </p>

            <p className="text-sm font-mono font-bold text-white mt-1 bg-black/50 px-3 py-1.5 rounded-xl border border-emerald-500/30 break-all">
              {detectedCode}
            </p>
          </div>
        )}

        {/* PERMISSION DENIED */}
        {isPermissionDenied && (
          <div className="absolute inset-0 p-5 flex flex-col items-center justify-center bg-neutral-900/95 text-center gap-3 z-30">

            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs font-bold text-amber-300 mb-1">
                Akses Kamera Belum Diizinkan
              </p>

              <p className="text-[11px] text-neutral-300 leading-relaxed max-w-xs">
                {error ||
                  'Browser memblokir akses kamera. Izinkan kamera melalui pengaturan browser.'}
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 pt-1 max-w-xs">

              <button
                type="button"
                onClick={
                  handleRetryPermission
                }
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />

                <span>
                  Minta Izin Kamera Ulang
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="w-full py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />

                <span>
                  Pilih Foto / Screenshot QR
                </span>
              </button>
            </div>

            <p className="text-[10px] text-neutral-500 pt-1 leading-tight">
              💡 Klik ikon 🔒 di address bar →
              Kamera → Izinkan → refresh halaman.
            </p>
          </div>
        )}

        {/* ERROR */}
        {cameraState === 'error' &&
          error &&
          !isPermissionDenied && (
            <div className="absolute inset-0 p-5 flex flex-col items-center justify-center bg-neutral-900/95 text-center gap-3 z-30">

              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs font-bold text-rose-300 mb-1">
                  Pemberitahuan Pemindai
                </p>

                <p className="text-[11px] text-neutral-400 leading-relaxed max-w-xs">
                  {error}
                </p>
              </div>

              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1.5 border border-neutral-700"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Unggah Foto
                </button>

                <button
                  type="button"
                  onClick={
                    handleRetryPermission
                  }
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          )}
      </div>

      {/* BOTTOM */}
      <div className="w-full max-w-md pb-2 text-center z-10 space-y-2">

        {/* Scan dari galeri */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
        >
          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pindai dari Foto Galeri / Screenshot</span>
        </button>

        {/* Tutup */}
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
