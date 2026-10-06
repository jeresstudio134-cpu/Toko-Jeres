import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  className?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({ value, className = '' }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        const cleanValue = value.trim();
        // Render Code 128 dengan Quiet Zone (margin) dan tinggi memadai agar mudah di-scan kamera
        JsBarcode(svgRef.current, cleanValue, {
          format: 'CODE128',
          width: 1.8,
          height: 50,
          displayValue: false,
          margin: 12,
          background: '#ffffff',
          lineColor: '#000000',
        });

        // Buat SVG responsive dengan viewBox agar semua baris kode utuh tanpa terpotong
        const currentSvg = svgRef.current;
        const widthAttr = currentSvg.getAttribute('width');
        const heightAttr = currentSvg.getAttribute('height');
        if (widthAttr && heightAttr) {
          currentSvg.setAttribute('viewBox', `0 0 ${widthAttr} ${heightAttr}`);
          currentSvg.setAttribute('width', '100%');
          currentSvg.removeAttribute('height');
        }
      } catch (err) {
        console.warn('Gagal merender barcode dengan Code 128:', err);
      }
    }
  }, [value]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      className={`w-full max-w-full block mx-auto text-black bg-white ${className}`}
      style={{ shapeRendering: 'crispEdges' }}
    />
  );
};
