import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImagePlaceholder } from './types';

interface ResizableImagePreviewProps {
  image: ImagePlaceholder;
  onSizeChange: (width: number, height: number) => void;
}

export default function ResizableImagePreview({
  image,
  onSizeChange,
}: ResizableImagePreviewProps) {
  const { t } = useTranslation();
  const [isResizing, setIsResizing] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: image.width || 300,
    height: image.height || 200,
  });
  const imageRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startDimensions = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (!isResizing) {
      setDimensions({
        width: image.width || 300,
        height: image.height || 200,
      });
    }
  }, [image.width, image.height, isResizing]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;

      const newWidth = Math.max(100, startDimensions.current.width + deltaX);
      const newHeight = Math.max(75, startDimensions.current.height + deltaY);

      setDimensions({ width: newWidth, height: newHeight });
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    if (!isResizing) return;

    setIsResizing(false);
    onSizeChange(dimensions.width, dimensions.height);

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [
    isResizing,
    dimensions.width,
    dimensions.height,
    onSizeChange,
    handleMouseMove,
  ]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startDimensions.current = { ...dimensions };
  };

  return (
    <div
      ref={imageRef}
      className="relative inline-block border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <img
        src={
          image.file
            ? URL.createObjectURL(image.file)
            : image.url || "/placeholder.svg"
        }
        alt={image.alt || ` `}
        className="w-full h-full object-cover rounded"
        draggable={false}
        style={{
          userSelect: "none",
          pointerEvents: isResizing ? "none" : "auto",
        }}
      />

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize hover:bg-blue-600 transition-colors z-10"
        onMouseDown={handleMouseDown}
        title={t("drag_to_resize")}
        style={{
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <div className="absolute inset-1 border-r border-b border-white opacity-70"></div>
      </div>

      {/* Size indicator */}
      <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none">
        {Math.round(dimensions.width)} × {Math.round(dimensions.height)}
      </div>

      {isResizing && (
        <div
          className="absolute inset-0 bg-transparent cursor-se-resize z-20"
          style={{ userSelect: "none" }}
        />
      )}
    </div>
  );
}

