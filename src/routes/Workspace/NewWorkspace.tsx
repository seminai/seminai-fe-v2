import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Upload, Palette, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCreateWorkspace, useUploadWorkspaceLogo } from "@/hooks/useWorkspaces";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

// Color presets
const COLOR_PRESETS = [
  {
    name: "Verde",
    primary: "#64a42e",
    secondary: "#4a7a22",
    accent: "#8bc34a",
  },
  {
    name: "Blu",
    primary: "#2563eb",
    secondary: "#1d4ed8",
    accent: "#60a5fa",
  },
  {
    name: "Viola",
    primary: "#7c3aed",
    secondary: "#6d28d9",
    accent: "#a78bfa",
  },
  {
    name: "Rosa",
    primary: "#ec4899",
    secondary: "#db2777",
    accent: "#f472b6",
  },
  {
    name: "Arancione",
    primary: "#f97316",
    secondary: "#ea580c",
    accent: "#fb923c",
  },
  {
    name: "Teal",
    primary: "#14b8a6",
    secondary: "#0d9488",
    accent: "#5eead4",
  },
] as const;

const formSchema = z.object({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  description: z.string().optional(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * ColorPresetButton - Pulsante per selezionare un preset di colori
 */
function ColorPresetButton({
  preset,
  isSelected,
  onSelect,
}: {
  preset: (typeof COLOR_PRESETS)[number];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
        "border-2",
        isSelected
          ? "border-neutral-900 bg-neutral-100"
          : "border-transparent bg-neutral-100 hover:bg-neutral-200"
      )}
    >
      <span
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: preset.primary }}
      />
      {preset.name}
    </button>
  );
}

/**
 * CustomColorPicker - Popover per selezionare colori personalizzati
 */
function CustomColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full h-10 rounded-lg border-2 border-neutral-200 hover:border-neutral-300 transition-colors flex items-center gap-2 px-3"
          >
            <span
              className="w-5 h-5 rounded-md border border-neutral-300"
              style={{ backgroundColor: value }}
            />
            <span className="text-sm text-muted-foreground uppercase">
              {value}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="flex flex-col gap-3">
            <Input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-24 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="font-mono"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * ColorPreview - Anteprima dei colori selezionati
 */
function ColorPreview({
  primary,
  secondary,
  accent,
}: {
  primary: string;
  secondary: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-8 h-8 rounded-l-lg"
        style={{ backgroundColor: primary }}
      />
      <div className="w-8 h-8" style={{ backgroundColor: secondary }} />
      <div
        className="w-8 h-8 rounded-r-lg"
        style={{ backgroundColor: accent }}
      />
    </div>
  );
}

/**
 * LogoUploader - Componente per upload del logo con drag&drop
 */
function LogoUploader({
  logoPreview,
  onFileSelect,
  onRemove,
  isUploading,
}: {
  logoPreview: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  if (logoPreview) {
    return (
      <div className="relative w-24 h-24 group">
        <img
          src={logoPreview}
          alt="Logo preview"
          className="w-full h-full rounded-xl object-cover border-2 border-neutral-200"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50",
        isUploading && "opacity-50 pointer-events-none"
      )}
    >
      <Upload className="w-6 h-6 text-neutral-400" />
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

export default function NewWorkspace() {
  const navigate = useNavigate();
  const { selectWorkspace } = useWorkspaceContext();
  const { mutateAsync: createWorkspace, isPending: isCreating } =
    useCreateWorkspace();
  const { mutateAsync: uploadLogo, isPending: isUploading } =
    useUploadWorkspaceLogo();

  const [selectedPreset, setSelectedPreset] = useState<string>("Verde");
  const [isCustomColors, setIsCustomColors] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      primaryColor: COLOR_PRESETS[0].primary,
      secondaryColor: COLOR_PRESETS[0].secondary,
      accentColor: COLOR_PRESETS[0].accent,
    },
  });

  const handlePresetSelect = useCallback(
    (preset: (typeof COLOR_PRESETS)[number]) => {
      setSelectedPreset(preset.name);
      setIsCustomColors(false);
      form.setValue("primaryColor", preset.primary);
      form.setValue("secondaryColor", preset.secondary);
      form.setValue("accentColor", preset.accent);
    },
    [form]
  );

  const handleCustomColorsToggle = useCallback(() => {
    setIsCustomColors(true);
    setSelectedPreset("");
  }, []);

  const handleLogoSelect = useCallback((file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleLogoRemove = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      // Create workspace
      const result = await createWorkspace({
        name: values.name,
        description: values.description || undefined,
        primaryColor: values.primaryColor,
        secondaryColor: values.secondaryColor,
        accentColor: values.accentColor,
      });

      const newWorkspace = result.workspace;

      // Upload logo if provided
      if (logoFile && newWorkspace.id) {
        try {
          await uploadLogo({ workspaceId: newWorkspace.id, file: logoFile });
        } catch (logoError) {
          console.error("Logo upload failed:", logoError);
          toast.warning("Workspace creato, ma upload logo fallito");
        }
      }

      toast.success("Workspace creato con successo!");

      // Select the new workspace and navigate to dashboard
      selectWorkspace(newWorkspace.id);
      navigate("/dashboard");
    } catch (error) {
      console.error("Create workspace error:", error);
      toast.error("Errore durante la creazione del workspace");
    }
  };

  const watchedColors = form.watch([
    "primaryColor",
    "secondaryColor",
    "accentColor",
  ]);

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <div className="max-w-2xl mx-auto py-12 px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-neutral-900 mb-2">
            Crea nuovo Workspace
          </h1>
          <p className="text-neutral-500">
            Personalizza il tuo ambiente di lavoro con logo e colori unici.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Logo Upload */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
              <Label className="text-base font-medium mb-4 block">
                Logo <span className="text-neutral-400">(opzionale)</span>
              </Label>
              <div className="flex items-start gap-6">
                <LogoUploader
                  logoPreview={logoPreview}
                  onFileSelect={handleLogoSelect}
                  onRemove={handleLogoRemove}
                  isUploading={isUploading}
                />
                <div className="flex-1 text-sm text-neutral-500">
                  <p>
                    Carica un logo per personalizzare il workspace. I colori
                    verranno estratti automaticamente.
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    PNG, JPG, GIF o WebP. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Name & Description */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Nome <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Es. Studio Agronomico Rossi"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Descrizione
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrivi brevemente il workspace..."
                        className="min-h-[100px] text-base resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Color Theme */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Colori tema</Label>
                <button
                  type="button"
                  onClick={handleCustomColorsToggle}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2",
                    isCustomColors
                      ? "border-neutral-900 bg-neutral-100"
                      : "border-transparent bg-neutral-100 hover:bg-neutral-200"
                  )}
                >
                  <Palette className="w-4 h-4" />
                  Personalizza
                </button>
              </div>

              {/* Color Presets */}
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <ColorPresetButton
                    key={preset.name}
                    preset={preset}
                    isSelected={selectedPreset === preset.name && !isCustomColors}
                    onSelect={() => handlePresetSelect(preset)}
                  />
                ))}
              </div>

              {/* Custom Colors */}
              {isCustomColors && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                  <CustomColorPicker
                    label="Primario"
                    value={watchedColors[0]}
                    onChange={(color) => form.setValue("primaryColor", color)}
                  />
                  <CustomColorPicker
                    label="Secondario"
                    value={watchedColors[1]}
                    onChange={(color) => form.setValue("secondaryColor", color)}
                  />
                  <CustomColorPicker
                    label="Accento"
                    value={watchedColors[2]}
                    onChange={(color) => form.setValue("accentColor", color)}
                  />
                </div>
              )}

              {/* Preview */}
              <div className="flex items-center gap-4 pt-4 border-t border-neutral-100">
                <span className="text-sm text-neutral-500">Anteprima:</span>
                <ColorPreview
                  primary={watchedColors[0]}
                  secondary={watchedColors[1]}
                  accent={watchedColors[2]}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate(-1)}
                className="px-8"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={isCreating || isUploading}
                className="px-8 bg-agri-green-600 hover:bg-agri-green-700 text-white"
              >
                {isCreating ? "Creazione..." : "Crea Workspace"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
