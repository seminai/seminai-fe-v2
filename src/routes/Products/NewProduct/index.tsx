import { useState, useMemo, useCallback } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/organism/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileUp, PenLine } from "lucide-react";
import FileImportSection from "./FileImportSection";
import ManualProductForm from "./ManualProductForm";

class NavigationManager {
  private readonly navigateFn: NavigateFunction;

  constructor(navigateFn: NavigateFunction) {
    this.navigateFn = navigateFn;
  }

  public goBack(): void {
    this.navigateFn(-1);
  }

  public goToProducts(): void {
    this.navigateFn("/products");
  }
}

export default function NewProduct() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const navigationManager = useMemo(
    () => new NavigationManager(navigate),
    [navigate],
  );

  const [creationMode, setCreationMode] = useState<null | "manual" | "import">(
    null,
  );

  const handleBackToChoice = useCallback(() => {
    setCreationMode(null);
  }, []);

  const handleCancel = useCallback(() => {
    navigationManager.goBack();
  }, [navigationManager]);

  const handleProductCreated = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    navigationManager.goToProducts();
  }, [navigationManager, queryClient]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 bg-gray-50/50 backdrop-blur-sm z-10">
        <PageHeader
          title={
            creationMode !== null ? (
              <button
                type="button"
                onClick={handleBackToChoice}
                className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Torna alla scelta</span>
              </button>
            ) : (
              "Nuovo Prodotto"
            )
          }
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-red-200 text-red-600 bg-transparent hover:bg-transparent hover:text-red-600 hover:border-red-200"
            >
              Annulla
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {creationMode === null && (
          <div className="flex-1 overflow-auto px-6 pb-6">
            <div className="max-w-2xl mx-auto w-full space-y-4 mt-8">
              <h2 className="text-lg font-semibold text-foreground text-center mb-6">
                Come vuoi aggiungere i prodotti?
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCreationMode("import")}
                  className="group flex flex-col items-center gap-4 rounded-2xl border border-border bg-white p-8 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md cursor-pointer"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-200">
                    <FileUp className="h-7 w-7" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-base font-semibold text-foreground">
                      Importa da file
                    </p>
                    <p className="text-sm text-muted-foreground">
                      CSV, Excel o file DDT PDF
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCreationMode("manual")}
                  className="group flex flex-col items-center gap-4 rounded-2xl border border-border bg-white p-8 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md cursor-pointer"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-200">
                    <PenLine className="h-7 w-7" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-base font-semibold text-foreground">
                      Inserisci manualmente
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Compila il form con i dati del prodotto
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {creationMode === "import" && (
          <FileImportSection onImportCompleted={handleProductCreated} />
        )}

        {creationMode === "manual" && (
          <ManualProductForm onProductCreated={handleProductCreated} />
        )}
      </div>
    </div>
  );
}
