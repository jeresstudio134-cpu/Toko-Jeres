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
        JsBarcode(svgRef.current, value.trim(), {
          format: 'CODE128',
          width: 1.5,
          height: 28,
          displayValue: false,
          margin: 0,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        console.warn('Gagal merender barcode dengan Code 128:', err);
      }
    }
  }, [value]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      className={`max-w-full block mx-auto text-black ${className}`}
      style={{ shapeRendering: 'crispEdges' }}
    />
  );
};
