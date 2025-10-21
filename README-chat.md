# Sistema di Chat

## Componenti

### 1. API (src/api/chats.ts)

- Servizio per la gestione delle chiamate API delle chat
- Metodi: createChat, getChats, getChat, getChatMessages, sendMessage, deleteChat
- Interfacce: Chat, ChatMessage

### 2. Hook (src/hooks/useChats.ts)

- Hook personalizzato per l'integrazione con React Query
- Gestisce queries e mutations (createChat, deleteChat, getChatMessages, sendMessage)

### 3. Pagina principale (src/routes/Chats.tsx)

- Elenco delle chat disponibili
- Pulsante per creare una nuova chat (in alto a destra)
- Pulsante per visualizzare la cronologia (in alto a sinistra)

### 4. Pagina dettaglio (src/routes/ChatDetail.tsx)

- Visualizzazione dei messaggi di una chat specifica
- Form per l'invio di nuovi messaggi
- Pulsante per tornare all'elenco

### 5. Pagina cronologia (src/routes/ChatHistory.tsx)

- Elenco completo delle chat con più dettagli
- Opzione per eliminare le chat
- Pulsante per tornare all'elenco principale

## Integrazione con la Sidebar

- La chat è accessibile direttamente dalla sidebar principale dell'applicazione
- Utilizza l'icona MessageSquare da lucide-react
- L'elemento di menu è sempre visibile in qualsiasi parte dell'applicazione

## Integrazione con il Layout Autenticato

- Tutti i componenti delle chat sono racchiusi nel layout autenticato (AuthenticatedLayout.tsx)
- I componenti si adattano allo spazio disponibile con un `max-width` appropriato
- Layout che rispetta la struttura dell'applicazione:
  - Sidebar a sinistra (gestita da AuthenticatedLayout)
  - Contenuto principale a destra con margini appropriati
- Stile coerente con il resto dell'applicazione
- Utilizzo consistente dei colori della palette del sito (agri-green)
- Utilizzo di bordi arrotondati e ombre per mantenere l'estetica dell'applicazione

## Rotte

- `/chats` - Elenco chat
- `/chats/history` - Cronologia chat
- `/chats/:chatId` - Dettaglio di una chat specifica

## Endpoint API

- POST `/chats` - Crea una nuova chat
- GET `/chats` - Ottiene tutte le chat
- GET `/chats/:chatId` - Ottiene i dettagli di una chat
- GET `/chats/:chatId/messages` - Ottiene i messaggi di una chat
- POST `/chats/:chatId/messages` - Invia un messaggio
- DELETE `/chats/:chatId` - Elimina una chat

## Autenticazione

Tutte le richieste API includono automaticamente il token di autenticazione nell'header:

```
Authorization: Bearer <token>
```

## Stile e UI

- Design moderno con Tailwind CSS
- Tema coerente con la palette dei colori dell'applicazione
  - Utilizzo di agri-green-100 ~ agri-green-700 per i vari elementi
  - Hover e focus effects consistenti con lo stile dell'app
- Interfaccia responsive che si adatta a diverse dimensioni di schermo
- Icone da Lucide React
