import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type InputFileProps = {
  id?: string;
  label?: string;
  accept?: string;
  disabled?: boolean;
  onChange?: (file: File | null) => void;
};

export function InputFile({
  id = "picture",
  label = "Picture",
  accept,
  disabled,
  onChange,
}: InputFileProps) {
  return (
    <div className="grid w-full max-w-sm items-center gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
