import * as React from "react";
import { type CompanyFile, filesApiService } from "@/api/files";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { FileSystemTree } from "./FileSystemTree";
import { FileViewer } from "./FileViewer";
import { UploadDrawer } from "./UploadDrawer";
import { EditFileDrawer } from "./EditFileDrawer";
import { getUniquePaths } from "./types";

interface CompanyFilesPanelProps {
  companyId: string;
  companyName: string;
  files: CompanyFile[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => Promise<void>;
  onUpload: (request: {
    file: File;
    companyId: string;
    path: string;
    type: string;
  }) => Promise<void>;
  isUploading: boolean;
  onUpdateFileLocally: (fileId: string, updates: Partial<CompanyFile>) => void;
}

export function CompanyFilesPanel({
  companyId,
  companyName,
  files,
  isLoading,
  isError,
  error,
  onRetry,
  onUpload,
  isUploading,
  onUpdateFileLocally,
}: CompanyFilesPanelProps) {
  const [viewingFile, setViewingFile] = React.useState<CompanyFile | null>(
    null,
  );
  const [isViewerOpen, setIsViewerOpen] = React.useState(false);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = React.useState(false);
  const [editingFile, setEditingFile] = React.useState<CompanyFile | null>(
    null,
  );
  const [isEditDrawerOpen, setIsEditDrawerOpen] = React.useState(false);

  const existingPaths = React.useMemo(() => getUniquePaths(files), [files]);

  function handleViewFile(file: CompanyFile) {
    setViewingFile(file);
    setIsViewerOpen(true);
  }

  function handleCloseViewer() {
    setIsViewerOpen(false);
    setViewingFile(null);
  }

  function handleDownloadFile(file: CompanyFile) {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleEditFile(file: CompanyFile) {
    setEditingFile(file);
    setIsEditDrawerOpen(true);
  }

  function handleCloseEditDrawer() {
    setIsEditDrawerOpen(false);
    setEditingFile(null);
  }

  async function handleDeleteFile(file: CompanyFile) {
    try {
      await filesApiService.bulkDeleteFiles({
        ids: [file.id],
        companyId,
      });
      toast.success(`"${file.name}" eliminato con successo`);
      await onRetry();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Errore nell'eliminazione";
      toast.error(msg);
    }
  }

  async function handleMoveFile(fileId: string, newPath: string) {
    const file = files.find((f) => f.id === fileId);
    const previousPath = file?.path;

    // Optimistic update: move the file in the UI immediately
    onUpdateFileLocally(fileId, { path: newPath });

    try {
      await filesApiService.updateFile(fileId, { path: newPath });
      toast.success(`"${file?.name ?? "File"}" spostato in "${newPath}"`);
      // No refetch: PUT updates only path; UI already updated optimistically
    } catch (err) {
      // Rollback on failure
      if (previousPath !== undefined) {
        onUpdateFileLocally(fileId, { path: previousPath });
      }
      const msg =
        err instanceof Error ? err.message : "Errore nello spostamento";
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-black flex items-center gap-2">
            <FileText className="h-4 w-4" />
            File caricati
          </h3>
          <p className="text-xs text-muted-foreground">
            Gestisci i file dell&apos;azienda {companyName}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsUploadDrawerOpen(true)}
          className="rounded-lg bg-agri-green-200 text-black hover:bg-agri-green-300"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi
        </Button>
      </div>

      {isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 p-4 text-red-700">
          <p className="text-sm font-semibold">
            Impossibile caricare i file dell&apos;azienda.
          </p>
          {error?.message && (
            <p className="text-xs text-red-600/80">{error.message}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onRetry()}
            className="border-red-200 text-red-700 hover:bg-red-100/60"
          >
            Riprova
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-black">
          <Spinner size={28} ariaLabel="Caricamento file" />
          <p className="text-sm">Caricamento file in corso…</p>
        </div>
      ) : files.length > 0 ? (
        <FileSystemTree
          files={files}
          onViewFile={handleViewFile}
          onDownloadFile={handleDownloadFile}
          onEditFile={handleEditFile}
          onDeleteFile={handleDeleteFile}
          onMoveFile={handleMoveFile}
        />
      ) : (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-gray-200 bg-white p-6 text-black">
          <p className="text-sm font-semibold">
            Nessun file caricato per questa azienda.
          </p>
          <p className="text-xs text-muted-foreground">
            Clicca su &quot;Aggiungi&quot; per caricare il primo file.
          </p>
        </div>
      )}

      <FileViewer
        file={viewingFile}
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
      />

      <UploadDrawer
        companyId={companyId}
        companyName={companyName}
        isOpen={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
        onUpload={onUpload}
        isUploading={isUploading}
        existingPaths={existingPaths}
      />

      {editingFile && (
        <EditFileDrawer
          file={editingFile}
          companyId={companyId}
          isOpen={isEditDrawerOpen}
          onClose={handleCloseEditDrawer}
          onUpdate={onRetry}
          existingPaths={existingPaths}
        />
      )}
    </div>
  );
}
