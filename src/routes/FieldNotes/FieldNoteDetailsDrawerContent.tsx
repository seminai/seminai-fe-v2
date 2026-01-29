import type { FieldNote, FieldNoteAttachment } from "@/api/field-notes";
import type {
  FieldNoteDetailsFormActions,
  FieldNoteDetailsFormDerived,
  FieldNoteDetailsFormOptions,
  FieldNoteDetailsFormState,
} from "./useFieldNoteDetailsForm";
import {
  FieldNoteExtraSection,
  FieldNoteMetaSection,
  FieldNoteRelationsSection,
} from "./FieldNoteDetailsDrawerSections";

interface FieldNoteDetailsDrawerContentProps {
  fieldNote: FieldNote;
  formState: FieldNoteDetailsFormState;
  formActions: FieldNoteDetailsFormActions;
  formOptions: FieldNoteDetailsFormOptions;
  formDerived: FieldNoteDetailsFormDerived;
  attachments: FieldNoteAttachment[];
  isGettingLocation: boolean;
  onGetLocation: () => void;
  onUploadAttachment: (file: File) => Promise<void>;
  isUploadingAttachment: boolean;
}

export function FieldNoteDetailsDrawerContent({
  fieldNote,
  formState,
  formActions,
  formOptions,
  formDerived,
  attachments,
  isGettingLocation,
  onGetLocation,
  onUploadAttachment,
  isUploadingAttachment,
}: FieldNoteDetailsDrawerContentProps) {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overflow-x-hidden max-h-[calc(100svh-180px)]">
      <FieldNoteMetaSection
        fieldNote={fieldNote}
        formState={formState}
        formActions={formActions}
      />

      <FieldNoteRelationsSection
        formState={formState}
        formActions={formActions}
        formOptions={formOptions}
        formDerived={formDerived}
      />

      <FieldNoteExtraSection
        fieldNote={fieldNote}
        formState={formState}
        formActions={formActions}
        attachments={attachments}
        isGettingLocation={isGettingLocation}
        onGetLocation={onGetLocation}
        onUploadAttachment={onUploadAttachment}
        isUploadingAttachment={isUploadingAttachment}
      />
    </div>
  );
}
