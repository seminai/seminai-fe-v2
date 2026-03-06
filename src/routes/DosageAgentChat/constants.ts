export const TOOL_LABELS: Record<string, string> = {
  list_user_companies: "Caricamento aziende",
  list_production_units: "Caricamento unita produttive",
  list_company_products: "Caricamento prodotti magazzino",
  ask_user_questions: "Preparazione domande",
  check_product_revoked: "Verifica stato prodotto",
  expand_production_cycles: "Caricamento cicli produttivi",
  extract_buffer_zones: "Calcolo fasce di rispetto",
  search_products: "Ricerca prodotti compatibili",
  enrich_from_bdf: "Arricchimento dati BDF",
  plan_treatment_strategy: "Pianificazione strategia",
  calculate_dosage: "Calcolo dosi e date",
  validate_compliance: "Verifica conformita",
  validate_sa_group_limits: "Verifica limiti gruppi SA",
  check_compatibility: "Verifica compatibilita",
  calculate_stock_balance: "Bilancio magazzino",
  optimize_dosage: "Ottimizzazione dosi",
  generate_treatment_plan: "Generazione piano trattamenti",
  modify_plan_step: "Modifica passo del piano",
  execute_treatment_plan: "Esecuzione piano",
  create_treatment_jobs: "Creazione job trattamenti",
  search_rules: "Ricerca disciplinari",
  search_disciplinari_database: "Ricerca database disciplinari",
  search_disciplinari_bdf_pdf: "Ricerca PDF disciplinari",
  bdf_search_product_doses: "Ricerca dosi BDF",
  bdf_search_products_by_adversity: "Ricerca prodotti per avversita",
  tavily_scientific_search: "Ricerca fonti scientifiche",
  list_existing_job_groups: "Elenco gruppi job esistenti",
  search_product_label_database: "Ricerca etichette prodotto",
  spawn_subagent: "Avvio sub-agente",
  schedule_alert: "Pianificazione alert",
  plan_task: "Pianificazione task",
  delegate_to_field_note: "Delegazione note campo",
  approve_field_note: "Salvataggio nota di campo",
  reject_field_note: "Modifica nota di campo",
  run_conformity_check: "Verifica conformita job",
  confirm_conformity_check: "Conferma correzioni conformita",
};

export function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName;
}

export const DESTRUCTIVE_TOOL_DESCRIPTIONS: Record<string, string> = {
  create_treatment_jobs:
    "Questa azione creera dei job di trattamento nel sistema. I job verranno assegnati alle unita produttive selezionate.",
  execute_treatment_plan:
    "Questa azione eseguira il piano di trattamento corrente, creando i job nel sistema.",
  confirm_conformity_check:
    "Questa azione applichera le correzioni di conformita ai job selezionati.",
  approve_field_note:
    "Questa azione salvera la nota di campo o il movimento di magazzino nel database. Verifica il riepilogo sopra prima di confermare.",
};
