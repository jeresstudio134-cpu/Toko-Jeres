import React from 'react';
import { QRCodeComponent } from './QRCodeComponent';

interface BarcodeProps {
  value: string;
  className?: string;
  size?: number;
}

export const Barcode: React.FC<BarcodeProps> = ({ value, className = '', size = 110 }) => {
  return <QRCodeComponent value={value} size={size} className={className} />;
};
