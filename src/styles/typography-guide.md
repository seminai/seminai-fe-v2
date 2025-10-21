# Sistema di Tipografia Unificato

## Panoramica

Questo documento descrive il sistema di tipografia unificato implementato per garantire coerenza visiva in tutta la piattaforma.

## Dimensioni Font Standardizzate

### Classi Tailwind Personalizzate

| Classe            | Dimensione | Line Height | Uso Consigliato                |
| ----------------- | ---------- | ----------- | ------------------------------ |
| `text-caption`    | 12px       | 16px        | Caption, note, timestamp       |
| `text-body-sm`    | 14px       | 20px        | Testo piccolo, etichette       |
| `text-body`       | 16px       | 24px        | Testo principale, paragrafi    |
| `text-body-lg`    | 18px       | 28px        | Testo enfatizzato              |
| `text-heading-sm` | 20px       | 28px        | Sottotitoli, titoli di sezione |
| `text-heading`    | 24px       | 32px        | Titoli di sezione principali   |
| `text-heading-lg` | 30px       | 36px        | Titoli di pagina               |
| `text-display`    | 36px       | 40px        | Titoli principali              |
| `text-display-lg` | 48px       | 48px        | Titoli hero, landing page      |

### Classi Utility Combinate

Per facilitare l'uso, sono disponibili classi che combinano dimensione e peso del font:

| Classe                  | Equivalente                     | Uso               |
| ----------------------- | ------------------------------- | ----------------- |
| `typography-caption`    | `text-caption font-normal`      | Caption e note    |
| `typography-body-sm`    | `text-body-sm font-normal`      | Testo piccolo     |
| `typography-body`       | `text-body font-normal`         | Testo principale  |
| `typography-body-lg`    | `text-body-lg font-medium`      | Testo enfatizzato |
| `typography-heading-sm` | `text-heading-sm font-semibold` | Sottotitoli       |
| `typography-heading`    | `text-heading font-semibold`    | Titoli sezione    |
| `typography-heading-lg` | `text-heading-lg font-bold`     | Titoli pagina     |
| `typography-display`    | `text-display font-bold`        | Titoli principali |
| `typography-display-lg` | `text-display-lg font-bold`     | Titoli hero       |

### Varianti di Colore

| Classe               | Colore           | Uso                        |
| -------------------- | ---------------- | -------------------------- |
| `typography-muted`   | Grigio attenuato | Testo secondario           |
| `typography-primary` | Verde agri       | Testo primario enfatizzato |
| `typography-error`   | Rosso            | Messaggi di errore         |
| `typography-success` | Verde            | Messaggi di successo       |
| `typography-warning` | Giallo           | Messaggi di avviso         |

## Esempi di Utilizzo

### HTML/JSX

```jsx
// Titolo principale di pagina
<h1 className="typography-display-lg typography-primary">
  I dati Aziendali
</h1>

// Titolo di sezione
<h2 className="typography-heading">
  Informazioni Azienda
</h2>

// Sottotitolo
<h3 className="typography-heading-sm typography-muted">
  Dati di contatto
</h3>

// Testo principale
<p className="typography-body">
  Questo è il testo principale del paragrafo.
</p>

// Testo piccolo/caption
<span className="typography-caption typography-muted">
  Ultimo aggiornamento: 15 minuti fa
</span>
```

## Migrazione dalle Classi Esistenti

### Mappatura delle Classi Vecchie → Nuove

| Vecchia Classe | Nuova Classe      | Note              |
| -------------- | ----------------- | ----------------- |
| `text-xs`      | `text-caption`    | Caption e note    |
| `text-sm`      | `text-body-sm`    | Testo piccolo     |
| `text-base`    | `text-body`       | Testo principale  |
| `text-lg`      | `text-heading-sm` | Sottotitoli       |
| `text-xl`      | `text-heading`    | Titoli sezione    |
| `text-2xl`     | `text-heading-lg` | Titoli pagina     |
| `text-3xl`     | `text-display`    | Titoli principali |
| `text-4xl`     | `text-display-lg` | Titoli hero       |

## Best Practices

1. **Usa sempre le classi standardizzate** invece di dimensioni arbitrarie
2. **Combina con i pesi appropriati** usando le classi utility combinate
3. **Mantieni la gerarchia visiva** usando le dimensioni in ordine logico
4. **Usa le varianti di colore** per contesti semantici specifici
5. **Testa su dispositivi mobili** per assicurarti che il testo sia leggibile

## Responsive Design

Le dimensioni sono ottimizzate per tutti i dispositivi. Per variazioni responsive specifiche, usa i prefissi Tailwind:

```jsx
<h1 className="typography-heading-lg md:typography-display">
  Titolo Responsive
</h1>
```

## Accessibilità

- Tutte le dimensioni rispettano i requisiti WCAG per la leggibilità
- I contrasti di colore sono ottimizzati per l'accessibilità
- Le line-height sono calcolate per una lettura ottimale
