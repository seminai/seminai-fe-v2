import * as React from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { type CompanyFile } from "@/api/files";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  FileText,
  Eye,
  Download,
  Pencil,
  GripVertical,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type FolderNode,
  type TreeNode,
  buildFileTree,
  countFilesInFolder,
  formatFileSize,
} from "./types";

interface FileSystemTreeProps {
  files: CompanyFile[];
  onViewFile: (file: CompanyFile) => void;
  onDownloadFile: (file: CompanyFile) => void;
  onEditFile: (file: CompanyFile) => void;
  onDeleteFile: (file: CompanyFile) => void;
  onMoveFile: (fileId: string, newPath: string) => Promise<void>;
}

function getFileIcon(mimeType: string): React.ReactNode {
  const mime = mimeType.toLowerCase();
  if (mime.includes("image/"))
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (mime.includes("spreadsheet") || mime.includes("excel"))
    return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  if (mime === "application/pdf")
    return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-gray-500" />;
}

function DraggableFileRow({
  file,
  depth,
  onView,
  onDownload,
  onEdit,
  onDelete,
}: {
  file: CompanyFile;
  depth: number;
  onView: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: file.id,
    data: { file },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded-md group transition-colors",
        isDragging && "opacity-30",
      )}
      style={{ paddingLeft: `${(depth + 1) * 24 + 8}px` }}
    >
      <button
        className="cursor-grab active:cursor-grabbing p-0.5 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {getFileIcon(file.metadata.mimeType)}
      <span className="text-sm flex-1 truncate">{file.name}</span>
      <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">
        {formatFileSize(file.metadata.size)}
      </span>
      <span className="text-xs text-muted-foreground hidden md:inline shrink-0">
        {new Date(file.createdAt).toLocaleDateString("it-IT")}
      </span>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 w-7 p-0"
          title="Modifica"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onView}
          className="h-7 w-7 p-0"
          title="Visualizza"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDownload}
          className="h-7 w-7 p-0"
          title="Scarica"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
          title="Elimina"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function DroppableFolderRow({
  folder,
  depth,
  isExpanded,
  onToggle,
  children,
}: {
  folder: FolderNode;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: folder.path,
    data: { folder },
  });
  const fileCount = countFilesInFolder(folder);

  return (
    <div ref={setNodeRef}>
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 w-full py-2 px-2 rounded-md transition-colors text-left",
          isOver
            ? "bg-green-100 ring-2 ring-green-400 ring-inset"
            : "hover:bg-gray-50",
        )}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform shrink-0",
            isExpanded && "rotate-90",
          )}
        />
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-amber-500 shrink-0" />
        )}
        <span className="text-sm font-medium flex-1 truncate">
          {folder.name}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {fileCount} {fileCount === 1 ? "file" : "file"}
        </span>
      </button>
      {isExpanded && <div>{children}</div>}
    </div>
  );
}

function DraggedFileOverlay({ file }: { file: CompanyFile }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 max-w-xs">
      {getFileIcon(file.metadata.mimeType)}
      <span className="text-sm font-medium truncate">{file.name}</span>
    </div>
  );
}

export function FileSystemTree({
  files,
  onViewFile,
  onDownloadFile,
  onEditFile,
  onDeleteFile,
  onMoveFile,
}: FileSystemTreeProps) {
  const [collapsedFolders, setCollapsedFolders] = React.useState<Set<string>>(
    new Set(),
  );
  const [activeFile, setActiveFile] = React.useState<CompanyFile | null>(null);

  const tree = React.useMemo(() => buildFileTree(files), [files]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleToggleFolder(path: string) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const fileData = event.active.data.current?.file as CompanyFile | undefined;
    setActiveFile(fileData ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveFile(null);
    const { active, over } = event;
    if (!over) return;

    const fileId = active.id as string;
    const targetPath = over.id as string;
    const file = files.find((f) => f.id === fileId);
    if (!file || file.path === targetPath) return;

    await onMoveFile(fileId, targetPath);
  }

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    if (node.type === "file") {
      return (
        <DraggableFileRow
          key={node.data.id}
          file={node.data}
          depth={depth}
          onView={() => onViewFile(node.data)}
          onDownload={() => onDownloadFile(node.data)}
          onEdit={() => onEditFile(node.data)}
          onDelete={() => onDeleteFile(node.data)}
        />
      );
    }

    const isExpanded = !collapsedFolders.has(node.path);
    return (
      <DroppableFolderRow
        key={`folder-${node.path}`}
        folder={node}
        depth={depth}
        isExpanded={isExpanded}
        onToggle={() => handleToggleFolder(node.path)}
      >
        {node.children.map((child) => renderNode(child, depth + 1))}
      </DroppableFolderRow>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="border rounded-lg bg-white divide-y divide-gray-100 overflow-hidden">
        {tree.children.length > 0 ? (
          tree.children.map((child) => renderNode(child, 0))
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nessun file presente.
          </div>
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeFile ? <DraggedFileOverlay file={activeFile} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
