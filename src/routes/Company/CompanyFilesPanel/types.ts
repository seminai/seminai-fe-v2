import { type CompanyFile } from "@/api/files";

export interface FolderNode {
  type: "folder";
  name: string;
  path: string;
  children: TreeNode[];
}

export interface FileLeafNode {
  type: "file";
  data: CompanyFile;
}

export type TreeNode = FolderNode | FileLeafNode;

function sortTreeRecursive(node: FolderNode): void {
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    const nameA = a.type === "folder" ? a.name : a.data.name;
    const nameB = b.type === "folder" ? b.name : b.data.name;
    return nameA.localeCompare(nameB);
  });
  for (const child of node.children) {
    if (child.type === "folder") sortTreeRecursive(child);
  }
}

export function buildFileTree(files: CompanyFile[]): FolderNode {
  const root: FolderNode = {
    type: "folder",
    name: "",
    path: "",
    children: [],
  };

  for (const file of files) {
    const pathStr = file.path?.trim() || "(senza percorso)";
    const segments = pathStr.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const fullPath = segments.slice(0, i + 1).join("/");
      let folder = current.children.find(
        (c): c is FolderNode => c.type === "folder" && c.name === segment,
      );
      if (!folder) {
        folder = {
          type: "folder",
          name: segment,
          path: fullPath,
          children: [],
        };
        current.children.push(folder);
      }
      current = folder;
    }

    current.children.push({ type: "file", data: file });
  }

  sortTreeRecursive(root);
  return root;
}

export function countFilesInFolder(node: FolderNode): number {
  let count = 0;
  for (const child of node.children) {
    count += child.type === "file" ? 1 : countFilesInFolder(child);
  }
  return count;
}

export function collectAllFolderPaths(node: FolderNode): string[] {
  const paths: string[] = [];
  if (node.path) paths.push(node.path);
  for (const child of node.children) {
    if (child.type === "folder") paths.push(...collectAllFolderPaths(child));
  }
  return paths;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function getUniquePaths(files: CompanyFile[]): string[] {
  const paths = new Set<string>();
  files.forEach((file) => {
    if (file.path?.trim()) paths.add(file.path.trim());
  });
  return Array.from(paths).sort();
}
