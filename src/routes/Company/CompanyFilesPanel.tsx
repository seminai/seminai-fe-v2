import * as React from "react";
import { type CompanyFile } from "@/api/files";
import { filesApiService } from "@/api/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Upload,
  FileText,
  RefreshCcw,
  Eye,
  Download,
  File,
  Image as ImageIcon,
  Folder,
  Plus,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";

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
}

interface FileViewerProps {
  file: CompanyFile | null;
  isOpen: boolean;
  onClose: () => void;
}

class FileViewer extends React.Component<FileViewerProps> {
  private iframeRef = React.createRef<HTMLIFrameElement>();

  public componentDidUpdate(prevProps: FileViewerProps): void {
    if (
      this.props.isOpen &&
      (!prevProps.isOpen || prevProps.file?.id !== this.props.file?.id) &&
      this.props.file
    ) {
      this.loadFile();
    }
  }

  private async loadFile(): Promise<void> {
    if (!this.props.file || !this.iframeRef.current) {
      return;
    }

    const { file } = this.props;
    const mimeType = file.metadata.mimeType.toLowerCase();

    if (mimeType === "application/pdf") {
      this.iframeRef.current.src = file.url;
      return;
    }

    if (
      mimeType.includes("image/") ||
      mimeType === "image/png" ||
      mimeType === "image/jpeg" ||
      mimeType === "image/jpg" ||
      mimeType === "image/gif"
    ) {
      this.iframeRef.current.src = file.url;
      return;
    }

    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      this.iframeRef.current.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        file.url
      )}`;
      return;
    }

    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      try {
        const response = await fetch(file.url);
        if (!response.ok) {
          throw new Error("Failed to fetch Excel file");
        }
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const html = XLSX.utils.sheet_to_html(
          workbook.Sheets[workbook.SheetNames[0]]
        );
        if (this.iframeRef.current) {
          const iframe = this.iframeRef.current;
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) {
            doc.open();
            doc.write(
              `<html><head><style>body { font-family: Arial, sans-serif; padding: 20px; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style></head><body>${html}</body></html>`
            );
            doc.close();
          }
        }
      } catch (error) {
        console.error("Error loading Excel file:", error);
        toast.error("Impossibile caricare il file Excel. Prova a scaricarlo.");
        if (this.iframeRef.current) {
          this.iframeRef.current.src = file.url;
        }
      }
      return;
    }

    this.iframeRef.current.src = file.url;
  }

  public render(): React.ReactNode {
    const { file, isOpen, onClose } = this.props;

    if (!file) {
      return null;
    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {file.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-6">
            <iframe
              ref={this.iframeRef}
              className="w-full h-full border rounded-lg"
              title={file.name}
              style={{ minHeight: "600px" }}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}

interface UploadDrawerState {
  selectedFile: File | null;
  filePath: string;
  fileType: string;
  isCreatingNewPath: boolean;
  newPathInput: string;
}

interface EditFileDrawerState {
  fileName: string;
  filePath: string;
  fileType: string;
  metadata: Record<string, unknown>;
  isCreatingNewPath: boolean;
  newPathInput: string;
  metadataKey: string;
  metadataValue: string;
}

class UploadDrawer extends React.Component<
  {
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
  },
  UploadDrawerState
> {
  private fileInputRef = React.createRef<HTMLInputElement>();

  public constructor(props: UploadDrawer["props"]) {
    super(props);
    this.state = {
      selectedFile: null,
      filePath: "",
      fileType: "document",
      isCreatingNewPath: false,
      newPathInput: "",
    };
  }

  public componentDidUpdate(prevProps: UploadDrawer["props"]): void {
    if (!this.props.isOpen && prevProps.isOpen) {
      this.setState({
        selectedFile: null,
        filePath: "",
        fileType: "document",
        isCreatingNewPath: false,
        newPathInput: "",
      });
      if (this.fileInputRef.current) {
        this.fileInputRef.current.value = "";
      }
    }
  }

  private getUniquePaths = (): string[] => {
    return this.props.existingPaths.sort();
  };

  private handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0];
    if (file) {
      this.setState({ selectedFile: file });
    }
  };

  private handlePathSelect = (value: string): void => {
    if (value === "__create_new__") {
      this.setState({ isCreatingNewPath: true, newPathInput: "" });
    } else {
      this.setState({
        filePath: value,
        isCreatingNewPath: false,
        newPathInput: "",
      });
    }
  };

  private handleNewPathInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ newPathInput: event.target.value });
  };

  private handleConfirmNewPath = (): void => {
    const { newPathInput } = this.state;
    if (newPathInput.trim()) {
      this.setState({
        filePath: newPathInput.trim(),
        isCreatingNewPath: false,
        newPathInput: "",
      });
    }
  };

  private handleCancelNewPath = (): void => {
    this.setState({
      isCreatingNewPath: false,
      newPathInput: "",
    });
  };

  private handleTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ fileType: event.target.value });
  };

  private handleUpload = async (): Promise<void> => {
    const { selectedFile, filePath, fileType } = this.state;
    const { companyId, onUpload } = this.props;

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
      this.props.onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Errore nel caricamento";
      toast.error(message);
    }
  };

  public render(): React.ReactNode {
    const { isOpen, onClose, isUploading, companyName } = this.props;
    const {
      selectedFile,
      filePath,
      fileType,
      isCreatingNewPath,
      newPathInput,
    } = this.state;

    const existingPaths = this.getUniquePaths();
    const hasExistingPaths = existingPaths.length > 0;

    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent
          className="max-h-[90vh]"
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
                ref={this.fileInputRef}
                onChange={this.handleFileSelect}
                className="mt-1 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
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
                      id="file-path-new-drawer"
                      type="text"
                      value={newPathInput}
                      onChange={this.handleNewPathInputChange}
                      placeholder="es: contratti/2024, documenti/fatture, etc."
                      className="flex-1 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newPathInput.trim()) {
                          this.handleConfirmNewPath();
                        } else if (e.key === "Escape") {
                          this.handleCancelNewPath();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={this.handleConfirmNewPath}
                      disabled={!newPathInput.trim()}
                      className="h-10 px-4 rounded-xl bg-agri-green-600 hover:bg-agri-green-700 text-white"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Conferma
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={this.handleCancelNewPath}
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
                  <Select
                    value={filePath || ""}
                    onValueChange={this.handlePathSelect}
                  >
                    <SelectTrigger className="w-full h-10 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl">
                      <SelectValue
                        placeholder={
                          hasExistingPaths
                            ? "Seleziona un percorso esistente..."
                            : "Nessun percorso disponibile"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {hasExistingPaths && (
                        <>
                          {existingPaths.map((path) => (
                            <SelectItem key={path} value={path}>
                              <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4 text-agri-green-600" />
                                <span>{path}</span>
                              </div>
                            </SelectItem>
                          ))}
                          <div className="border-t border-agri-green-100 my-1" />
                        </>
                      )}
                      <SelectItem value="__create_new__">
                        <div className="flex items-center gap-2 text-agri-green-700 font-medium">
                          <Plus className="h-4 w-4" />
                          <span>Crea nuovo percorso...</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {filePath && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-agri-green-50/50 rounded-lg border border-agri-green-100">
                      <Folder className="h-3 w-3 text-agri-green-600" />
                      <span className="text-xs font-medium text-agri-green-700">
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
                onChange={this.handleTypeChange}
                placeholder="contract, document, image, etc."
                className="mt-1 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
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
                onClick={this.handleUpload}
                disabled={isUploading || !selectedFile || !filePath.trim()}
                className="rounded-xl bg-agri-green-600 hover:bg-agri-green-700 text-white"
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
}

interface CompanyFilesPanelState {
  viewingFile: CompanyFile | null;
  isViewerOpen: boolean;
  isUploadDrawerOpen: boolean;
  editingFile: CompanyFile | null;
  isEditDrawerOpen: boolean;
}

class CompanyFilesPanel extends React.Component<
  CompanyFilesPanelProps,
  CompanyFilesPanelState
> {
  public constructor(props: CompanyFilesPanelProps) {
    super(props);
    this.state = {
      viewingFile: null,
      isViewerOpen: false,
      isUploadDrawerOpen: false,
      editingFile: null,
      isEditDrawerOpen: false,
    };
  }

  private groupFilesByPath = (): Map<string, CompanyFile[]> => {
    const grouped = new Map<string, CompanyFile[]>();
    this.props.files.forEach((file) => {
      const path = file.path || "(senza percorso)";
      if (!grouped.has(path)) {
        grouped.set(path, []);
      }
      grouped.get(path)!.push(file);
    });
    return grouped;
  };

  private getUniquePaths = (): string[] => {
    const paths = new Set<string>();
    this.props.files.forEach((file) => {
      if (file.path && file.path.trim()) {
        paths.add(file.path.trim());
      }
    });
    return Array.from(paths).sort();
  };

  private formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  private getFileIcon = (file: CompanyFile): React.ReactNode => {
    const mimeType = file.metadata.mimeType.toLowerCase();
    if (mimeType.includes("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  private handleViewFile = (file: CompanyFile): void => {
    this.setState({ viewingFile: file, isViewerOpen: true });
  };

  private handleCloseViewer = (): void => {
    this.setState({ isViewerOpen: false, viewingFile: null });
  };

  private handleDownloadFile = (file: CompanyFile): void => {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  private handleEditFile = (file: CompanyFile): void => {
    this.setState({ editingFile: file, isEditDrawerOpen: true });
  };

  private handleCloseEditDrawer = (): void => {
    this.setState({ isEditDrawerOpen: false, editingFile: null });
  };

  private handleDeleteSelected = async (
    removed: Array<Record<string, unknown>>
  ): Promise<void> => {
    const fileIds = removed.map((file) => file.id as string).filter(Boolean);
    if (fileIds.length === 0) {
      return;
    }

    try {
      await filesApiService.bulkDeleteFiles({
        ids: fileIds,
        companyId: this.props.companyId,
      });
      toast.success(`${fileIds.length} file eliminati con successo`);
      await this.props.onRetry();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Errore nell'eliminazione";
      toast.error(message);
    }
  };

  private buildColumns = (): EditableColumn[] => {
    return [
      {
        id: "name",
        title: "Nome",
        type: "text",
        readOnly: true,
        render: (_value, row) => {
          const file = row as unknown as CompanyFile;
          return (
            <div className="flex items-center gap-2">
              {this.getFileIcon(file)}
              <span className="text-sm font-semibold text-foreground">
                {file.name}
              </span>
            </div>
          );
        },
      },
      {
        id: "type",
        title: "Tipo",
        type: "text",
        readOnly: true,
        render: (value) => (
          <span className="text-sm text-muted-foreground">{String(value)}</span>
        ),
      },
      {
        id: "metadata.size",
        title: "Dimensione",
        type: "text",
        readOnly: true,
        render: (_value, row) => {
          const file = row as unknown as CompanyFile;
          return (
            <span className="text-sm text-muted-foreground">
              {this.formatFileSize(file.metadata.size)}
            </span>
          );
        },
      },
      {
        id: "createdAt",
        title: "Data caricamento",
        type: "text",
        readOnly: true,
        render: (value) => (
          <span className="text-sm text-muted-foreground">
            {new Date(String(value)).toLocaleDateString("it-IT")}
          </span>
        ),
      },
    ];
  };

  private renderFilesTable = (files: CompanyFile[]): React.ReactNode => {
    const columns = this.buildColumns();
    const rows = files.map((file) => ({
      ...file,
      id: file.id,
      name: file.name,
      type: file.type,
      "metadata.size": file.metadata.size,
      createdAt: file.createdAt,
    }));

    return (
      <EditableTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id as string}
        onDeleteSelected={this.handleDeleteSelected}
        showDeleteAction={true}
        exportFileName="documenti"
        lastComponent={(row) => {
          const file = row as unknown as CompanyFile;
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => this.handleEditFile(file)}
                className="rounded-full bg-field-50 hover:bg-field-100 text-field-700"
                title="Modifica file"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => this.handleViewFile(file)}
                className="rounded-full bg-field-50 hover:bg-field-100 text-field-700"
                title="Apri file"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => this.handleDownloadFile(file)}
                className="rounded-full text-agri-green-700 hover:bg-agri-green-50"
                title="Scarica file"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          );
        }}
      />
    );
  };

  private renderFilesSection(): React.ReactNode {
    const { files, isLoading, isError, error, onRetry, companyName } =
      this.props;

    const groupedFiles = this.groupFilesByPath();

    return (
      <div className="bg-gradient-to-br from-field-50/40 to-agri-green-50/20 rounded-2xl p-5 border border-field-200/60 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-field-600 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              File caricati
            </h3>
            <p className="text-xs text-muted-foreground">
              Gestisci i file dell&apos;azienda {companyName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void onRetry();
              }}
              disabled={isLoading}
              className="rounded-full border-field-200 text-field-700 hover:bg-field-50/80"
            >
              {isLoading ? (
                <Spinner size={18} ariaLabel="Aggiornamento file" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Aggiorna
            </Button>
            <Button
              size="sm"
              onClick={() => this.setState({ isUploadDrawerOpen: true })}
              className="rounded-full bg-agri-green-600 hover:bg-agri-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi
            </Button>
          </div>
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
              onClick={() => {
                void onRetry();
              }}
              className="border-red-200 text-red-700 hover:bg-red-100/60"
            >
              Riprova
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-field-600">
            <Spinner size={28} ariaLabel="Caricamento file" />
            <p className="text-sm">Caricamento file in corso…</p>
          </div>
        ) : files.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {Array.from(groupedFiles.entries()).map(([path, pathFiles]) => (
              <AccordionItem key={path} value={path}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-agri-green-600" />
                    <span className="font-semibold">{path}</span>
                    <span className="text-xs text-muted-foreground">
                      ({pathFiles.length} file)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">{this.renderFilesTable(pathFiles)}</div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-field-200 bg-white/50 p-6 text-field-600">
            <p className="text-sm font-semibold">
              Nessun file caricato per questa azienda.
            </p>
            <p className="text-xs text-muted-foreground">
              Clicca su &quot;Aggiungi&quot; per caricare il primo file.
            </p>
          </div>
        )}
      </div>
    );
  }

  public render(): React.ReactNode {
    const {
      viewingFile,
      isViewerOpen,
      isUploadDrawerOpen,
      editingFile,
      isEditDrawerOpen,
    } = this.state;
    const { companyId, companyName, onUpload, isUploading, onRetry } =
      this.props;
    const existingPaths = this.getUniquePaths();

    return (
      <div className="space-y-6">
        {this.renderFilesSection()}
        <FileViewer
          file={viewingFile}
          isOpen={isViewerOpen}
          onClose={this.handleCloseViewer}
        />
        <UploadDrawer
          companyId={companyId}
          companyName={companyName}
          isOpen={isUploadDrawerOpen}
          onClose={() => this.setState({ isUploadDrawerOpen: false })}
          onUpload={onUpload}
          isUploading={isUploading}
          existingPaths={existingPaths}
        />
        {editingFile && (
          <EditFileDrawer
            file={editingFile}
            companyId={companyId}
            isOpen={isEditDrawerOpen}
            onClose={this.handleCloseEditDrawer}
            onUpdate={async () => {
              await onRetry();
            }}
            existingPaths={existingPaths}
          />
        )}
      </div>
    );
  }
}

class EditFileDrawer extends React.Component<
  {
    file: CompanyFile;
    companyId: string;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => Promise<void>;
    existingPaths: string[];
  },
  EditFileDrawerState
> {
  public constructor(props: EditFileDrawer["props"]) {
    super(props);
    this.state = {
      fileName: props.file.name,
      filePath: props.file.path || "",
      fileType: props.file.type || "document",
      metadata: { ...props.file.metadata } as Record<string, unknown>,
      isCreatingNewPath: false,
      newPathInput: "",
      metadataKey: "",
      metadataValue: "",
    };
  }

  public componentDidUpdate(prevProps: EditFileDrawer["props"]): void {
    if (this.props.file.id !== prevProps.file.id) {
      this.setState({
        fileName: this.props.file.name,
        filePath: this.props.file.path || "",
        fileType: this.props.file.type || "document",
        metadata: { ...this.props.file.metadata } as Record<string, unknown>,
        isCreatingNewPath: false,
        newPathInput: "",
        metadataKey: "",
        metadataValue: "",
      });
    }
  }

  private handlePathSelect = (value: string): void => {
    if (value === "__create_new__") {
      this.setState({ isCreatingNewPath: true, newPathInput: "" });
    } else {
      this.setState({
        filePath: value,
        isCreatingNewPath: false,
        newPathInput: "",
      });
    }
  };

  private handleNewPathInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    this.setState({ newPathInput: event.target.value });
  };

  private handleConfirmNewPath = (): void => {
    const { newPathInput } = this.state;
    if (newPathInput.trim()) {
      this.setState({
        filePath: newPathInput.trim(),
        isCreatingNewPath: false,
        newPathInput: "",
      });
    }
  };

  private handleCancelNewPath = (): void => {
    this.setState({
      isCreatingNewPath: false,
      newPathInput: "",
    });
  };

  private handleAddMetadata = (): void => {
    const { metadataKey, metadataValue, metadata } = this.state;
    if (metadataKey.trim() && metadataValue.trim()) {
      this.setState({
        metadata: { ...metadata, [metadataKey.trim()]: metadataValue.trim() },
        metadataKey: "",
        metadataValue: "",
      });
    }
  };

  private handleRemoveMetadata = (key: string): void => {
    const { metadata } = this.state;
    const newMetadata = { ...metadata };
    delete newMetadata[key];
    this.setState({ metadata: newMetadata });
  };

  private handleSave = async (): Promise<void> => {
    const { file, onUpdate, onClose } = this.props;
    const { fileName, filePath, fileType, metadata } = this.state;

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
      const message =
        error instanceof Error ? error.message : "Errore nell'aggiornamento";
      toast.error(message);
    }
  };

  public render(): React.ReactNode {
    const { isOpen, onClose, file } = this.props;
    const {
      fileName,
      filePath,
      fileType,
      metadata,
      isCreatingNewPath,
      newPathInput,
      metadataKey,
      metadataValue,
    } = this.state;

    const existingPaths = this.props.existingPaths.filter(
      (p) => p !== file.path
    );
    const hasExistingPaths = existingPaths.length > 0;

    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent
          className="max-h-[90vh]"
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
                onChange={(e) => this.setState({ fileName: e.target.value })}
                className="mt-1 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
              />
            </div>
            <div>
              <Label htmlFor="edit-file-path">Percorso</Label>
              {isCreatingNewPath ? (
                <div className="mt-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="edit-file-path-new"
                      type="text"
                      value={newPathInput}
                      onChange={this.handleNewPathInputChange}
                      placeholder="es: contratti/2024, documenti/fatture, etc."
                      className="flex-1 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newPathInput.trim()) {
                          this.handleConfirmNewPath();
                        } else if (e.key === "Escape") {
                          this.handleCancelNewPath();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={this.handleConfirmNewPath}
                      disabled={!newPathInput.trim()}
                      className="h-10 px-4 rounded-xl bg-agri-green-600 hover:bg-agri-green-700 text-white"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Conferma
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={this.handleCancelNewPath}
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
                  <Select
                    value={filePath || ""}
                    onValueChange={this.handlePathSelect}
                  >
                    <SelectTrigger className="w-full h-10 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl">
                      <SelectValue placeholder="Seleziona un percorso..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filePath && (
                        <SelectItem value={filePath}>
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4 text-agri-green-600" />
                            <span>{filePath}</span>
                          </div>
                        </SelectItem>
                      )}
                      {hasExistingPaths && (
                        <>
                          {filePath && (
                            <div className="border-t border-agri-green-100 my-1" />
                          )}
                          {existingPaths.map((path) => (
                            <SelectItem key={path} value={path}>
                              <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4 text-agri-green-600" />
                                <span>{path}</span>
                              </div>
                            </SelectItem>
                          ))}
                          <div className="border-t border-agri-green-100 my-1" />
                        </>
                      )}
                      <SelectItem value="__create_new__">
                        <div className="flex items-center gap-2 text-agri-green-700 font-medium">
                          <Plus className="h-4 w-4" />
                          <span>Crea nuovo percorso...</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {filePath && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-agri-green-50/50 rounded-lg border border-agri-green-100">
                      <Folder className="h-3 w-3 text-agri-green-600" />
                      <span className="text-xs font-medium text-agri-green-700">
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
                onChange={(e) => this.setState({ fileType: e.target.value })}
                placeholder="contract, document, image, etc."
                className="mt-1 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
              />
            </div>
            <div>
              <Label>Metadata</Label>
              <div className="mt-1 space-y-2">
                {Object.entries(metadata).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-2 bg-agri-green-50/50 rounded-lg border border-agri-green-100"
                  >
                    <span className="text-xs font-medium text-agri-green-700 flex-1">
                      <strong>{key}:</strong> {String(value)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => this.handleRemoveMetadata(key)}
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
                    onChange={(e) =>
                      this.setState({ metadataKey: e.target.value })
                    }
                    placeholder="Chiave"
                    className="flex-1 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                  />
                  <Input
                    type="text"
                    value={metadataValue}
                    onChange={(e) =>
                      this.setState({ metadataValue: e.target.value })
                    }
                    placeholder="Valore"
                    className="flex-1 bg-white/80 border-agri-green-200 focus:border-agri-green-400 focus:ring-agri-green-300/50 rounded-xl h-10"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={this.handleAddMetadata}
                    disabled={!metadataKey.trim() || !metadataValue.trim()}
                    className="h-10 px-4 rounded-xl bg-agri-green-600 hover:bg-agri-green-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DrawerFooter>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-xl"
              >
                Annulla
              </Button>
              <Button
                onClick={this.handleSave}
                className="rounded-xl bg-agri-green-600 hover:bg-agri-green-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Salva modifiche
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
}

export { CompanyFilesPanel };
