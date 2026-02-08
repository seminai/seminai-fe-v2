import * as React from "react";
import { type CompanyFile, filesApiService } from "@/api/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pencil, Folder, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";

interface EditFileDrawerProps {
  file: CompanyFile;
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => Promise<void>;
  existingPaths: string[];
}

export function EditFileDrawer({
  file,
  isOpen,
  onClose,
  onUpdate,
  existingPaths,
}: EditFileDrawerProps) {
  const [fileName, setFileName] = React.useState(file.name);
  const [filePath, setFilePath] = React.useState(file.path || "");
  const [fileType, setFileType] = React.useState(file.type || "document");
  const [metadata, setMetadata] = React.useState<Record<string, unknown>>(
    () => ({ ...file.metadata }),
  );
  const [isCreatingNewPath, setIsCreatingNewPath] = React.useState(false);
  const [newPathInput, setNewPathInput] = React.useState("");
  const [metadataKey, setMetadataKey] = React.useState("");
  const [metadataValue, setMetadataValue] = React.useState("");

  const prevFileIdRef = React.useRef(file.id);
  if (file.id !== prevFileIdRef.current) {
    prevFileIdRef.current = file.id;
    setFileName(file.name);
    setFilePath(file.path || "");
    setFileType(file.type || "document");
    setMetadata({ ...file.metadata });
    setIsCreatingNewPath(false);
    setNewPathInput("");
    setMetadataKey("");
    setMetadataValue("");
  }

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

  function handleAddMetadata() {
    if (metadataKey.trim() && metadataValue.trim()) {
      setMetadata((prev) => ({
        ...prev,
        [metadataKey.trim()]: metadataValue.trim(),
      }));
      setMetadataKey("");
      setMetadataValue("");
    }
  }

  function handleRemoveMetadata(key: string) {
    setMetadata((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSave() {
    try {
      await filesApiService.updateFile(file.id, {
        name: fileName.trim() !== file.name ? fileName.trim() : undefined,
        type: fileType.trim() !== file.type ? fileType.trim() : undefined,
        path: filePath.trim() !== file.path ? filePath.trim() : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
      toast.success("File aggiornato con successo");
      await onUpdate();
      onClose();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Errore nell'aggiornamento";
      toast.error(msg);
    }
  }

  const otherPaths = existingPaths.filter((p) => p !== file.path);
  const hasOtherPaths = otherPaths.length > 0;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent
        className="!w-1/2 !max-w-[50vw] h-full"
        data-vaul-drawer-direction="right"
      >
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Modifica file
          </DrawerTitle>
          <DrawerDescription>
            Modifica i dettagli del file: {file.name}
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4 space-y-4">
          <div>
            <Label htmlFor="edit-file-name">Nome file</Label>
            <Input
              id="edit-file-name"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="mt-1 bg-white border-gray-200 rounded-lg h-10"
            />
          </div>
          <div>
            <Label htmlFor="edit-file-path">Percorso</Label>
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
              </div>
            ) : (
              <div className="mt-1 space-y-2">
                <Select value={filePath || ""} onValueChange={handlePathSelect}>
                  <SelectTrigger className="w-full h-10 bg-white border-gray-200 rounded-lg">
                    <SelectValue placeholder="Seleziona un percorso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filePath && (
                      <SelectItem value={filePath}>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-black" />
                          <span>{filePath}</span>
                        </div>
                      </SelectItem>
                    )}
                    {hasOtherPaths && (
                      <>
                        {filePath && (
                          <div className="border-t border-gray-100 my-1" />
                        )}
                        {otherPaths.map((path) => (
                          <SelectItem key={path} value={path}>
                            <div className="flex items-center gap-2">
                              <Folder className="h-4 w-4 text-black" />
                              <span>{path}</span>
                            </div>
                          </SelectItem>
                        ))}
                        <div className="border-t border-gray-100 my-1" />
                      </>
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
            <Label htmlFor="edit-file-type">Tipo</Label>
            <Input
              id="edit-file-type"
              type="text"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              placeholder="contract, document, image, etc."
              className="mt-1 bg-white border-gray-200 rounded-lg h-10"
            />
          </div>
          <div>
            <Label>Metadata</Label>
            <div className="mt-1 space-y-2">
              {Object.entries(metadata).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <span className="text-xs font-medium text-black flex-1">
                    <strong>{key}:</strong> {String(value)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMetadata(key)}
                    className="h-6 w-6 p-0 rounded-full text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={metadataKey}
                  onChange={(e) => setMetadataKey(e.target.value)}
                  placeholder="Chiave"
                  className="flex-1 bg-white border-gray-200 rounded-lg h-10"
                />
                <Input
                  type="text"
                  value={metadataValue}
                  onChange={(e) => setMetadataValue(e.target.value)}
                  placeholder="Valore"
                  className="flex-1 bg-white border-gray-200 rounded-lg h-10"
                />
                <Button
                  size="sm"
                  onClick={handleAddMetadata}
                  disabled={!metadataKey.trim() || !metadataValue.trim()}
                  className="h-10 px-4 rounded-xl bg-agri-green-500 hover:bg-agri-green-600 text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <DrawerFooter>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-xl bg-agri-green-500 hover:bg-agri-green-600 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Salva
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
