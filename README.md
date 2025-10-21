# Seminai - Frontend

Seminai è un quaderno di campagna agricolo che rivoluziona e automatizza la gestione dei campi.

## Prerequisiti

- Node.js 21+
- npm
- Account Google Cloud con Cloud Run e Cloud Build abilitati

## Sviluppo locale

```bash
# Installare le dipendenze
npm install --legacy-peer-deps

# Avviare il server di sviluppo
npm run dev
```

## Build

```bash
# Creare la build di produzione
npm run build

# Visualizzare l'anteprima della build
npm run preview
```

## Deploy su Google Cloud Run

### Opzione 1: Deploy manuale

1. Installa e configura Google Cloud CLI:

   ```bash
   gcloud auth login
   gcloud config set project [YOUR_PROJECT_ID]
   ```

2. Costruisci e pubblica l'immagine Docker:

   ```bash
   docker build -t gcr.io/[YOUR_PROJECT_ID]/seminai-fe .
   docker push gcr.io/[YOUR_PROJECT_ID]/seminai-fe
   ```

3. Deploy su Cloud Run:
   ```bash
   gcloud run deploy seminai-fe \
     --image gcr.io/[YOUR_PROJECT_ID]/seminai-fe \
     --platform managed \
     --region europe-west1 \
     --allow-unauthenticated
   ```

### Opzione 2: Deploy automatizzato con Cloud Build

1. Connetti il tuo repository a Cloud Build.

2. Esegui il build trigger:
   ```bash
   gcloud builds submit --config cloudbuild.yaml .
   ```

## Configurazione del Dockerfile

Il Dockerfile fornito utilizza un approccio multi-stage:

- Stage 1: Costruisce l'applicazione React
- Stage 2: Utilizza Nginx per servire l'applicazione statica

La configurazione di Nginx è impostata per gestire correttamente:

- SPA routing (redirect a index.html per le rotte client-side)
- Porta 8080 per compatibilità con Cloud Run

## Variabili d'ambiente

Per configurare le variabili d'ambiente:

1. In sviluppo: Utilizza un file `.env` locale.
2. In produzione: Configura le variabili d'ambiente nel servizio Cloud Run.

## Note per il deploy

- Il servizio è configurato per scalare da 0 a 10 istanze automaticamente.
- La memoria è impostata a 512MB e la CPU a 1 per istanza.
- L'accesso pubblico è abilitato (`--allow-unauthenticated`).

Per personalizzare queste impostazioni, modifica il file `cloudbuild.yaml`.
