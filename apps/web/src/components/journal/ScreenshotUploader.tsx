import { useCallback, useRef, useState } from "react";
import { ImagePlus, X, Sparkles } from "lucide-react";
import clsx from "clsx";
import { tradeImageUrl, type TradeImage } from "../../lib/journalApi";

export interface StagedImage {
  tempId: string;
  dataUrl: string;
  kind: TradeImage["kind"];
}

const KIND_LABELS: Record<TradeImage["kind"], string> = {
  before: "Vorher",
  after: "Nachher",
  htf: "HTF",
  ltf: "LTF",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ScreenshotUploader({
  savedImages,
  stagedImages,
  onAddStaged,
  onRemoveStaged,
  onRemoveSaved,
  onAnalyze,
  kiAvailable,
  analyzing,
}: {
  savedImages: TradeImage[];
  stagedImages: StagedImage[];
  onAddStaged: (image: StagedImage) => void;
  onRemoveStaged: (tempId: string) => void;
  onRemoveSaved: (id: number) => void;
  onAnalyze: (dataUrl: string) => void;
  kiAvailable: boolean;
  analyzing: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await fileToDataUrl(file);
        onAddStaged({ tempId: crypto.randomUUID(), dataUrl, kind: "before" });
      }
    },
    [onAddStaged],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = Array.from(e.clipboardData.items)
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);
      if (files.length > 0) {
        e.preventDefault();
        void addFiles(files);
      }
    },
    [addFiles],
  );

  return (
    <div>
      <div
        onPaste={handlePaste}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        tabIndex={0}
        className={clsx(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors",
          dragOver ? "border-cyan bg-cyan/5" : "border-line hover:border-cyan/40",
        )}
      >
        <ImagePlus size={22} className="text-text-faint" />
        <p className="text-sm text-text-muted">
          Screenshot einfügen (<kbd className="font-mono-num">Strg+V</kbd>), hierher ziehen oder klicken
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && void addFiles(e.target.files)}
        />
      </div>

      {(savedImages.length > 0 || stagedImages.length > 0) && (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {savedImages.map((img) => (
            <div key={img.id} className="relative group">
              <img src={tradeImageUrl(img.path)} className="rounded-lg aspect-video object-cover w-full" />
              <span className="absolute bottom-1 left-1 text-[10px] bg-bg0/80 px-1.5 py-0.5 rounded text-text-muted">
                {KIND_LABELS[img.kind]}
              </span>
              <button
                onClick={() => onRemoveSaved(img.id)}
                className="absolute top-1 right-1 bg-bg0/80 rounded-full p-0.5 text-text-faint hover:text-red opacity-0 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
              {kiAvailable && (
                <button
                  onClick={() => onAnalyze(tradeImageUrl(img.path))}
                  disabled={analyzing}
                  title="Mit KI auslesen"
                  className="absolute top-1 left-1 bg-bg0/80 rounded-full p-0.5 text-cyan opacity-0 group-hover:opacity-100 disabled:opacity-50"
                >
                  <Sparkles size={12} />
                </button>
              )}
            </div>
          ))}
          {stagedImages.map((img) => (
            <div key={img.tempId} className="relative group">
              <img src={img.dataUrl} className="rounded-lg aspect-video object-cover w-full" />
              <span className="absolute bottom-1 left-1 text-[10px] bg-bg0/80 px-1.5 py-0.5 rounded text-text-muted">
                {KIND_LABELS[img.kind]} (neu)
              </span>
              <button
                onClick={() => onRemoveStaged(img.tempId)}
                className="absolute top-1 right-1 bg-bg0/80 rounded-full p-0.5 text-text-faint hover:text-red opacity-0 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
              {kiAvailable && (
                <button
                  onClick={() => onAnalyze(img.dataUrl)}
                  disabled={analyzing}
                  title="Mit KI auslesen"
                  className="absolute top-1 left-1 bg-bg0/80 rounded-full p-0.5 text-cyan opacity-0 group-hover:opacity-100 disabled:opacity-50"
                >
                  <Sparkles size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!kiAvailable && (savedImages.length > 0 || stagedImages.length > 0) && (
        <p className="text-text-faint text-xs mt-1">
          „Mit KI auslesen" nicht verfügbar – ANTHROPIC_API_KEY fehlt in .env.
        </p>
      )}
    </div>
  );
}
