import * as React from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/organism/Header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  EditableTable,
  type EditableColumn,
} from "@/components/organism/EditableTable";
import {
  type ExtractedCompany,
  type ExtractedField,
  type ExtractedProductionUnit,
  type ExtractFromCsvResponse,
  quickCreateApiService,
} from "@/api/quick-create";
import { useCompanies } from "@/hooks/useCompanies";
import { cn } from "@/lib/utils";
import {
  IoCloudUploadOutline,
  IoCheckmarkCircle,
  IoArrowBack,
  IoArrowForward,
  IoAddCircleOutline,
} from "react-icons/io5";

/**
 * Represents the current step in the quick create wizard
 */
type WizardStep =
  | "select-company"
  | "upload"
  | "company"
  | "fields"
  | "production-units";

/**
 * Controller for the quick create wizard state
 */
class QuickCreateWizardController {
  private static readonly STEPS: WizardStep[] = [
    "select-company",
    "upload",
    "company",
    "fields",
    "production-units",
  ];

  public getStepIndex(step: WizardStep): number {
    return QuickCreateWizardController.STEPS.indexOf(step);
  }

  public getNextStep(currentStep: WizardStep): WizardStep | null {
    const currentIndex = this.getStepIndex(currentStep);
    if (currentIndex < QuickCreateWizardController.STEPS.length - 1) {
      return QuickCreateWizardController.STEPS[currentIndex + 1];
    }
    return null;
  }

  public getPreviousStep(currentStep: WizardStep): WizardStep | null {
    const currentIndex = this.getStepIndex(currentStep);
    if (currentIndex > 0) {
      return QuickCreateWizardController.STEPS[currentIndex - 1];
    }
    return null;
  }

  public isFirstStep(step: WizardStep): boolean {
    return step === "select-company";
  }

  public isLastStep(step: WizardStep): boolean {
    return step === "production-units";
  }

  public getStepTitle(step: WizardStep): string {
    switch (step) {
      case "select-company":
        return "Seleziona Azienda";
      case "upload":
        return "Carica File";
      case "company":
        return "Conferma Azienda";
      case "fields":
        return "Conferma Campi";
      case "production-units":
        return "Conferma Unità Produttive";
    }
  }

  public getActionButtonLabel(step: WizardStep): string {
    switch (step) {
      case "select-company":
        return "Continua";
      case "upload":
        return "Carica";
      case "company":
      case "fields":
        return "Conferma";
      case "production-units":
        return "Salva";
    }
  }
}

/**
 * Configuration for the company table columns
 */
const COMPANY_COLUMNS: EditableColumn[] = [
  { id: "name", title: "Nome Azienda", type: "text", required: true },
  { id: "fiscalCode", title: "Codice Fiscale", type: "text" },
  { id: "vatNumber", title: "Partita IVA", type: "text" },
  { id: "cuaa", title: "CUAA", type: "text" },
  { id: "nation", title: "Nazione", type: "text" },
  { id: "region", title: "Regione", type: "text" },
  { id: "city", title: "Città", type: "text" },
  { id: "address", title: "Indirizzo", type: "text" },
  { id: "cap", title: "CAP", type: "text" },
];

/**
 * Configuration for the fields table columns
 */
const FIELDS_COLUMNS: EditableColumn[] = [
  {
    id: "name",
    title: "Nome Campo",
    type: "text",
    required: true,
    width: "200px",
  },
  { id: "city", title: "Città", type: "text", width: "150px" },
  { id: "foglio", title: "Foglio", type: "text", width: "80px" },
  { id: "particella", title: "Particella", type: "text", width: "100px" },
  { id: "sezione", title: "Sezione", type: "text", width: "80px" },
  { id: "subalterno", title: "Subalterno", type: "text", width: "100px" },
  { id: "uso", title: "Uso", type: "text", width: "150px" },
  {
    id: "superficieCatastaleMq",
    title: "Superficie (mq)",
    type: "number",
    width: "120px",
    render: (value: unknown) => {
      if (value === null || value === undefined) return "-";
      const num = typeof value === "number" ? value : Number(value);
      return isNaN(num) ? "-" : num.toLocaleString("it-IT");
    },
  },
  {
    id: "gisHa",
    title: "Superficie GIS (ha)",
    type: "number",
    width: "120px",
    render: (value: unknown) => {
      if (value === null || value === undefined) return "-";
      const num = typeof value === "number" ? value : Number(value);
      return isNaN(num)
        ? "-"
        : num.toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          });
    },
  },
  {
    id: "inizioConduzione",
    title: "Inizio Conduzione",
    type: "text",
    width: "130px",
  },
  {
    id: "fineConduzione",
    title: "Fine Conduzione",
    type: "text",
    width: "130px",
  },
  { id: "latitude", title: "Latitudine", type: "number", width: "100px" },
  { id: "longitude", title: "Longitudine", type: "number", width: "100px" },
];

/**
 * Configuration for the production units table columns
 */
const PRODUCTION_UNITS_COLUMNS: EditableColumn[] = [
  { id: "name", title: "Nome", type: "text", required: true, width: "200px" },
  { id: "foglio", title: "Foglio", type: "text", width: "80px" },
  { id: "particella", title: "Particella", type: "text", width: "100px" },
  { id: "sezione", title: "Sezione", type: "text", width: "80px" },
  { id: "subalterno", title: "Subalterno", type: "text", width: "100px" },
  {
    id: "areaHa",
    title: "Area (ha)",
    type: "number",
    width: "120px",
    render: (value: unknown) => {
      if (value === null || value === undefined) return "-";
      const num = typeof value === "number" ? value : Number(value);
      return isNaN(num)
        ? "-"
        : num.toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          });
    },
  },
  { id: "startDate", title: "Data Inizio", type: "text", width: "120px" },
  { id: "endDate", title: "Data Fine", type: "text", width: "120px" },
  { id: "protocoll", title: "Protocollo", type: "text", width: "120px" },
  {
    id: "cropName",
    title: "Coltura",
    type: "text",
    width: "200px",
    render: (_value: unknown, row: Record<string, unknown>) => {
      const cycles = row.cycles;
      if (!cycles || !Array.isArray(cycles) || cycles.length === 0) return "-";
      const firstCycle = cycles[0];
      if (typeof firstCycle === "object" && firstCycle !== null) {
        const cropName = (firstCycle as Record<string, unknown>).cropName;
        return cropName ? String(cropName) : "-";
      }
      return "-";
    },
  },
  {
    id: "cropCode",
    title: "Codice Coltura",
    type: "text",
    width: "150px",
    render: (_value: unknown, row: Record<string, unknown>) => {
      const cycles = row.cycles;
      if (!cycles || !Array.isArray(cycles) || cycles.length === 0) return "-";
      const firstCycle = cycles[0];
      if (typeof firstCycle === "object" && firstCycle !== null) {
        const cropCode = (firstCycle as Record<string, unknown>).cropCode;
        return cropCode ? String(cropCode) : "-";
      }
      return "-";
    },
  },
  {
    id: "fieldName",
    title: "Campo Associato",
    type: "text",
    width: "200px",
    readOnly: true,
    render: (_value: unknown, row: Record<string, unknown>) => {
      // Try to get fieldName from allocations first
      const allocations = row.allocations;
      if (allocations && Array.isArray(allocations) && allocations.length > 0) {
        const firstAllocation = allocations[0];
        if (typeof firstAllocation === "object" && firstAllocation !== null) {
          const fieldName = (firstAllocation as Record<string, unknown>)
            .fieldName;
          // If fieldName is an object, try to get the name property
          if (fieldName && typeof fieldName === "object") {
            const name = (fieldName as Record<string, unknown>).name;
            return name ? String(name) : "-";
          }
          return fieldName ? String(fieldName) : "-";
        }
      }
      // Fallback: try to get name directly from row if it's a field reference
      const fieldName = row.fieldName;
      if (fieldName && typeof fieldName === "object") {
        const name = (fieldName as Record<string, unknown>).name;
        return name ? String(name) : "-";
      }
      return fieldName ? String(fieldName) : "-";
    },
    // Override value extraction for filtering to avoid [object Object]
    onValueChange: undefined,
  },
];

/**
 * Props for the file drop zone component
 */
interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  isDisabled: boolean;
}

/**
 * File drop zone component for drag and drop file upload
 */
function FileDropZone({
  onFileSelect,
  isDisabled,
}: FileDropZoneProps): React.ReactElement {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDisabled) {
        setIsDragging(true);
      }
    },
    [isDisabled]
  );

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isDisabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (isValidFileType(file)) {
          onFileSelect(file);
        }
      }
    },
    [isDisabled, onFileSelect]
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleClick = React.useCallback(() => {
    if (!isDisabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [isDisabled]);

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center w-full max-w-2xl mx-auto",
        "min-h-[400px] p-12 rounded-3xl border-2 border-dashed transition-all duration-300",
        "cursor-pointer",
        isDragging
          ? "border-agri-green-500 bg-agri-green-50/50 scale-[1.02]"
          : "border-neutral-300 hover:border-agri-green-400 hover:bg-neutral-50",
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleInputChange}
        className="hidden"
        disabled={isDisabled}
      />

      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            "flex items-center justify-center w-24 h-24 rounded-full mb-6 transition-colors",
            isDragging ? "bg-agri-green-100" : "bg-neutral-100"
          )}
        >
          <IoCloudUploadOutline
            className={cn(
              "w-12 h-12 transition-colors",
              isDragging ? "text-agri-green-600" : "text-neutral-400"
            )}
          />
        </div>

        <h3 className="text-xl font-semibold text-neutral-800 mb-2">
          {isDragging ? "Rilascia il file qui" : "Trascina il file qui"}
        </h3>
        <p className="text-neutral-500 mb-4">
          oppure clicca per selezionare un file
        </p>
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <span className="px-2 py-1 bg-neutral-100 rounded-md">.csv</span>
          <span className="px-2 py-1 bg-neutral-100 rounded-md">.xlsx</span>
          <span className="px-2 py-1 bg-neutral-100 rounded-md">.xls</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Check if the file type is valid
 */
function isValidFileType(file: File): boolean {
  const validTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const validExtensions = [".csv", ".xlsx", ".xls"];
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return validTypes.includes(file.type) || validExtensions.includes(extension);
}

/**
 * Props for the loading overlay component
 */
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

/**
 * Loading component with logo spinner - displayed in the main content area
 */
function LoadingContent({
  isVisible,
  message = "Elaborazione in corso...",
}: LoadingOverlayProps): React.ReactElement | null {
  if (!isVisible) return null;

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6">
        <Spinner size={80} speed="normal" />
        <p className="text-lg text-neutral-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

/**
 * Props for the stepper indicator component
 */
interface StepperIndicatorProps {
  currentStep: WizardStep;
  controller: QuickCreateWizardController;
}

/**
 * Stepper indicator showing progress through wizard steps
 */
function StepperIndicator({
  currentStep,
  controller,
}: StepperIndicatorProps): React.ReactElement {
  const steps: Array<{ key: WizardStep; label: string }> = [
    { key: "company", label: "Azienda" },
    { key: "fields", label: "Campi" },
    { key: "production-units", label: "Unità Produttive" },
  ];

  // Don't show stepper for select-company or upload steps
  if (currentStep === "select-company" || currentStep === "upload") {
    return <></>;
  }

  const currentIndex = controller.getStepIndex(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        const stepIndex = controller.getStepIndex(step.key);
        const isCompleted = currentIndex > stepIndex;
        const isCurrent = step.key === currentStep;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                  isCompleted
                    ? "bg-agri-green-600 border-agri-green-600 text-white"
                    : isCurrent
                    ? "bg-white border-agri-green-600 text-agri-green-600"
                    : "bg-white border-neutral-300 text-neutral-400"
                )}
              >
                {isCompleted ? (
                  <IoCheckmarkCircle className="w-6 h-6" />
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isCurrent ? "text-agri-green-700" : "text-neutral-500"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-24 h-0.5 mb-8",
                  currentIndex > stepIndex + 1
                    ? "bg-agri-green-600"
                    : "bg-neutral-200"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Props for the wizard footer component
 */
interface WizardFooterProps {
  currentStep: WizardStep;
  controller: QuickCreateWizardController;
  onCancel: () => void;
  onAction: () => void;
  isActionDisabled: boolean;
  isLoading: boolean;
}

/**
 * Footer component for wizard navigation
 */
function WizardFooter({
  currentStep,
  controller,
  onCancel,
  onAction,
  isActionDisabled,
  isLoading,
}: WizardFooterProps): React.ReactElement {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex-shrink-0 bg-white border-t border-neutral-200 py-4 px-6 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
          className="gap-2"
        >
          <IoArrowBack className="w-4 h-4" />
          Annulla
        </Button>
        <Button
          onClick={onAction}
          disabled={isActionDisabled || isLoading}
          className="gap-2"
        >
          {controller.getActionButtonLabel(currentStep)}
          {!controller.isLastStep(currentStep) && (
            <IoArrowForward className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Main quick create page component
 */
export default function QuickCreatePage(): React.ReactElement {
  const navigate = useNavigate();
  const controller = React.useMemo(() => new QuickCreateWizardController(), []);

  // State
  const [currentStep, setCurrentStep] =
    React.useState<WizardStep>("select-company");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [showCreateCompanyForm, setShowCreateCompanyForm] =
    React.useState(false);
  const [newCompanyName, setNewCompanyName] = React.useState("");
  const [newCompanyVatNumber, setNewCompanyVatNumber] = React.useState("");
  const [newCompanyFiscalCode, setNewCompanyFiscalCode] = React.useState("");
  const [newCompanyCuaa, setNewCompanyCuaa] = React.useState("");

  // Extracted data
  const [companyData, setCompanyData] = React.useState<ExtractedCompany | null>(
    null
  );
  const [fieldsData, setFieldsData] = React.useState<ExtractedField[]>([]);
  const [productionUnitsData, setProductionUnitsData] = React.useState<
    ExtractedProductionUnit[]
  >([]);

  // Companies hook
  const {
    companies,
    isLoading: isLoadingCompanies,
    createCompanies,
    isCreating: isCreatingCompany,
  } = useCompanies({
    onCreateSuccess: (response) => {
      if (response.data.companies.length > 0) {
        setSelectedCompanyId(response.data.companies[0].id);
        setShowCreateCompanyForm(false);
        setNewCompanyName("");
        setNewCompanyVatNumber("");
        setNewCompanyFiscalCode("");
        setNewCompanyCuaa("");
      }
    },
  });

  /**
   * Handle file selection
   */
  const handleFileSelect = React.useCallback((file: File) => {
    setSelectedFile(file);
    setError(null);
  }, []);

  /**
   * Handle file upload and extraction
   */
  const handleUpload = React.useCallback(async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const response: ExtractFromCsvResponse =
        await quickCreateApiService.extractFromCsv(
          selectedFile,
          selectedCompanyId || undefined
        );

      setCompanyData(response.data.company);
      setFieldsData(response.data.fields);
      setProductionUnitsData(response.data.productionUnits);
      setCurrentStep("company");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante l'elaborazione del file"
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, selectedCompanyId]);

  /**
   * Handle save all data
   */
  const handleSave = React.useCallback(async () => {
    if (!companyData) return;

    setIsSaving(true);
    setError(null);

    try {
      await quickCreateApiService.createWithData({
        companyId: selectedCompanyId || undefined,
        company: companyData,
        fields: fieldsData,
        productionUnits: productionUnitsData,
      });

      // Navigate to company page after successful save
      navigate("/company");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore durante il salvataggio"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    companyData,
    fieldsData,
    productionUnitsData,
    selectedCompanyId,
    navigate,
  ]);

  /**
   * Handle action button click based on current step
   */
  const handleAction = React.useCallback(() => {
    if (currentStep === "upload") {
      handleUpload();
      return;
    }

    if (controller.isLastStep(currentStep)) {
      handleSave();
      return;
    }

    const nextStep = controller.getNextStep(currentStep);
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  }, [currentStep, controller, handleUpload, handleSave]);

  /**
   * Handle cancel button click
   */
  const handleCancel = React.useCallback(() => {
    if (currentStep === "upload") {
      navigate(-1);
      return;
    }

    const previousStep = controller.getPreviousStep(currentStep);
    if (previousStep) {
      setCurrentStep(previousStep);
    }
  }, [currentStep, controller, navigate]);

  /**
   * Determine if action button should be disabled
   */
  const isActionDisabled = React.useMemo(() => {
    if (currentStep === "select-company") {
      return false; // Company selection is optional
    }
    if (currentStep === "upload") {
      return !selectedFile;
    }
    return false;
  }, [currentStep, selectedFile]);

  /**
   * Handle company table save
   */
  const handleCompanySave = React.useCallback(
    (payload: {
      created: Array<Record<string, unknown>>;
      updated: Array<Record<string, unknown>>;
    }) => {
      if (payload.updated.length > 0) {
        setCompanyData(payload.updated[0] as unknown as ExtractedCompany);
      }
    },
    []
  );

  /**
   * Handle fields table save
   */
  const handleFieldsSave = React.useCallback(
    (payload: {
      created: Array<Record<string, unknown>>;
      updated: Array<Record<string, unknown>>;
    }) => {
      const allFields = [
        ...payload.created,
        ...payload.updated,
      ] as unknown as ExtractedField[];
      if (allFields.length > 0) {
        setFieldsData(allFields);
      }
    },
    []
  );

  /**
   * Handle production units table save
   */
  const handleProductionUnitsSave = React.useCallback(
    (payload: {
      created: Array<Record<string, unknown>>;
      updated: Array<Record<string, unknown>>;
    }) => {
      const allUnits = [
        ...payload.created,
        ...payload.updated,
      ] as unknown as ExtractedProductionUnit[];
      if (allUnits.length > 0) {
        setProductionUnitsData(allUnits);
      }
    },
    []
  );

  /**
   * Company options for searchable select
   */
  const companyOptions = React.useMemo(() => {
    return companies.map((company) => ({
      label: company.name,
      value: company.id,
    }));
  }, [companies]);

  /**
   * Normalize production units data to extract fieldName as string for filtering
   */
  const normalizedProductionUnitsData = React.useMemo(() => {
    return productionUnitsData.map((unit) => {
      const normalized = { ...unit } as Record<string, unknown>;

      // Extract fieldName from allocations as a string
      if (
        normalized.allocations &&
        Array.isArray(normalized.allocations) &&
        normalized.allocations.length > 0
      ) {
        const firstAllocation = normalized.allocations[0];
        if (typeof firstAllocation === "object" && firstAllocation !== null) {
          const fieldName = (firstAllocation as Record<string, unknown>)
            .fieldName;
          if (fieldName && typeof fieldName === "object") {
            // If fieldName is an object, extract the name
            const name = (fieldName as Record<string, unknown>).name;
            normalized.fieldName = name ? String(name) : null;
          } else {
            normalized.fieldName = fieldName ? String(fieldName) : null;
          }
        } else {
          normalized.fieldName = null;
        }
      } else {
        normalized.fieldName = null;
      }

      return normalized;
    });
  }, [productionUnitsData]);

  /**
   * Handle create company
   */
  const handleCreateCompany = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (newCompanyName.trim() && newCompanyFiscalCode.trim()) {
        createCompanies([
          {
            name: newCompanyName.trim(),
            fiscalCode: newCompanyFiscalCode.trim(),
            vatNumber: newCompanyVatNumber.trim() || "",
            cuaa: newCompanyCuaa.trim() || null,
          },
        ]);
      }
    },
    [
      newCompanyName,
      newCompanyFiscalCode,
      newCompanyVatNumber,
      newCompanyCuaa,
      createCompanies,
    ]
  );

  /**
   * Handle toggle create company form
   */
  const handleToggleCreateCompanyForm = React.useCallback(() => {
    setShowCreateCompanyForm((prev) => !prev);
    if (showCreateCompanyForm) {
      setNewCompanyName("");
      setNewCompanyVatNumber("");
      setNewCompanyFiscalCode("");
      setNewCompanyCuaa("");
    }
  }, [showCreateCompanyForm]);

  /**
   * Render page content based on current step
   */
  const renderContent = (): React.ReactNode => {
    switch (currentStep) {
      case "select-company":
        return (
          <div className="flex flex-col items-center justify-center flex-1 p-6">
            <h2 className="text-2xl font-semibold text-neutral-800 mb-2">
              Seleziona Azienda (Opzionale)
            </h2>
            <p className="text-neutral-500 mb-8 text-center max-w-lg">
              Seleziona un'azienda esistente oppure continua senza selezionarne
              una. Puoi anche crearne una nuova.
            </p>
            <div className="w-full max-w-md space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="company-select" className="mb-2 block">
                    Azienda
                  </Label>
                  <SearchableSelect
                    value={selectedCompanyId}
                    options={companyOptions}
                    placeholder="Seleziona un'azienda (opzionale)"
                    searchPlaceholder="Cerca azienda..."
                    emptyMessage="Nessuna azienda trovata"
                    noneOptionLabel="Nessuna selezione"
                    loading={isLoadingCompanies}
                    loadingMessage="Caricamento aziende..."
                    onChange={setSelectedCompanyId}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={handleToggleCreateCompanyForm}
                  title="Crea nuova azienda"
                >
                  <IoAddCircleOutline className="w-5 h-5" />
                </Button>
              </div>

              {/* Create Company Form - Inline */}
              {showCreateCompanyForm && (
                <div className="mt-4 p-6 bg-neutral-50 rounded-xl border border-neutral-200 space-y-4">
                  <h3 className="text-lg font-semibold text-neutral-800 mb-4">
                    Crea Nuova Azienda
                  </h3>
                  <form onSubmit={handleCreateCompany} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-company-name">Nome Azienda *</Label>
                      <Input
                        id="new-company-name"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        placeholder="Nome dell'azienda"
                        required
                        disabled={isCreatingCompany}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-company-vat-number">
                        Partita IVA
                      </Label>
                      <Input
                        id="new-company-vat-number"
                        value={newCompanyVatNumber}
                        onChange={(e) => setNewCompanyVatNumber(e.target.value)}
                        placeholder="Partita IVA"
                        disabled={isCreatingCompany}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-company-fiscal-code">
                        Codice Fiscale *
                      </Label>
                      <Input
                        id="new-company-fiscal-code"
                        value={newCompanyFiscalCode}
                        onChange={(e) =>
                          setNewCompanyFiscalCode(e.target.value)
                        }
                        placeholder="Codice fiscale"
                        required
                        disabled={isCreatingCompany}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-company-cuaa">CUAA</Label>
                      <Input
                        id="new-company-cuaa"
                        value={newCompanyCuaa}
                        onChange={(e) => setNewCompanyCuaa(e.target.value)}
                        placeholder="CUAA"
                        disabled={isCreatingCompany}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleToggleCreateCompanyForm}
                        disabled={isCreatingCompany}
                      >
                        Annulla
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          isCreatingCompany ||
                          !newCompanyName.trim() ||
                          !newCompanyFiscalCode.trim()
                        }
                      >
                        {isCreatingCompany ? (
                          <>
                            <Spinner size={16} className="mr-2" />
                            Creazione...
                          </>
                        ) : (
                          "Crea"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        );

      case "upload":
        return (
          <div className="flex flex-col items-center justify-center flex-1 p-6">
            <h2 className="text-2xl font-semibold text-neutral-800 mb-2">
              Carica File
            </h2>
            <p className="text-neutral-500 mb-8 text-center max-w-lg">
              Carica un file CSV o Excel contenente i dati di azienda, campi e
              unità produttive
            </p>
            <FileDropZone
              onFileSelect={handleFileSelect}
              isDisabled={isLoading}
            />
            {selectedFile && (
              <div className="mt-6 flex items-center gap-3 px-4 py-3 bg-agri-green-50 rounded-xl">
                <IoCheckmarkCircle className="w-5 h-5 text-agri-green-600" />
                <span className="text-agri-green-700 font-medium">
                  {selectedFile.name}
                </span>
              </div>
            )}
            {error && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}
          </div>
        );

      case "company":
        return (
          <div className="flex flex-col flex-1 p-6 pb-24">
            <StepperIndicator
              currentStep={currentStep}
              controller={controller}
            />
            <h2 className="text-xl font-semibold text-neutral-800 mb-6 text-center">
              Conferma i dati dell'azienda
            </h2>
            {companyData && (
              <EditableTable
                columns={COMPANY_COLUMNS}
                rows={[companyData as unknown as Record<string, unknown>]}
                isVertical
                alwaysEdit
                onSave={handleCompanySave}
                getRowId={(row) => (row.fiscalCode as string) || "company"}
                exportFileName="azienda"
              />
            )}
            {error && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}
          </div>
        );

      case "fields":
        return (
          <div className="flex flex-col flex-1 p-6 pb-24">
            <StepperIndicator
              currentStep={currentStep}
              controller={controller}
            />
            <h2 className="text-xl font-semibold text-neutral-800 mb-2 text-center">
              Conferma i campi
            </h2>
            <p className="text-neutral-500 mb-6 text-center">
              {fieldsData.length} campi trovati
            </p>
            <EditableTable
              columns={FIELDS_COLUMNS}
              rows={fieldsData as unknown as Array<Record<string, unknown>>}
              isModify
              alwaysEdit
              addButton
              createMode="inline"
              onSave={handleFieldsSave}
              getRowId={(row, index) =>
                (row.name as string) || `field-${index}`
              }
              showDeleteAction
              exportFileName="campi"
            />
            {error && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}
          </div>
        );

      case "production-units":
        return (
          <div className="flex flex-col flex-1 p-6 pb-24">
            <StepperIndicator
              currentStep={currentStep}
              controller={controller}
            />
            <h2 className="text-xl font-semibold text-neutral-800 mb-2 text-center">
              Conferma le unità produttive
            </h2>
            <p className="text-neutral-500 mb-6 text-center">
              {productionUnitsData.length} unità produttive trovate
            </p>
            <EditableTable
              columns={PRODUCTION_UNITS_COLUMNS}
              rows={
                normalizedProductionUnitsData as unknown as Array<
                  Record<string, unknown>
                >
              }
              isModify
              alwaysEdit
              addButton
              createMode="inline"
              onSave={handleProductionUnitsSave}
              getRowId={(row, index) =>
                `pu-${row.cropCode || ""}-${row.varietyCode || ""}-${index}`
              }
              showDeleteAction
              exportFileName="unitaproduttive"
            />
            {error && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}
          </div>
        );
    }
  };

  const isProcessing = isLoading || isSaving;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <PageHeader title="Creazione Rapida" />

      <div className="flex-1 overflow-auto pb-20">
        {isProcessing ? (
          <LoadingContent
            isVisible={true}
            message={
              isLoading
                ? "Elaborazione file in corso..."
                : "Salvataggio in corso..."
            }
          />
        ) : (
          renderContent()
        )}
      </div>

      <WizardFooter
        currentStep={currentStep}
        controller={controller}
        onCancel={handleCancel}
        onAction={handleAction}
        isActionDisabled={isActionDisabled}
        isLoading={isProcessing}
      />
    </div>
  );
}
