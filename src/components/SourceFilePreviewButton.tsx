import * as React from "react";
import { FileText } from "lucide-react";
import type { CompanyFile } from "@/api/files";
import { Button } from "@/components/ui/button";
import { FileViewer } from "@/routes/Company/CompanyFilesPanel/FileViewer";

interface SourceFilePreviewButtonProps {
  file?: CompanyFile | null;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}

export function SourceFilePreviewButton({
  file,
  label = "Visualizza documento originale",
  variant = "outline",
  size = "sm",
  className,
}: SourceFilePreviewButtonProps): React.ReactElement | null {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!file) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsOpen(true)}
      >
        <FileText className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <FileViewer file={file} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
