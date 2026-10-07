import React, { useState, useEffect } from 'react';
import { CartItem } from '../types';
import { formatRupiah } from '../utils/format';
import { getItemArea } from '../utils/pricing';
import {
  X,
  Tag,
  Ruler,
  Calculator,
  RotateCcw,
  Check,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface EditPriceModalProps {
  item: CartItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: {
    customPrice?: number;
    length?: number;
    width?: number;
    dimensionUnit?: 'm' | 'cm';
    note?: string;
  }) => void;
  theme?: 'light' | 'dark';
}

export const EditPriceModal: React.FC<EditPriceModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  const [priceInput, setPriceInput] = useState<string>('');
  const [enableDimension, setEnableDimension] = useState<boolean>(false);
  const [lengthInput, setLengthInput] = useState<string>('');
  const [widthInput, setWidthInput] = useState<string>('');
  const [dimensionUnit, setDimensionUnit] = useState<'m' | 'cm'>('m');
  const [noteInput, setNoteInput] = useState<string>('');

  useEffect(() => {
    if (item && isOpen) {
      setPriceInput(
        item.customPrice !== undefined
          ? item.customPrice.toString()
          : item.product.price.toString()
      );
      const hasDim = !!(item.length && item.width && item.length > 0 && item.width > 0);
      setEnableDimension(hasDim);
      setLengthInput(item.length ? item.length.toString() : '');
      setWidthInput(item.width ? item.width.toString() : '');
      setDimensionUnit(item.dimensionUnit || 'm');
      setNoteInput(item.note || '');
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const currentUnitPrice = Number(priceInput) || 0;
  const numLength = parseFloat(lengthInput) || 0;
  const numWidth = parseFloat(widthInput) || 0;

  const area = enableDimension ? getItemArea({ length: numLength, width: numWidth, dimensionUnit }) : null;
  const pricePerItem = area !== null ? Math.round(currentUnitPrice * area) : currentUnitPrice;
  const totalCalculated = pricePerItem * item.quantity;

  const handleResetPrice = () => {
    setPriceInput(item.product.price.toString());
  };

  const handleQuickPreset = (p: number, l: number, unit: 'm' | 'cm' = 'm') => {
    setEnableDimension(true);
    setLengthInput(p.toString());
    setWidthInput(l.toString());
    setDimensionUnit(unit);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPrice = Number(priceInput);
    const isCustomPrice = !isNaN(finalPrice) && finalPrice !== item.product.price;

    onSave({
      customPrice: isCustomPrice ? Math.max(0, finalPrice) : undefined,
      length: enableDimension && numLength > 0 ? numLength : undefined,
      width: enableDimension && numWidth > 0 ? numWidth : undefined,
      dimensionUnit: enableDimension ? dimensionUnit : undefined,
      note: noteInput.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-150 animate-in fade-in">
      <div
        className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto transition-all duration-150 animate-in fade-in zoom-in-95 ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Edit Harga & Ukuran</h3>
              <p className="text-[11px] text-neutral-500 truncate max-w-[200px]">
                {item.product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* 1. Edit Harga Satuan */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>Harga Satuan (Rp)</span>
              </label>
              {Number(priceInput) !== item.product.price && (
                <button
                  type="button"
                  onClick={handleResetPrice}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset (Rp {item.product.price.toLocaleString('id-ID')})</span>
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="500"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value)}
                placeholder={item.product.price.toString()}
                className={`w-full text-sm font-bold pl-10 pr-3 py-2.5 rounded-xl border outline-none font-mono ${
                  isDark
                    ? 'bg-neutral-800 border-neutral-700 text-white focus:border-neutral-500'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-neutral-900'
                }`}
                required
              />
            </div>
            <p className="text-[10px] text-neutral-400">
              Harga master katalog:{' '}
              <strong className="text-neutral-600 dark:text-neutral-300">
                {formatRupiah(item.product.price)}
              </strong>
            </p>
          </div>

          {/* 2. Fitur Perkalian Panjang x Lebar (Dimensi) */}
          <div
            className={`p-3.5 rounded-2xl border space-y-3 transition-all ${
              enableDimension
                ? isDark
                  ? 'bg-blue-950/30 border-blue-800/80'
                  : 'bg-blue-50/60 border-blue-200'
                : isDark
                ? 'bg-neutral-850/60 border-neutral-800'
                : 'bg-neutral-50 border-neutral-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <label
                htmlFor="toggle-dim"
                className="font-bold flex items-center gap-1.5 cursor-pointer select-none text-neutral-800 dark:text-neutral-200"
              >
                <Ruler className="w-4 h-4 text-blue-500" />
                <span>Hitung Panjang × Lebar (P × L)</span>
              </label>
              <input
                id="toggle-dim"
                type="checkbox"
                checked={enableDimension}
                onChange={e => setEnableDimension(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            {enableDimension && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                <p className="text-[11px] text-neutral-500 leading-tight">
                  Cocok untuk spanduk, banner, kain, stiker, kaca, atau bahan custom per meter/cm.
                </p>

                {/* Pilihan Satuan (Meter / Centimeter) */}
                <div className="flex items-center gap-1 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-xl text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDimensionUnit('m')}
                    className={`flex-1 py-1 rounded-lg font-bold transition-colors ${
                      dimensionUnit === 'm'
                        ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    Meter (m)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDimensionUnit('cm')}
                    className={`flex-1 py-1 rounded-lg font-bold transition-colors ${
                      dimensionUnit === 'cm'
                        ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    Centimeter (cm)
                  </button>
                </div>

                {/* Input Panjang dan Lebar */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-neutral-500">
                      Panjang ({dimensionUnit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={lengthInput}
                      onChange={e => setLengthInput(e.target.value)}
                      placeholder={dimensionUnit === 'm' ? '2.5' : '250'}
                      className={`w-full text-xs font-mono font-bold p-2 rounded-xl border outline-none ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-white'
                          : 'bg-white border-neutral-200 text-neutral-900'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-neutral-500">
                      Lebar ({dimensionUnit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={widthInput}
                      onChange={e => setWidthInput(e.target.value)}
                      placeholder={dimensionUnit === 'm' ? '1.2' : '120'}
                      className={`w-full text-xs font-mono font-bold p-2 rounded-xl border outline-none ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-white'
                          : 'bg-white border-neutral-200 text-neutral-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Quick Presets for banners */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-neutral-400">Preset:</span>
                  {[
                    { label: '2 × 1 m', p: 2, l: 1 },
                    { label: '3 × 1 m', p: 3, l: 1 },
                    { label: '2.5 × 1.5 m', p: 2.5, l: 1.5 },
                    { label: '4 × 1 m', p: 4, l: 1 },
                  ].map(pre => (
                    <button
                      key={pre.label}
                      type="button"
                      onClick={() => handleQuickPreset(pre.p, pre.l, 'm')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono border active:scale-95 transition-all ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100 shadow-2xs'
                      }`}
                    >
                      {pre.label}
                    </button>
                  ))}
                </div>

                {/* Calculation Preview Card */}
                {area !== null && area > 0 && (
                  <div
                    className={`p-2.5 rounded-xl border space-y-1 text-[11px] ${
                      isDark
                        ? 'bg-neutral-900 border-blue-900/60 text-neutral-300'
                        : 'bg-white border-blue-100 text-neutral-800 shadow-2xs'
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Luas:</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {numLength} × {numWidth} {dimensionUnit} ={' '}
                        {Number.isInteger(area) ? area : area.toFixed(2)} m²
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Harga per lembar:</span>
                      <span className="font-mono font-semibold">
                        {formatRupiah(currentUnitPrice)} ×{' '}
                        {Number.isInteger(area) ? area : area.toFixed(2)} m² ={' '}
                        <strong className="text-neutral-900 dark:text-white">
                          {formatRupiah(pricePerItem)}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Catatan Khusus Item */}
          <div className="space-y-1">
            <label className="font-semibold flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              <span>Catatan Pesanan (Opsional)</span>
            </label>
            <input
              type="text"
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder="Contoh: Mata ayam 4 sudut / Potong rapi / dll."
              className={`w-full text-xs p-2 rounded-xl border outline-none ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 text-white'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white'
              }`}
            />
          </div>

          {/* Summary Box */}
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-neutral-800/80 border-neutral-700' : 'bg-neutral-100 border-neutral-200'
            }`}
          >
            <div>
              <p className="text-[10px] text-neutral-500">
                Subtotal Item ({item.quantity} pcs):
              </p>
              <p className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatRupiah(totalCalculated)}
              </p>
            </div>
            <div className="text-right text-[10px] text-neutral-400">
              {area !== null ? (
                <span>
                  {area.toFixed(2)} m² × {item.quantity} pcs
                </span>
              ) : (
                <span>{item.quantity} pcs</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl font-bold border transition-colors ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
