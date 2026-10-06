import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeComponent: React.FC<QRCodeProps> = ({
  value,
  size = 110,
  className = '',
}) => {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    if (!value) {
      setSvgMarkup('');
      return;
    }

    const cleanValue = value.trim();
    QRCode.toString(cleanValue, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      width: size,
    })
      .then(svg => {
        setSvgMarkup(svg);
      })
      .catch(err => {
        console.warn('Gagal merender QR Code:', err);
      });
  }, [value, size]);

  if (!value || !svgMarkup) return null;

  return (
    <div
      className={`inline-flex items-center justify-center p-2 bg-white rounded-xl shadow-2xs border border-neutral-200/90 print:border-none print:shadow-none print:p-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
};
