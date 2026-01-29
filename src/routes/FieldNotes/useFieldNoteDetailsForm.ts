import { useEffect, useMemo, useState } from "react";
import type { FieldNote } from "@/api/field-notes";
import { FieldNoteCategory, FieldNoteStatus } from "@/api/field-notes";

export interface FieldNoteDetailsFormState {
  category: string;
  rawContent: string;
  status: string;
  operationDate: string;
  selectedCompanyId: string;
  selectedProductionUnitIds: string[];
  selectedFieldIds: string[];
  selectedProductId: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
}

export interface FieldNoteDetailsFormActions {
  setCategory: (value: string) => void;
  setRawContent: (value: string) => void;
  setStatus: (value: string) => void;
  setOperationDate: (value: string) => void;
  setSelectedCompanyId: (value: string) => void;
  setSelectedProductionUnitIds: (value: string[]) => void;
  setSelectedFieldIds: (value: string[]) => void;
  setSelectedProductId: (value: string) => void;
  setLatitude: (value: number | null) => void;
  setLongitude: (value: number | null) => void;
  setNotes: (value: string) => void;
}

export interface FieldNoteDetailsFormOptions {
  companyOptions: Array<{ label: string; value: string }>;
  productionUnitOptions: Array<{ label: string; value: string }>;
  fieldOptions: Array<{ label: string; value: string }>;
  productOptions: Array<{ label: string; value: string }>;
}

export interface FieldNoteDetailsFormDerived {
  filteredProductionUnits: Array<{
    productionUnit: { id: string; name: string };
    companyId: string;
    fields?: Array<{ id: string; name: string }>;
  }>;
  availableFields: Array<{ id: string; name: string }>;
}

interface UseFieldNoteDetailsFormInput {
  fieldNote: FieldNote | null;
  open: boolean;
  companies: Array<{ id: string; name: string }>;
  productionUnits: Array<{
    productionUnit: { id: string; name: string };
    companyId: string;
    fields?: Array<{ id: string; name: string }>;
  }>;
  products: Array<{ id: string; name: string }>;
}

export function useFieldNoteDetailsForm({
  fieldNote,
  open,
  companies,
  productionUnits,
  products,
}: UseFieldNoteDetailsFormInput) {
  const [category, setCategory] = useState<string>(FieldNoteCategory.OPERATION);
  const [rawContent, setRawContent] = useState<string>("");
  const [status, setStatus] = useState<string>(FieldNoteStatus.PENDING);
  const [operationDate, setOperationDate] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedProductionUnitIds, setSelectedProductionUnitIds] = useState<
    string[]
  >([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!fieldNote || !open) {
      return;
    }

    setCategory(fieldNote.category);
    setRawContent(fieldNote.rawContent || "");
    setStatus(fieldNote.status);
    setOperationDate(
      fieldNote.operationDate
        ? new Date(fieldNote.operationDate).toISOString().split("T")[0]
        : ""
    );
    setSelectedProductId(fieldNote.productId || "");
    setLatitude(fieldNote.latitude);
    setLongitude(fieldNote.longitude);
    setNotes(fieldNote.notes || "");

    let companyIdToSet = "";
    if (fieldNote.company?.id) {
      companyIdToSet = fieldNote.company.id;
    } else if (
      fieldNote.field &&
      !Array.isArray(fieldNote.field) &&
      fieldNote.field.company?.id
    ) {
      companyIdToSet = fieldNote.field.company.id;
    } else if (fieldNote.product?.company?.id) {
      companyIdToSet = fieldNote.product.company.id;
    } else if (fieldNote.productionUnit?.company?.id) {
      companyIdToSet = fieldNote.productionUnit.company.id;
    }

    const productionUnitIdsToSet: string[] = [];
    if (fieldNote.productionUnitId) {
      productionUnitIdsToSet.push(fieldNote.productionUnitId);
    }
    if (
      fieldNote.productionUnit?.id &&
      !productionUnitIdsToSet.includes(fieldNote.productionUnit.id)
    ) {
      productionUnitIdsToSet.push(fieldNote.productionUnit.id);
    }

    const fieldIdsToSet: string[] = [];
    if (fieldNote.fieldId) {
      fieldIdsToSet.push(fieldNote.fieldId);
    }
    if (Array.isArray(fieldNote.field)) {
      fieldNote.field.forEach((field) => {
        if (field.id && !fieldIdsToSet.includes(field.id)) {
          fieldIdsToSet.push(field.id);
        }
      });
    } else if (fieldNote.field?.id && !fieldIdsToSet.includes(fieldNote.field.id)) {
      fieldIdsToSet.push(fieldNote.field.id);
    }

    setSelectedCompanyId(companyIdToSet);
    setSelectedProductionUnitIds(productionUnitIdsToSet);
    setSelectedFieldIds(fieldIdsToSet);
  }, [fieldNote, open]);

  useEffect(() => {
    // Only reset if we have a company selected AND the current production units
    // don't belong to that company AND we actually have something to reset
    if (
      selectedCompanyId &&
      selectedProductionUnitIds.length > 0 &&
      !productionUnits.some(
        (pu) =>
          pu.companyId === selectedCompanyId &&
          selectedProductionUnitIds.includes(pu.productionUnit.id)
      )
    ) {
      setSelectedProductionUnitIds([]);
      setSelectedFieldIds([]);
    }
  }, [selectedCompanyId, selectedProductionUnitIds.length, productionUnits]);

  const filteredProductionUnits = useMemo(() => {
    if (!selectedCompanyId) return [];
    return productionUnits.filter((pu) => pu.companyId === selectedCompanyId);
  }, [selectedCompanyId, productionUnits]);

  const availableFields = useMemo(() => {
    const allFields: Array<{ id: string; name: string }> = [];

    // Fields from selected production units
    selectedProductionUnitIds.forEach((puId) => {
      const selectedPU = productionUnits.find(
        (pu) => pu.productionUnit.id === puId
      );
      if (selectedPU?.fields) {
        selectedPU.fields.forEach((field) => {
          if (!allFields.some((existing) => existing.id === field.id)) {
            allFields.push(field);
          }
        });
      }
    });

    // Include fields already on the field note (e.g. from API / extractedData) so they are always available for display and selection
    if (fieldNote?.field) {
      const noteFields = Array.isArray(fieldNote.field)
        ? fieldNote.field
        : [fieldNote.field];
      noteFields.forEach((f) => {
        if (f?.id && f?.name && !allFields.some((existing) => existing.id === f.id)) {
          allFields.push({ id: f.id, name: f.name });
        }
      });
    }

    return allFields;
  }, [selectedProductionUnitIds, productionUnits, fieldNote]);

  const companyOptions = useMemo(
    () =>
      companies.map((company) => ({
        label: company.name,
        value: company.id,
      })),
    [companies]
  );

  const productionUnitOptions = useMemo(() => {
    const options = filteredProductionUnits.map((pu) => ({
      label: pu.productionUnit.name,
      value: pu.productionUnit.id,
    }));
    // Include the field note's production unit so it is always available for display when present
    if (
      fieldNote?.productionUnit?.id &&
      fieldNote.productionUnit.name &&
      !options.some((o) => o.value === fieldNote.productionUnit!.id)
    ) {
      options.push({
        label: fieldNote.productionUnit.name,
        value: fieldNote.productionUnit.id,
      });
    }
    return options;
  }, [filteredProductionUnits, fieldNote]);

  const fieldOptions = useMemo(
    () =>
      availableFields.map((field) => ({
        label: field.name,
        value: field.id,
      })),
    [availableFields]
  );

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        label: product.name,
        value: product.id,
      })),
    [products]
  );

  const formState: FieldNoteDetailsFormState = {
    category,
    rawContent,
    status,
    operationDate,
    selectedCompanyId,
    selectedProductionUnitIds,
    selectedFieldIds,
    selectedProductId,
    latitude,
    longitude,
    notes,
  };

  const formActions: FieldNoteDetailsFormActions = {
    setCategory,
    setRawContent,
    setStatus,
    setOperationDate,
    setSelectedCompanyId,
    setSelectedProductionUnitIds,
    setSelectedFieldIds,
    setSelectedProductId,
    setLatitude,
    setLongitude,
    setNotes,
  };

  const formOptions: FieldNoteDetailsFormOptions = {
    companyOptions,
    productionUnitOptions,
    fieldOptions,
    productOptions,
  };

  const formDerived: FieldNoteDetailsFormDerived = {
    filteredProductionUnits,
    availableFields,
  };

  return { formState, formActions, formOptions, formDerived };
}
