import * as React from "react";
import { IoCloudUploadOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";

const VALID_EXTENSIONS = [".csv", ".xlsx", ".xls", ".pdf", ".shp", ".dbf", ".shx", ".zip"];

interface FileDropZoneProps {
  onFileSelect: (files: File[]) => void;
  isDisabled: boolean;
}

function isValidFileType(file: File): boolean {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return VALID_EXTENSIONS.includes(extension);
}

export default function FileDropZone({
  onFileSelect,
  isDisabled,
}: FileDropZoneProps): React.ReactElement {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDisabled) setIsDragging(true);
    },
    [isDisabled],
  );

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (isDisabled) return;

      const valid = Array.from(e.dataTransfer.files).filter(isValidFileType);
      if (valid.length > 0) onFileSelect(valid);
    },
    [isDisabled, onFileSelect],
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) onFileSelect(Array.from(files));
    },
    [onFileSelect],
  );

  const handleClick = React.useCallback(() => {
    if (!isDisabled && inputRef.current) inputRef.current.click();
  }, [isDisabled]);

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center w-full max-w-2xl mx-auto",
        "min-h-[400px] p-12 rounded-3xl border-2 border-dashed transition-all duration-300",
        "cursor-pointer",
        isDragging
          ? "border-agri-green-500 bg-agri-green-50/50 scale-[1.02]"
          : "border-neutral-300 hover:border-agri-green-400 hover:bg-neutral-50",
        isDisabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.pdf,.shp,.dbf,.shx,.zip"
        multiple
        onChange={handleInputChange}
        className="hidden"
        disabled={isDisabled}
      />

      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            "flex items-center justify-center w-24 h-24 rounded-full mb-6 transition-colors",
            isDragging ? "bg-agri-green-100" : "bg-neutral-100",
          )}
        >
          <IoCloudUploadOutline
            className={cn(
              "w-12 h-12 transition-colors",
              isDragging ? "text-black" : "text-neutral-400",
            )}
          />
        </div>

        <h3 className="text-xl font-semibold text-neutral-800 mb-2">
          {isDragging ? "Rilascia il file qui" : "Trascina il file qui"}
        </h3>
        <p className="text-neutral-500 mb-4">
          oppure clicca per selezionare un file
        </p>
        <div className="flex items-center gap-2 text-sm text-neutral-400 flex-wrap justify-center">
          <span className="px-2 py-1 bg-neutral-100 rounded-md">.csv</span>
          <span className="px-2 py-1 bg-neutral-100 rounded-md">.xlsx</span>
          <span className="px-2 py-1 bg-neutral-100 rounded-md">.xls</span>
          <span className="px-2 py-1 bg-neutral-100 rounded-md">.pdf</span>
          <span className="px-2 py-1 bg-neutral-100 rounded-md">.shp</span>
          <span className="px-2 py-1 bg-neutral-100 rounded-md">.zip</span>
        </div>
      </div>
    </div>
  );
}
