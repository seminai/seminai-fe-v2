# Fase di build
FROM node:21-alpine AS build

# Imposta la directory di lavoro
WORKDIR /app

# Definisci l'argomento di build per l'URL API (default verso il backend in Cloud Run)
ARG VITE_API_URL="https://seminai-be-v2-661301438659.europe-west1.run.app"
ARG VITE_REGISTRATION_CODE="benvenutodaclariceefrancescoteamseminai2026"
ARG VITE_GOOGLE_CLIENT_ID="661301438659-s1k70moupqvu486rlr07ul3b563qtbh4.apps.googleusercontent.com"
ARG COMMIT_SHA

# Imposta la variabile d'ambiente per il build di Vite
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_REGISTRATION_CODE=${VITE_REGISTRATION_CODE}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV COMMIT_SHA=${COMMIT_SHA}

# Copia i file di configurazione per installare le dipendenze
COPY package.json package-lock.json ./

# Installa le dipendenze con flag --legacy-peer-deps per gestire le incompatibilità
RUN npm ci --legacy-peer-deps

# Copia il resto del codice sorgente
COPY . .

# Crea un file di versione
RUN echo "Build timestamp: $(date)" > ./public/build-version.txt && \
    echo "Commit: $COMMIT_SHA" >> ./public/build-version.txt

# Stampa la variabile d'ambiente per debug
RUN echo "VITE_API_URL is: $VITE_API_URL"
RUN echo "VITE_REGISTRATION_CODE is: $VITE_REGISTRATION_CODE"

# Costruisci l'applicazione
RUN npm run build

# Fase di produzione con Nginx per servire l'app statica
FROM nginx:stable-alpine AS production

# Copia i file di build dalla fase precedente alla directory di Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia una configurazione personalizzata di Nginx per SPA (Single Page Application)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Esponi la porta 8080 (Cloud Run richiede che il container sia in ascolto sulla porta definita nella variabile PORT)
EXPOSE 8080

# Comando per avviare Nginx in foreground
CMD ["nginx", "-g", "daemon off;"] 