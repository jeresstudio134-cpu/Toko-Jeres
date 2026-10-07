import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { optimizeImage } from '../utils/cloudinary';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  isDark?: boolean;
  className?: string;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  alt,
  isDark = false,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [errorMap, setErrorMap] = useState<Record<number, boolean>>({});
  const [loadedMap, setLoadedMap] = useState<Record<number, boolean>>({});

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = ref.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (images.length === 0) {
    return (
      <div
        className={`relative w-full aspect-[4/3] max-h-[45vh] overflow-hidden flex flex-col items-center justify-center ${
          isDark ? 'bg-neutral-800 text-neutral-500' : 'bg-neutral-100 text-neutral-400'
        } ${className}`}
      >
        <Tag className="w-12 h-12 stroke-[1.5] mb-2 opacity-35" />
        <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
          Belum Ada Foto
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full aspect-[4/3] max-h-[45vh] overflow-hidden bg-neutral-100 dark:bg-neutral-800 ${className}`}
    >
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        {images.map((src, i) => (
          <div key={`${src}-${i}`} className="relative w-full h-full shrink-0 snap-center overflow-hidden">
            {errorMap[i] ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 p-4 text-center select-none">
                <Tag className="w-12 h-12 stroke-[1.5] mb-2 opacity-35" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
                  Belum Ada Foto
                </span>
              </div>
            ) : (
              <img
                src={optimizeImage(src, 800, 600)}
                alt={`${alt} ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                onLoad={() => setLoadedMap(prev => ({ ...prev, [i]: true }))}
                className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-200 ${
                  loadedMap[i] ? 'opacity-100' : 'opacity-0'
                }`}
                onError={() => setErrorMap(prev => ({ ...prev, [i]: true }))}
              />
            )}
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {/* Panah (desktop / touch) */}
          {index > 0 && (
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className="z-10 absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
              aria-label="Foto sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {index < images.length - 1 && (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="z-10 absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
              aria-label="Foto berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Penanda posisi */}
          <div className="z-10 absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Foto ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
          <span className="z-10 absolute top-2 left-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
            {index + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
};