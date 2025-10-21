# Fase di build
FROM node:21-alpine AS build

# Imposta la directory di lavoro
WORKDIR /app

# Definisci l'argomento di build per l'URL API
ARG VITE_API_URL
ARG COMMIT_SHA

# Imposta la variabile d'ambiente per il build di Vite
ENV VITE_API_URL=${VITE_API_URL}
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

# Costruisci l'applicazione
RUN npm run build

# Fase di produzione con Nginx per servire l'app statica
FROM nginx:stable-alpine AS production

# Copia i file di build dalla fase precedente alla directory di Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia una configurazione personalizzata di Nginx per SPA (Single Page Application)
RUN echo 'server {\
    listen 8080;\
    root /usr/share/nginx/html;\
    index index.html;\
    server_name localhost;\
    error_page 500 502 503 504 /50x.html;\
    location = /50x.html {\
        root /usr/share/nginx/html;\
    }\
    location / {\
        try_files $uri $uri/ /index.html;\
    }\
}' > /etc/nginx/conf.d/default.conf

# Esponi la porta 8080 (Cloud Run richiede che il container sia in ascolto sulla porta definita nella variabile PORT)
EXPOSE 8080

# Comando per avviare Nginx in foreground
CMD ["nginx", "-g", "daemon off;"] 