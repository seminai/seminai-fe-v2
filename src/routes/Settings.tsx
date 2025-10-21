import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Spinner } from "@/components/ui/spinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import authService from "@/utils/auth";
import {
  updateCurrentUserWithBearer,
  type UpdateCurrentUserRequest,
} from "@/api/users";
import { uploadProfilePictureWithBearer } from "@/api/users";
import { InputFile } from "@/components/ui/input-file";
import {
  updatePasswordWithBearer,
  type UpdatePasswordRequest,
} from "@/api/auth";
import {
  createEditableUserState,
  updateEditableField,
  isEditableDirty,
  diffEditable,
  type EditableUserState,
} from "@/utils/user-edit";

export default function Settings() {
  const { data, isLoading, error } = useCurrentUser();
  const queryClient = useQueryClient();

  const userData = data?.data.user;
  const [editable, setEditable] = React.useState<EditableUserState | null>(
    userData ? createEditableUserState(userData) : null
  );

  React.useEffect(() => {
    if (userData) {
      setEditable(createEditableUserState(userData));
    }
  }, [userData]);

  const { mutateAsync: saveAsync, isPending: isSaving } = useMutation({
    mutationFn: async (payload: UpdateCurrentUserRequest) => {
      const token = authService.getAuthToken();
      if (!token) throw new Error("Unauthorized");
      return await updateCurrentUserWithBearer(token, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      toast.success("Settings saved successfully");
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Update failed";
      toast.error(message);
    },
  });

  const { mutateAsync: uploadAsync, isPending: isUploading } = useMutation({
    mutationFn: async (file: File) => {
      const token = authService.getAuthToken();
      if (!token) throw new Error("Unauthorized");
      return await uploadProfilePictureWithBearer(token, file);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      toast.success("Foto profilo aggiornata");
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Upload failed";
      toast.error(message);
    },
  });

  const [passwords, setPasswords] = React.useState<UpdatePasswordRequest>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { mutateAsync: changePasswordAsync, isPending: isChangingPassword } =
    useMutation({
      mutationFn: async (payload: UpdatePasswordRequest) => {
        const token = authService.getAuthToken();
        if (!token) throw new Error("Unauthorized");
        return await updatePasswordWithBearer(token, payload);
      },
      onSuccess: () => {
        toast.success("Password aggiornata");
        setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      },
      onError: (e: unknown) => {
        const message =
          e instanceof Error ? e.message : "Password update failed";
        toast.error(message);
      },
    });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Impostazioni</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size={20} ariaLabel="Caricamento dati utente" />
          <span>Caricamento dati utente…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Impostazioni</h1>
        <div className="text-sm text-red-600">
          Impossibile caricare i dati utente.
        </div>
      </div>
    );
  }

  const user = data.data.user;
  const initials = `${user.name?.[0] ?? ""}${
    user.surname?.[0] ?? ""
  }`.toUpperCase();
  const current = editable?.current;
  const isDirty = editable ? isEditableDirty(editable) : false;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Impostazioni</h1>

      <div className="flex justify-end mb-4">
        {isDirty && (
          <Button
            onClick={async () => {
              if (!editable) return;
              const payload = diffEditable(editable);
              await saveAsync(payload);
            }}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? "Salvataggio…" : "Salva"}
          </Button>
        )}
      </div>

      <Card className="p-6 flex items-center gap-4 shadow-none">
        <Avatar className="size-16">
          <AvatarImage
            src={current?.profilePictureUrl}
            alt={`${user.name} ${user.surname}`}
          />
          <AvatarFallback>{initials || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="text-lg font-medium">
            {(current?.name ?? "") + " " + (current?.surname ?? "")}
          </div>
          <div className="text-gray-600 text-sm">{user.email}</div>
          <div className="text-gray-600 text-sm">{current?.companyName}</div>
        </div>
        <div>
          <InputFile
            id="profilePictureUpload"
            label="Foto profilo"
            accept="image/*"
            disabled={isUploading}
            onChange={async (file) => {
              if (!file) return;
              await uploadAsync(file);
            }}
          />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Card className="p-4 shadow-none">
          <h2 className="font-medium mb-4">Informazioni personali</h2>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={current?.name ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "name", e.target.value)
                      : prev
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="surname">Cognome</Label>
              <Input
                id="surname"
                value={current?.surname ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "surname", e.target.value)
                      : prev
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fiscalCode">Codice fiscale</Label>
              <Input
                id="fiscalCode"
                value={current?.fiscalCode ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "fiscalCode", e.target.value)
                      : prev
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phoneNumber">Telefono</Label>
              <Input
                id="phoneNumber"
                value={current?.phoneNumber ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "phoneNumber", e.target.value)
                      : prev
                  )
                }
              />
            </div>
            {/* URL manuale rimosso: gestito via upload file sopra */}
          </div>
        </Card>
        <Card className="p-4 shadow-none">
          <h2 className="font-medium mb-4">Dati aziendali</h2>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="companyName">Ragione sociale</Label>
              <Input
                id="companyName"
                value={current?.companyName ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "companyName", e.target.value)
                      : prev
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vatNumber">P. IVA</Label>
              <Input
                id="vatNumber"
                value={current?.vatNumber ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "vatNumber", e.target.value)
                      : prev
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="address">Indirizzo</Label>
              <Input
                id="address"
                value={current?.address ?? ""}
                onChange={(e) =>
                  setEditable((prev) =>
                    prev
                      ? updateEditableField(prev, "address", e.target.value)
                      : prev
                  )
                }
              />
            </div>
          </div>
        </Card>
        <Card className="p-4 md:col-span-2 shadow-none">
          <h2 className="font-medium mb-4">Cambia password</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="oldPassword">Password attuale</Label>
              <Input
                id="oldPassword"
                type="password"
                value={passwords.oldPassword}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, oldPassword: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="newPassword">Nuova password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, newPassword: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirmPassword">Conferma password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords((p) => ({
                    ...p,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              disabled={
                isChangingPassword ||
                !passwords.oldPassword ||
                !passwords.newPassword ||
                passwords.newPassword !== passwords.confirmPassword
              }
              onClick={async () => {
                if (passwords.newPassword !== passwords.confirmPassword) {
                  toast.error("Le password non coincidono");
                  return;
                }
                await changePasswordAsync(passwords);
              }}
            >
              {isChangingPassword ? "Aggiornamento…" : "Cambia password"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
