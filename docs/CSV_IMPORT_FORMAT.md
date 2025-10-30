# Formato CSV per Importazione Campi

## Panoramica

Questo documento descrive il formato CSV supportato per l'importazione massiva dei campi agricoli nel sistema.

## Formato File

### Separatore

- **Punto e virgola (`;`)** oppure **virgola (`,`)**
- Il sistema riconosce automaticamente il separatore

### Decimali

- Supporta sia **virgola (`,`)** che **punto (`.`)** come separatore decimale
- Esempio: `1,5` oppure `1.5` sono entrambi validi per rappresentare 1.5 ettari

### Encoding

- UTF-8 (consigliato)
- ASCII

## Colonne del CSV

### Colonne Obbligatorie

| Nome Colonna              | Alias Accettati                    | Tipo   | Descrizione                                   | Esempio                |
| ------------------------- | ---------------------------------- | ------ | --------------------------------------------- | ---------------------- |
| Azienda                   | `Nome Azienda`, `Company`          | Testo  | Nome dell'azienda (deve esistere nel sistema) | Azienda Agricola Rossi |
| Nome Campo                | `Nome`, `Field Name`               | Testo  | Nome identificativo del campo                 | Campo Nord             |
| Indirizzo                 | `Via`, `Address`                   | Testo  | Indirizzo del campo                           | Via Roma 123           |
| Sezione                   | `Section`                          | Testo  | Sezione catastale                             | A                      |
| Foglio                    | `Sheet`                            | Testo  | Foglio catastale                              | 12                     |
| Particella                | `Mappale`, `Parcel`                | Testo  | Particella/Mappale catastale                  | 345                    |
| Superficie Catastale (mq) | `Superficie mq`, `Sup Cat`, `Area` | Numero | Superficie in metri quadrati                  | 15000                  |

### Colonne Opzionali - Informazioni Generali

| Nome Colonna | Alias Accettati           | Tipo  | Descrizione                   | Esempio     |
| ------------ | ------------------------- | ----- | ----------------------------- | ----------- |
| Città        | `Citta`, `City`, `Comune` | Testo | Città o comune                | Torino      |
| Provincia    | `Province`, `Prov`        | Testo | Sigla provincia               | TO          |
| Regione      | `Region`                  | Testo | Regione                       | Piemonte    |
| CAP          | `Postal Code`             | Testo | Codice Avviamento Postale     | 10100       |
| CUAA         | `Codice Fiscale Azienda`  | Testo | Codice Unico Azienda Agricola | 01234567890 |

### Colonne Opzionali - Dati Catastali

| Nome Colonna | Alias Accettati | Tipo  | Descrizione                   | Esempio    |
| ------------ | --------------- | ----- | ----------------------------- | ---------- |
| Subalterno   | -               | Testo | Subalterno catastale          | 1          |
| Qualità      | `Quality`       | Testo | Qualità del terreno catastale | Seminativo |

### Colonne Opzionali - Dati Agronomici

| Nome Colonna             | Alias Accettati                      | Tipo   | Descrizione                                                               | Esempio         |
| ------------------------ | ------------------------------------ | ------ | ------------------------------------------------------------------------- | --------------- |
| SAU (Ha)                 | `SAU`, `Sau Ha`                      | Numero | Superficie Agricola Utilizzata in ettari                                  | 1,5             |
| Uso                      | `Use`, `Utilizzo`                    | Testo  | Utilizzo del terreno                                                      | Seminativo      |
| Tipo Suolo               | `Soil Type`, `Soil`, `Suolo`         | Testo  | Tipologia di suolo (vedi valori ammessi)                                  | FRANCO-SABBIOSO |
| Superficie GIS (mq)      | `Superficie GIS`, `GIS mq`           | Numero | Superficie rilevata da GIS in mq (viene convertita automaticamente in Ha) | 15200           |
| Superficie condotta (mq) | `Superficie condotta`, `Condotta mq` | Numero | Superficie in conduzione in mq                                            | 14800           |

### Colonne Opzionali - Analisi del Suolo

| Nome Colonna | Alias Accettati   | Tipo   | Descrizione                   | Esempio |
| ------------ | ----------------- | ------ | ----------------------------- | ------- |
| pH           | -                 | Numero | Valore pH del suolo           | 7,2     |
| Azoto        | `Nitrogen`, `N`   | Numero | Contenuto di azoto (mg/kg)    | 150     |
| Fosforo      | `Phosphorus`, `P` | Numero | Contenuto di fosforo (mg/kg)  | 50      |
| Potassio     | `Potassium`, `K`  | Numero | Contenuto di potassio (mg/kg) | 200     |
| Calcio       | `Calcium`, `Ca`   | Numero | Contenuto di calcio (mg/kg)   | 1500    |
| Magnesio     | `Magnesium`, `Mg` | Numero | Contenuto di magnesio (mg/kg) | 180     |

## Valori Speciali

### Tipi di Suolo Ammessi

- `ARGILLOSO`
- `SABBIOSO`
- `LIMOSO`
- `FRANCO`
- `LIMO-SABBIA`
- `FRANCO-SABBIOSO`
- `FRANCO-ARGILLOSO`
- `FRANCO-LIMOSO`

Nota: I valori sono case-insensitive (maiuscole/minuscole non importano)

## Regole di Validazione

### Corrispondenza Azienda

⚠️ **IMPORTANTE**: Il nome dell'azienda deve corrispondere esattamente a quello presente nel sistema:

- La ricerca è **case-insensitive** (ignora maiuscole/minuscole)
- Gli spazi extra vengono ignorati
- Esempi validi:
  - `"Azienda Agricola Rossi"` = `"azienda agricola rossi"`
  - `"Azienda Agricola Rossi"` = `"AZIENDA AGRICOLA ROSSI"`
  - `"Azienda Agricola Rossi  "` = `"Azienda Agricola Rossi"`

### Conversioni Automatiche

1. **Superficie GIS**: Se il valore è > 100, viene automaticamente convertito da mq a ettari

   - Input: `15200` (mq) → Output: `1.52` (Ha)
   - Input: `1.52` (già in Ha) → Output: `1.52` (Ha)

2. **Numeri decimali**: Virgola italiana convertita in punto

   - Input: `1,5` → Output: `1.5`

3. **Superficie condotta**: Salvata nel campo `variazioneMq` come riferimento

## Esempio di File CSV

```csv
Azienda;Nome Campo;Indirizzo;Sezione;Foglio;Mappale;Particella;Superficie Catastale (mq);Città;SAU (Ha);Uso;Tipo Suolo;CAP;Regione;Provincia;CUAA;Superficie GIS (mq);Superficie condotta (mq)
Azienda Agricola Rossi;Campo Nord;Via Roma 123;A;12;;345;15000;Torino;1,5;Seminativo;FRANCO-SABBIOSO;10100;Piemonte;TO;01234567890;15200;14800
Azienda Agricola Rossi;Campo Sud;Via Milano 45;B;13;;678;20000;Torino;2,0;Frutteto;ARGILLOSO;10100;Piemonte;TO;01234567890;20100;19500
Azienda Agricola Verdi;Campo Est;Via Napoli 89;C;14;5;901;12000;Asti;1,2;Vigneto;LIMOSO;14100;Piemonte;AT;98765432100;12050;11800
```

### Note sull'esempio:

- Separatore: punto e virgola (`;`)
- Decimali: virgola (`,`)
- Colonna `Mappale`: può essere vuota se coincide con `Particella`
- Tutti i campi opzionali possono essere lasciati vuoti

## Gestione Errori

### Errori che Bloccano l'Importazione

- Azienda non trovata nel sistema
- Campi obbligatori mancanti
- Formato file non valido (non CSV/XLSX/XLS)
- File troppo grande (> 10MB)

### Errori per Singola Riga

Ogni riga con errori viene segnalata con:

- Numero di riga (conteggio parte da 2, riga 1 è l'header)
- Descrizione specifica dell'errore

Esempio:

```
Riga 3: Azienda "Azienda XYZ" non trovata. Verifica che esista nel sistema.
Riga 5: Nome campo mancante
```

### Comportamento

- Le righe con errori vengono **saltate**
- Le righe valide vengono comunque **importate**
- Un riepilogo completo viene mostrato all'utente

## Download Template

Un template CSV di esempio è disponibile nella dialog di importazione oppure al path:

```
/public/templates/campi_esempio.csv
```

## Best Practices

1. **Prepara i Dati**

   - Verifica che tutte le aziende esistano nel sistema prima dell'importazione
   - Usa nomi consistenti per le aziende
   - Controlla che i dati catastali siano corretti

2. **Test Incrementali**

   - Inizia con pochi record per testare
   - Verifica che l'importazione funzioni correttamente
   - Poi procedi con file più grandi

3. **Backup**

   - Mantieni sempre una copia del CSV originale
   - In caso di errori, correggi e re-importa

4. **Formattazione**
   - Usa un editor CSV dedicato (es. LibreOffice Calc, Excel)
   - Evita caratteri speciali nei nomi
   - Mantieni la prima riga con i nomi delle colonne

## Supporto Tecnico

Per problemi con l'importazione:

1. Controlla i messaggi di errore specifici
2. Verifica che il formato CSV sia corretto
3. Confronta con il template di esempio
4. Assicurati che le aziende esistano nel sistema
