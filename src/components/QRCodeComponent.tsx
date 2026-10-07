import React, { useEffect, useState } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export const QRCodeComponent: React.FC<QRCodeProps> = ({
  value,
  size = 120,
  className = '',
  errorCorrectionLevel,
}) => {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    if (!value) {
      setSvgMarkup('');
      return;
    }

    const cleanValue = value.trim();
    // Gunakan 'L' untuk teks panjang agar kepadatan modul QR tidak terlalu rapat sehingga sangat mudah di-scan oleh kamera HP
    const ecl = errorCorrectionLevel || (cleanValue.length > 120 ? 'L' : 'M');
    let isCurrent = true;

    import('qrcode')
      .then(({ default: QRCode }) => {
        return QRCode.toString(cleanValue, {
          type: 'svg',
          margin: 1,
          errorCorrectionLevel: ecl,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          width: size,
        });
      })
      .then(svg => {
        if (!isCurrent) return;
        // Pastikan SVG responsif dan pas dengan lebar cetak struk
        const responsiveSvg = svg.replace('<svg ', '<svg class="max-w-full h-auto" ');
        setSvgMarkup(responsiveSvg);
      })
      .catch(err => {
        if (!isCurrent) return;
        console.warn('Gagal merender QR Code:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [value, size, errorCorrectionLevel]);

  if (!value || !svgMarkup) return null;

  return (
    <div
      className={`inline-flex items-center justify-center p-2 bg-white rounded-xl shadow-2xs border border-neutral-200/90 print:border-none print:shadow-none print:p-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
};
