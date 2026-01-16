import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Upload,
  Palette,
  X,
  Settings,
  Users,
  Trash2,
  UserPlus,
  Shield,
  Eye,
  MoreHorizontal,
  ArrowLeft,
  AlertTriangle,
  FileText,
  Plus,
  Edit,
  Building2,
  Search,
} from "lucide-react";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  useUpdateWorkspace,
  useDeleteWorkspace,
  useUploadWorkspaceLogo,
  useWorkspaceMembers,
  useInviteMember,
  useUpdateMember,
  useRemoveMember,
  useWorkspaceRules,
  useDeleteRule,
  useAssignRuleToCompany,
  useRemoveRuleFromCompany,
} from "@/hooks/useWorkspaces";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useCompanies } from "@/hooks/useCompanies";
import { useRule } from "@/hooks/useWorkspaces";
import {
  WorkspaceMemberRole,
  RuleCategory,
  RuleStatus,
  type Rule,
} from "@/types/workspace";

// Color presets
const COLOR_PRESETS = [
  {
    name: "Verde",
    primary: "#64a42e",
    secondary: "#4a7a22",
    accent: "#8bc34a",
  },
  { name: "Blu", primary: "#2563eb", secondary: "#1d4ed8", accent: "#60a5fa" },
  {
    name: "Viola",
    primary: "#7c3aed",
    secondary: "#6d28d9",
    accent: "#a78bfa",
  },
  { name: "Rosa", primary: "#ec4899", secondary: "#db2777", accent: "#f472b6" },
  {
    name: "Arancione",
    primary: "#f97316",
    secondary: "#ea580c",
    accent: "#fb923c",
  },
  { name: "Teal", primary: "#14b8a6", secondary: "#0d9488", accent: "#5eead4" },
] as const;

const generalFormSchema = z.object({
  name: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  slug: z.string().optional(),
  description: z.string().optional(),
});

const colorsFormSchema = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
});

const inviteFormSchema = z.object({
  email: z.string().email("Email non valida"),
  role: z.nativeEnum(WorkspaceMemberRole),
});

type GeneralFormValues = z.infer<typeof generalFormSchema>;
type ColorsFormValues = z.infer<typeof colorsFormSchema>;
type InviteFormValues = z.infer<typeof inviteFormSchema>;

/**
 * ColorPresetButton
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
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2",
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
 * CustomColorPicker
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
 * ColorPreview
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
 * LogoUploader
 */
function LogoUploader({
  currentLogo,
  logoPreview,
  onFileSelect,
  onRemove,
  isUploading,
}: {
  currentLogo?: string | null;
  logoPreview: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayLogo = logoPreview || currentLogo;

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

  if (displayLogo) {
    return (
      <div className="relative w-24 h-24 group">
        <img
          src={displayLogo}
          alt="Logo"
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

/**
 * MemberRoleBadge
 */
function MemberRoleBadge({ role }: { role: WorkspaceMemberRole }) {
  const variants: Record<WorkspaceMemberRole, string> = {
    [WorkspaceMemberRole.OWNER]: "bg-amber-100 text-amber-800",
    [WorkspaceMemberRole.ADMIN]: "bg-blue-100 text-blue-800",
    [WorkspaceMemberRole.MEMBER]: "bg-neutral-100 text-neutral-800",
    [WorkspaceMemberRole.VIEWER]: "bg-neutral-100 text-neutral-500",
  };

  const labels: Record<WorkspaceMemberRole, string> = {
    [WorkspaceMemberRole.OWNER]: "Proprietario",
    [WorkspaceMemberRole.ADMIN]: "Admin",
    [WorkspaceMemberRole.MEMBER]: "Membro",
    [WorkspaceMemberRole.VIEWER]: "Visualizzatore",
  };

  return (
    <Badge variant="secondary" className={cn("font-medium", variants[role])}>
      {labels[role]}
    </Badge>
  );
}

/**
 * GeneralSettingsTab
 */
function GeneralSettingsTab() {
  const { currentWorkspace } = useWorkspaceContext();
  const { mutateAsync: updateWorkspace, isPending } = useUpdateWorkspace();
  const { mutateAsync: uploadLogo, isPending: isUploading } =
    useUploadWorkspaceLogo();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalFormSchema),
    defaultValues: {
      name: currentWorkspace?.name ?? "",
      slug: currentWorkspace?.slug ?? "",
      description: currentWorkspace?.description ?? "",
    },
  });

  // Reset form when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      form.reset({
        name: currentWorkspace.name,
        slug: currentWorkspace.slug,
        description: currentWorkspace.description ?? "",
      });
    }
  }, [currentWorkspace, form]);

  const handleLogoSelect = useCallback((file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleLogoRemove = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
  }, []);

  const onSubmit = async (values: GeneralFormValues) => {
    if (!currentWorkspace) return;

    try {
      await updateWorkspace({
        workspaceId: currentWorkspace.id,
        payload: values,
      });

      if (logoFile) {
        await uploadLogo({ workspaceId: currentWorkspace.id, file: logoFile });
        setLogoFile(null);
        setLogoPreview(null);
      }

      toast.success("Impostazioni salvate!");
    } catch (error) {
      console.error("Update workspace error:", error);
      toast.error("Errore durante il salvataggio");
    }
  };

  if (!currentWorkspace) return null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Logo */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <Label className="text-base font-medium mb-4 block">Logo</Label>
          <div className="flex items-start gap-6">
            <LogoUploader
              currentLogo={currentWorkspace.logoUrl}
              logoPreview={logoPreview}
              onFileSelect={handleLogoSelect}
              onRemove={handleLogoRemove}
              isUploading={isUploading}
            />
            <div className="flex-1 text-sm text-neutral-500">
              <p>Carica un logo per personalizzare il workspace.</p>
              <p className="mt-1 text-xs text-neutral-400">
                PNG, JPG, GIF o WebP. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* General Info */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Nome Workspace
                </FormLabel>
                <FormControl>
                  <Input className="h-12 text-base" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Slug (URL)
                </FormLabel>
                <FormControl>
                  <Input className="h-12 text-base font-mono" {...field} />
                </FormControl>
                <FormDescription>
                  Identificatore unico per il workspace
                </FormDescription>
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
                    className="min-h-[100px] text-base resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || isUploading} size="lg">
            {isPending ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * AppearanceSettingsTab
 */
function AppearanceSettingsTab() {
  const { currentWorkspace } = useWorkspaceContext();
  const { mutateAsync: updateWorkspace, isPending } = useUpdateWorkspace();

  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [isCustomColors, setIsCustomColors] = useState(false);

  const form = useForm<ColorsFormValues>({
    resolver: zodResolver(colorsFormSchema),
    defaultValues: {
      primaryColor: currentWorkspace?.primaryColor ?? "#64a42e",
      secondaryColor: currentWorkspace?.secondaryColor ?? "#4a7a22",
      accentColor: currentWorkspace?.accentColor ?? "#8bc34a",
    },
  });

  useEffect(() => {
    if (currentWorkspace) {
      form.reset({
        primaryColor: currentWorkspace.primaryColor ?? "#64a42e",
        secondaryColor: currentWorkspace.secondaryColor ?? "#4a7a22",
        accentColor: currentWorkspace.accentColor ?? "#8bc34a",
      });

      // Check if current colors match a preset
      const matchingPreset = COLOR_PRESETS.find(
        (p) =>
          p.primary === currentWorkspace.primaryColor &&
          p.secondary === currentWorkspace.secondaryColor &&
          p.accent === currentWorkspace.accentColor
      );
      if (matchingPreset) {
        setSelectedPreset(matchingPreset.name);
        setIsCustomColors(false);
      } else {
        setIsCustomColors(true);
      }
    }
  }, [currentWorkspace, form]);

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

  const onSubmit = async (values: ColorsFormValues) => {
    if (!currentWorkspace) return;

    try {
      await updateWorkspace({
        workspaceId: currentWorkspace.id,
        payload: values,
      });
      toast.success("Colori aggiornati!");
    } catch (error) {
      console.error("Update colors error:", error);
      toast.error("Errore durante il salvataggio");
    }
  };

  const watchedColors = form.watch([
    "primaryColor",
    "secondaryColor",
    "accentColor",
  ]);

  if (!currentWorkspace) return null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Colori tema</Label>
            <button
              type="button"
              onClick={() => {
                setIsCustomColors(true);
                setSelectedPreset("");
              }}
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

          <div className="flex items-center gap-4 pt-4 border-t border-neutral-100">
            <span className="text-sm text-neutral-500">Anteprima:</span>
            <ColorPreview
              primary={watchedColors[0]}
              secondary={watchedColors[1]}
              accent={watchedColors[2]}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} size="lg">
            {isPending ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * MembersSettingsTab
 */
function MembersSettingsTab() {
  const { currentWorkspace } = useWorkspaceContext();
  const { data: members = [], isLoading } = useWorkspaceMembers(
    currentWorkspace?.id ?? ""
  );
  const { mutateAsync: doInviteMember, isPending: isInviting } =
    useInviteMember();
  const { mutateAsync: doUpdateMember } = useUpdateMember();
  const { mutateAsync: doRemoveMember } = useRemoveMember();

  const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false);

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: WorkspaceMemberRole.MEMBER,
    },
  });

  const handleInvite = async (values: InviteFormValues) => {
    if (!currentWorkspace) return;

    try {
      await doInviteMember({
        workspaceId: currentWorkspace.id,
        payload: { email: values.email, role: values.role },
      });
      toast.success("Invito inviato!");
      setInviteDrawerOpen(false);
      inviteForm.reset();
    } catch (error) {
      console.error("Invite error:", error);
      toast.error("Errore durante l'invio dell'invito");
    }
  };

  const handleRoleChange = async (
    memberId: string,
    newRole: WorkspaceMemberRole
  ) => {
    if (!currentWorkspace) return;

    try {
      await doUpdateMember({
        workspaceId: currentWorkspace.id,
        memberId,
        payload: { role: newRole },
      });
      toast.success("Ruolo aggiornato!");
    } catch (error) {
      console.error("Update role error:", error);
      toast.error("Errore durante l'aggiornamento del ruolo");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentWorkspace) return;

    try {
      await doRemoveMember({ workspaceId: currentWorkspace.id, memberId });
      toast.success("Membro rimosso!");
    } catch (error) {
      console.error("Remove member error:", error);
      toast.error("Errore durante la rimozione del membro");
    }
  };

  if (!currentWorkspace) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Membri del Workspace</h3>
            <p className="text-sm text-muted-foreground">
              {members.length} membri
            </p>
          </div>
          <Button onClick={() => setInviteDrawerOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invita membro
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Caricamento...
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessun membro
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {member.user?.name?.[0] ?? member.user?.email?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.user?.name ?? member.user?.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MemberRoleBadge role={member.role} />
                  {member.role !== WorkspaceMemberRole.OWNER && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(
                              member.id,
                              WorkspaceMemberRole.ADMIN
                            )
                          }
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Rendi Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(
                              member.id,
                              WorkspaceMemberRole.MEMBER
                            )
                          }
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Rendi Membro
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(
                              member.id,
                              WorkspaceMemberRole.VIEWER
                            )
                          }
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Rendi Visualizzatore
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Rimuovi
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Member Drawer */}
      <Drawer open={inviteDrawerOpen} onOpenChange={setInviteDrawerOpen}>
        <DrawerContent
          data-vaul-drawer-direction="right"
          className="max-h-[100vh] w-[90vw] sm:w-[500px]"
        >
          <DrawerHeader>
            <DrawerTitle>Invita un nuovo membro</DrawerTitle>
            <DrawerDescription>
              Inserisci l'email della persona che vuoi invitare.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <Form {...inviteForm}>
              <form
                onSubmit={inviteForm.handleSubmit(handleInvite)}
                className="space-y-4"
              >
                <FormField
                  control={inviteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@esempio.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={inviteForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ruolo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona ruolo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={WorkspaceMemberRole.ADMIN}>
                            Admin
                          </SelectItem>
                          <SelectItem value={WorkspaceMemberRole.MEMBER}>
                            Membro
                          </SelectItem>
                          <SelectItem value={WorkspaceMemberRole.VIEWER}>
                            Visualizzatore
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          <DrawerFooter>
            <Button
              onClick={inviteForm.handleSubmit(handleInvite)}
              disabled={isInviting}
              className="w-full"
            >
              {isInviting ? "Invio..." : "Invia invito"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Annulla
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/**
 * RulesSettingsTab
 */
function RulesSettingsTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentWorkspace } = useWorkspaceContext();
  const {
    data: rules = [],
    isLoading,
    refetch,
  } = useWorkspaceRules(currentWorkspace?.id);
  const { mutateAsync: doDeleteRule, isPending: isDeleting } = useDeleteRule();
  const { mutateAsync: doAssignRule } = useAssignRuleToCompany();
  const { mutateAsync: doRemoveRule } = useRemoveRuleFromCompany();

  const [assignmentsDrawerOpen, setAssignmentsDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [filters, setFilters] = useState<{
    category?: RuleCategory;
    status?: RuleStatus;
    search?: string;
  }>({});

  // Refetch rules when navigating to this tab to ensure fresh data
  useEffect(() => {
    if (currentWorkspace?.id && location.pathname.includes("/settings/rules")) {
      refetch();
    }
  }, [location.pathname, currentWorkspace?.id, refetch]);

  const filteredRules = rules.filter((rule) => {
    if (filters.category && rule.category !== filters.category) return false;
    if (filters.status && rule.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        rule.name.toLowerCase().includes(searchLower) ||
        rule.description?.toLowerCase().includes(searchLower) ||
        rule.region?.toLowerCase().includes(searchLower) ||
        false
      );
    }
    return true;
  });

  const handleEdit = (rule: Rule) => {
    navigate(`/workspace/settings/rules/${rule.id}`);
  };

  const handleDelete = async () => {
    if (!selectedRule) return;

    try {
      await doDeleteRule(selectedRule.id);
      toast.success("Regola eliminata con successo!");
      setDeleteDialogOpen(false);
      setSelectedRule(null);
    } catch (error) {
      console.error("Delete rule error:", error);
      toast.error("Errore durante l'eliminazione della regola");
    }
  };

  const categoryLabels: Record<RuleCategory, string> = {
    [RuleCategory.DISCIPLINARE]: "Disciplinare",
    [RuleCategory.STANDARD]: "Standard",
    [RuleCategory.BEST_PRACTICE]: "Buona Pratica",
    [RuleCategory.METHODOLOGY]: "Metodologia",
    [RuleCategory.CUSTOM]: "Personalizzata",
  };

  const statusLabels: Record<RuleStatus, string> = {
    [RuleStatus.DRAFT]: "Bozza",
    [RuleStatus.ACTIVE]: "Attiva",
    [RuleStatus.ARCHIVED]: "Archiviata",
    [RuleStatus.DEPRECATED]: "Deprecata",
  };

  const statusVariants: Record<RuleStatus, string> = {
    [RuleStatus.DRAFT]: "bg-neutral-100 text-neutral-800",
    [RuleStatus.ACTIVE]: "bg-green-100 text-green-800",
    [RuleStatus.ARCHIVED]: "bg-gray-100 text-gray-800",
    [RuleStatus.DEPRECATED]: "bg-red-100 text-red-800",
  };

  if (!currentWorkspace) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Regole del Workspace</h3>
            <p className="text-sm text-muted-foreground">
              {filteredRules.length} regol
              {filteredRules.length === 1 ? "a" : "e"} • Limite:{" "}
              {currentWorkspace.maxRules}
            </p>
          </div>
          <Button onClick={() => navigate("/new-rule")}>
            <Plus className="w-4 h-4 mr-2" />
            Crea Regola
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Input
            placeholder="Cerca regole..."
            value={filters.search ?? ""}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value || undefined })
            }
            className="max-w-xs"
          />
          <Select
            value={filters.category ?? "all"}
            onValueChange={(value) =>
              setFilters({
                ...filters,
                category: value === "all" ? undefined : (value as RuleCategory),
              })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {Object.values(RuleCategory).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {categoryLabels[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status ?? "all"}
            onValueChange={(value) =>
              setFilters({
                ...filters,
                status: value === "all" ? undefined : (value as RuleStatus),
              })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              {Object.values(RuleStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Caricamento...
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {rules.length === 0
              ? "Nessuna regola creata"
              : "Nessuna regola corrisponde ai filtri"}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-medium">{rule.name}</h4>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", statusVariants[rule.status])}
                    >
                      {statusLabels[rule.status]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {categoryLabels[rule.category]}
                    </Badge>
                  </div>
                  {rule.description && (
                    <p className="text-sm text-muted-foreground mb-1">
                      {rule.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {rule.region && <span>📍 {rule.region}</span>}
                    {(rule.companiesCount ?? rule._count?.companies) !==
                      undefined && (
                      <span>
                        🏢 {rule.companiesCount ?? rule._count?.companies ?? 0}{" "}
                        aziend
                        {(rule.companiesCount ??
                          rule._count?.companies ??
                          0) === 1
                          ? "a"
                          : "e"}
                      </span>
                    )}
                    {rule.version && <span>v{rule.version}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(rule)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Modifica
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedRule(rule);
                          setAssignmentsDrawerOpen(true);
                        }}
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        Gestisci assegnazioni (
                        {rule.companiesCount ?? rule._count?.companies ?? 0})
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedRule(rule);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina regola</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare la regola "{selectedRule?.name}"?
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignments Drawer */}
      <AssignmentsDrawer
        rule={selectedRule}
        isOpen={assignmentsDrawerOpen}
        onOpenChange={setAssignmentsDrawerOpen}
        onAssignCompanies={async (companyIds: string[]) => {
          if (!selectedRule || companyIds.length === 0) return;
          try {
            for (const companyId of companyIds) {
              await doAssignRule({
                ruleId: selectedRule.id,
                payload: { companyId, priority: 0 },
              });
            }
            toast.success(
              `${companyIds.length} aziend${
                companyIds.length === 1 ? "a" : "e"
              } assegnat${companyIds.length === 1 ? "a" : "e"}!`
            );
            // La cache verrà aggiornata automaticamente tramite invalidateQueries in useAssignRuleToCompany
          } catch (error) {
            console.error("Assign companies error:", error);
            toast.error("Errore durante l'assegnazione");
          }
        }}
        onRemoveAssignment={async (companyId: string) => {
          if (!selectedRule) return;
          try {
            await doRemoveRule({
              ruleId: selectedRule.id,
              companyId,
            });
            toast.success("Assegnazione rimossa!");
          } catch (error) {
            console.error("Remove assignment error:", error);
            toast.error("Errore durante la rimozione dell'assegnazione");
          }
        }}
      />
    </div>
  );
}

/**
 * AssignmentsDrawer - Componente per visualizzare e gestire le assegnazioni di una regola
 */
function AssignmentsDrawer({
  rule,
  isOpen,
  onOpenChange,
  onAssignCompanies,
  onRemoveAssignment,
}: {
  rule: Rule | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignCompanies: (companyIds: string[]) => Promise<void>;
  onRemoveAssignment: (companyId: string) => Promise<void>;
}) {
  const { companies } = useCompanies();
  const {
    data: updatedRule,
    refetch: refetchRule,
    isLoading: isLoadingRule,
  } = useRule(rule?.id);

  // Usa la regola aggiornata se disponibile, altrimenti quella passata come prop
  // La regola aggiornata avrà le aziende aggiornate dopo le assegnazioni
  const currentRule = updatedRule || rule;

  const [assignments, setAssignments] = useState<
    Array<{
      companyId: string;
      companyName: string;
    }>
  >([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(
    new Set()
  );
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isLoading = isLoadingRule;

  // Carica le assegnazioni quando si apre il drawer o quando la regola cambia
  useEffect(() => {
    if (!isOpen || !currentRule) {
      setAssignments([]);
      setSelectedCompanyIds(new Set());
      setSearchQuery("");
      return;
    }

    // Usa direttamente le aziende dalla regola
    if (currentRule.companies && currentRule.companies.length > 0) {
      const foundAssignments = currentRule.companies.map((company) => ({
        companyId: company.id,
        companyName: company.name,
      }));
      const assignedIds = new Set(foundAssignments.map((a) => a.companyId));

      setAssignments(foundAssignments);
      setSelectedCompanyIds(assignedIds);
    } else {
      setAssignments([]);
      setSelectedCompanyIds(new Set());
    }
  }, [isOpen, currentRule]);

  const handleToggleCompany = (companyId: string) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const handleAssignSelected = async () => {
    if (!currentRule) return;
    const toAssign = Array.from(selectedCompanyIds).filter(
      (id) => !assignments.some((a) => a.companyId === id)
    );

    if (toAssign.length === 0) {
      toast.info("Nessuna nuova azienda da assegnare");
      return;
    }

    setIsAssigning(true);
    try {
      await onAssignCompanies(toAssign);

      // Ricarica la regola per ottenere le aziende aggiornate
      await refetchRule();

      setSearchQuery("");
    } catch (error) {
      // Error already handled in onAssignCompanies
      console.error("Assign companies error:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const assignedCompanyIds = new Set(assignments.map((a) => a.companyId));
  const availableCompanies = companies.filter(
    (c) => !assignedCompanyIds.has(c.id)
  );

  // Filtra le aziende disponibili in base alla ricerca
  const filteredAvailableCompanies = availableCompanies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedNewCompanies = Array.from(selectedCompanyIds).filter(
    (id) => !assignedCompanyIds.has(id)
  );

  if (!rule) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent
        data-vaul-drawer-direction="right"
        className="max-h-[100vh] w-[90vw] sm:w-[500px]"
      >
        <DrawerHeader>
          <DrawerTitle>Assegnazioni: {rule.name}</DrawerTitle>
          <DrawerDescription>
            Gestisci le aziende a cui è assegnata questa regola. Una regola può
            essere assegnata a più aziende.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
          {/* Aziende già assegnate */}
          {assignments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Aziende assegnate ({assignments.length})
              </h3>
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.companyId}
                    className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {assignment.companyName}
                      </h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await onRemoveAssignment(assignment.companyId);
                        // Ricarica la regola per ottenere le aziende aggiornate
                        await refetchRule();
                      }}
                      className="text-red-600 hover:text-red-700 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Multi-select per assegnare nuove aziende */}
          {availableCompanies.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Assegna ad altre aziende ({availableCompanies.length}{" "}
                disponibili)
              </h3>

              {/* Campo di ricerca */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cerca aziende..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredAvailableCompanies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {searchQuery
                      ? "Nessuna azienda trovata"
                      : "Nessuna azienda disponibile"}
                  </div>
                ) : (
                  filteredAvailableCompanies.map((company) => (
                    <label
                      key={company.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedCompanyIds.has(company.id)}
                        onCheckedChange={() => handleToggleCompany(company.id)}
                      />
                      <span className="flex-1 text-sm font-medium">
                        {company.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {selectedNewCompanies.length > 0 && (
                <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-primary font-medium mb-2">
                    {selectedNewCompanies.length} aziend
                    {selectedNewCompanies.length === 1 ? "a" : "e"} selezionat
                    {selectedNewCompanies.length === 1 ? "a" : "e"}
                  </p>
                  <Button
                    onClick={handleAssignSelected}
                    disabled={isAssigning}
                    className="w-full"
                    size="sm"
                  >
                    {isAssigning ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        Assegnazione...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Assegna selezionate
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {assignments.length === 0 &&
            availableCompanies.length === 0 &&
            !isLoading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nessuna azienda disponibile.
                </p>
              </div>
            )}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Chiudi
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * DangerZoneTab
 */
function DangerZoneTab() {
  const navigate = useNavigate();
  const { currentWorkspace, exitWorkspace } = useWorkspaceContext();
  const { mutateAsync: deleteWorkspace, isPending } = useDeleteWorkspace();

  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!currentWorkspace || confirmDelete !== currentWorkspace.name) return;

    try {
      await deleteWorkspace(currentWorkspace.id);
      toast.success("Workspace eliminato!");
      exitWorkspace();
      navigate("/dashboard");
    } catch (error) {
      console.error("Delete workspace error:", error);
      toast.error("Errore durante l'eliminazione");
    }
  };

  if (!currentWorkspace) return null;

  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900">
              Elimina Workspace
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Una volta eliminato, il workspace e tutti i suoi dati verranno
              persi permanentemente. Questa azione non può essere annullata.
            </p>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="mt-4">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Elimina Workspace
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Sei sicuro di voler eliminare il workspace?
                  </DialogTitle>
                  <DialogDescription>
                    Questa azione è irreversibile. Per confermare, scrivi il
                    nome del workspace: <strong>{currentWorkspace.name}</strong>
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder={currentWorkspace.name}
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                />
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={
                      confirmDelete !== currentWorkspace.name || isPending
                    }
                  >
                    {isPending ? "Eliminazione..." : "Elimina definitivamente"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * WorkspaceSettings Page
 */
export default function WorkspaceSettings() {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const { currentWorkspace } = useWorkspaceContext();

  // Get tab from URL path or default to "general"
  const tabFromUrl = section || "general";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Update tab when URL changes
  useEffect(() => {
    const tab = section || "general";
    setActiveTab(tab);
  }, [section]);

  // Handle tab change - update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "general") {
      navigate("/workspace/settings");
    } else {
      navigate(`/workspace/settings/${value}`);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            Nessun workspace selezionato
          </h2>
          <p className="text-muted-foreground mb-4">
            Seleziona un workspace per accedere alle impostazioni.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <div className="max-w-3xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            {currentWorkspace.logoUrl ? (
              <img
                src={currentWorkspace.logoUrl}
                alt={currentWorkspace.name}
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold"
                style={{
                  backgroundColor: currentWorkspace.primaryColor ?? "#64a42e",
                }}
              >
                {currentWorkspace.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold">
                {currentWorkspace.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Impostazioni workspace
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <TabsList className="bg-white border border-neutral-200 p-1 rounded-xl">
            <TabsTrigger value="general" className="rounded-lg">
              <Settings className="w-4 h-4 mr-2" />
              Generale
            </TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-lg">
              <Palette className="w-4 h-4 mr-2" />
              Aspetto
            </TabsTrigger>
            <TabsTrigger value="members" className="rounded-lg">
              <Users className="w-4 h-4 mr-2" />
              Membri
            </TabsTrigger>
            <TabsTrigger value="rules" className="rounded-lg">
              <FileText className="w-4 h-4 mr-2" />
              Regole
            </TabsTrigger>
            <TabsTrigger
              value="danger"
              className="rounded-lg text-red-600 data-[state=active]:text-red-600"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Zona Pericolosa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettingsTab />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceSettingsTab />
          </TabsContent>

          <TabsContent value="members">
            <MembersSettingsTab />
          </TabsContent>

          <TabsContent value="rules">
            <RulesSettingsTab />
          </TabsContent>

          <TabsContent value="danger">
            <DangerZoneTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
