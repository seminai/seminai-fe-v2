import * as React from "react";
import { useRef } from "react";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import {
  EditableTable,
  type EditableColumn,
  type EditableTable as EditableTableType,
} from "@/components/organism/EditableTable";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { UserOnCompanyRole } from "@/api/userOnCompany";

interface CompanyUsersPanelProps {
  companyId: string;
  companyName: string;
}

const buildUsersColumns = (): EditableColumn[] => {
  return [
    {
      id: "name",
      title: "Nome",
      type: "text",
      required: true,
      placeholder: "es. Mario Rossi",
      readOnly: false,
      render: (value: unknown, row: Record<string, unknown>) => {
        const name = value as string | undefined;
        const email = row.email as string | undefined;
        const initials = name
          ? name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          : "U";

        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-gray-100 text-gray-700 text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-0.5 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {name || "-"}
              </p>
              {email && (
                <p className="text-xs text-gray-500 truncate">{email}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "email",
      title: "Email",
      type: "text",
      required: true,
      placeholder: "es. mario.rossi@example.com",
      readOnly: false,
    },
    {
      id: "role",
      title: "Ruolo",
      type: "select",
      required: true,
      options: [
        { label: "Amministratore", value: "ADMIN" },
        { label: "Editor", value: "EDITOR" },
      ],
      placeholder: "Seleziona ruolo",
      render: (value: unknown) => {
        const role = value as UserOnCompanyRole;
        return (
          <span className="text-sm">
            {role === "ADMIN" ? "Amministratore" : "Editor"}
          </span>
        );
      },
    },
  ];
};

export function CompanyUsersPanel({
  companyId,
}: CompanyUsersPanelProps): React.ReactElement {
  const tableRef = useRef<EditableTableType>(null);

  const {
    users,
    isLoading,
    isError,
    error,
    refetch,
    addUser,
    removeUser,
    updateRole,
  } = useCompanyUsers(companyId);

  const columns = React.useMemo(() => buildUsersColumns(), []);

  const rows = React.useMemo(() => {
    return users.map((user) => {
      const userInfo = user.user;
      const fullName = userInfo
        ? `${userInfo.name} ${userInfo.surname}`.trim()
        : null;

      return {
        id: user.id,
        name: fullName || "",
        email: userInfo?.email || "",
        role: user.role,
        userId: user.userId,
        relationId: user.id,
      };
    });
  }, [users]);

  const handleSave = async (payload: {
    created: Array<Record<string, unknown>>;
    updated: Array<Record<string, unknown>>;
  }): Promise<void> => {
    // Gestione creazione
    if (payload.created.length > 0) {
      const createPromises = payload.created.map(async (row) => {
        await addUser({
          email: String(row.email || ""),
          name: String(row.name || ""),
          role: (row.role as UserOnCompanyRole) || "EDITOR",
        });
      });

      await Promise.all(createPromises);
    }

    // Gestione aggiornamento (solo ruolo può essere modificato)
    if (payload.updated.length > 0) {
      const updatePromises = payload.updated.map(async (row) => {
        const relationId = String(row.relationId || row.id || "");
        if (!relationId) {
          return;
        }

        const newRole = row.role as UserOnCompanyRole | undefined;
        if (newRole) {
          await updateRole({ relationId, role: newRole });
        }
      });

      await Promise.all(updatePromises);
    }
  };

  const handleDelete = async (
    removed: Array<Record<string, unknown>>
  ): Promise<void> => {
    const deletePromises = removed.map(async (row) => {
      const userId = row.userId as string | undefined;
      if (userId) {
        await removeUser(userId);
      }
    });

    await Promise.all(deletePromises);
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 p-4 text-red-700">
          <p className="text-sm font-semibold">
            Impossibile caricare gli utenti dell&apos;azienda.
          </p>
          {error?.message && (
            <p className="text-xs text-red-600/80">{error.message}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch();
            }}
            className="border-red-200 text-red-700 hover:bg-red-100/60"
          >
            Riprova
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-agri-green-700">
        <Spinner size={28} ariaLabel="Caricamento utenti" />
        <p className="text-sm">Caricamento utenti in corso…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <EditableTable
          ref={tableRef}
          columns={columns}
          rows={rows}
          isModify={true}
          addButton={true}
          getRowId={(row, index) =>
            (typeof row.id === "string" && row.id) || index
          }
          onSave={handleSave}
          onDeleteSelected={handleDelete}
          exportFileName="utenti"
          newRowDefaults={{
            name: "",
            email: "",
            role: "EDITOR",
          }}
          className="bg-white"
        />
      </div>
    </div>
  );
}
