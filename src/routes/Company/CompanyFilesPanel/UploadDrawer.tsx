import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Folder, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";

interface UploadDrawerProps {
  companyId: string;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpload: (request: {
    file: File;
    companyId: string;
    path: string;
    type: string;
  }) => Promise<void>;
  isUploading: boolean;
  existingPaths: string[];
}

export function UploadDrawer({
  companyId,
  companyName,
  isOpen,
  onClose,
  onUpload,
  isUploading,
  existingPaths,
}: UploadDrawerProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [filePath, setFilePath] = React.useState("");
  const [fileType, setFileType] = React.useState("document");
  const [isCreatingNewPath, setIsCreatingNewPath] = React.useState(false);
  const [newPathInput, setNewPathInput] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setFilePath("");
      setFileType("document");
      setIsCreatingNewPath(false);
      setNewPathInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen]);

  function handlePathSelect(value: string) {
    if (value === "__create_new__") {
      setIsCreatingNewPath(true);
      setNewPathInput("");
    } else {
      setFilePath(value);
      setIsCreatingNewPath(false);
    }
  }

  function handleConfirmNewPath() {
    if (newPathInput.trim()) {
      setFilePath(newPathInput.trim());
      setIsCreatingNewPath(false);
      setNewPathInput("");
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      toast.error("Seleziona un file da caricare");
      return;
    }
    if (!filePath.trim()) {
      toast.error("Inserisci un percorso per il file");
      return;
    }
    try {
      await onUpload({
        file: selectedFile,
        companyId,
        path: filePath.trim(),
        type: fileType.trim() || "document",
      });
      toast.success("File caricato con successo");
      onClose();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Errore nel caricamento";
      toast.error(msg);
    }
  }

  const sortedPaths = [...existingPaths].sort();
  const hasExistingPaths = sortedPaths.length > 0;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent
        className="!w-1/2 !max-w-[50vw] h-full"
        data-vaul-drawer-direction="right"
      >
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Carica un nuovo file
          </DrawerTitle>
          <DrawerDescription>
            Carica file per l&apos;azienda {companyName}
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4 space-y-4">
          <div>
            <Label htmlFor="file-input-drawer">File</Label>
            <Input
              id="file-input-drawer"
              type="file"
              ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="mt-1 bg-white border-gray-200 rounded-lg h-10"
            />
            {selectedFile && (
              <p className="text-xs text-muted-foreground mt-1">
                Selezionato: {selectedFile.name}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="file-path-drawer">Percorso</Label>
            {isCreatingNewPath ? (
              <div className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newPathInput}
                    onChange={(e) => setNewPathInput(e.target.value)}
                    placeholder="es: contratti/2024, documenti/fatture"
                    className="flex-1 bg-white border-gray-200 rounded-lg h-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newPathInput.trim())
                        handleConfirmNewPath();
                      else if (e.key === "Escape") {
                        setIsCreatingNewPath(false);
                        setNewPathInput("");
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleConfirmNewPath}
                    disabled={!newPathInput.trim()}
                    className="h-10 px-4 rounded-xl bg-agri-green-500 hover:bg-agri-green-600 text-white"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Conferma
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingNewPath(false);
                      setNewPathInput("");
                    }}
                    className="h-10 px-4 rounded-xl"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Premi Invio per confermare o Esc per annullare
                </p>
              </div>
            ) : (
              <div className="mt-1 space-y-2">
                <Select value={filePath || ""} onValueChange={handlePathSelect}>
                  <SelectTrigger className="w-full h-10 bg-white border-gray-200 rounded-lg">
                    <SelectValue
                      placeholder={
                        hasExistingPaths
                          ? "Seleziona un percorso esistente..."
                          : "Nessun percorso disponibile"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {hasExistingPaths &&
                      sortedPaths.map((path) => (
                        <SelectItem key={path} value={path}>
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4 text-black" />
                            <span>{path}</span>
                          </div>
                        </SelectItem>
                      ))}
                    {hasExistingPaths && (
                      <div className="border-t border-gray-100 my-1" />
                    )}
                    <SelectItem value="__create_new__">
                      <div className="flex items-center gap-2 text-black font-medium">
                        <Plus className="h-4 w-4" />
                        <span>Crea nuovo percorso...</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {filePath && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <Folder className="h-3 w-3 text-black" />
                    <span className="text-xs font-medium text-black">
                      {filePath}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="file-type-drawer">Tipo</Label>
            <Input
              id="file-type-drawer"
              type="text"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              placeholder="contract, document, image, etc."
              className="mt-1 bg-white border-gray-200 rounded-lg h-10"
            />
          </div>
        </div>
        <DrawerFooter>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
              className="rounded-xl"
            >
              Annulla
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile || !filePath.trim()}
              className="rounded-xl bg-agri-green-500 hover:bg-agri-green-600 text-white"
            >
              {isUploading ? (
                <Spinner size={18} ariaLabel="Caricamento file" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isUploading ? "Caricamento..." : "Carica file"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
