import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FieldNote, FieldNoteAttachment } from "@/api/field-notes";
import {
  fieldNoteAttachmentsApiService,
  type UploadFieldNoteAttachmentRequest,
} from "@/api/field-note-attachments";

type UploadAttachmentInput = UploadFieldNoteAttachmentRequest;

function appendAttachment(
  note: FieldNote,
  attachment: FieldNoteAttachment
): FieldNote {
  const existing = Array.isArray(note.attachments) ? note.attachments : [];
  return {
    ...note,
    attachments: [...existing, attachment],
  };
}

function updateFieldNotesCache(
  oldData: unknown,
  fieldNoteId: string,
  attachment: FieldNoteAttachment
): unknown {
  if (!oldData) return oldData;

  if (Array.isArray(oldData)) {
    return oldData.map((note) =>
      note.id === fieldNoteId ? appendAttachment(note, attachment) : note
    );
  }

  if (
    typeof oldData === "object" &&
    oldData !== null &&
    "fieldNotes" in oldData &&
    Array.isArray((oldData as { fieldNotes?: FieldNote[] }).fieldNotes)
  ) {
    const data = oldData as { fieldNotes: FieldNote[] };
    return {
      ...data,
      fieldNotes: data.fieldNotes.map((note) =>
        note.id === fieldNoteId ? appendAttachment(note, attachment) : note
      ),
    };
  }

  return oldData;
}

export function useUploadFieldNoteAttachmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadAttachmentInput) =>
      fieldNoteAttachmentsApiService.uploadAttachment(input),
    onSuccess: (attachment, variables) => {
      queryClient.setQueryData(
        ["field-note", variables.fieldNoteId],
        (oldData: FieldNote | undefined) =>
          oldData ? appendAttachment(oldData, attachment) : oldData
      );

      queryClient.setQueriesData(
        { queryKey: ["field-notes"] },
        (oldData: unknown) =>
          updateFieldNotesCache(oldData, variables.fieldNoteId, attachment)
      );
    },
  });
}
