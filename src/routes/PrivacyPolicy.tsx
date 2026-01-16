import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition"
          >
            <img src="/logo.png" alt="SeminAI Logo" className="h-8 w-auto" />
            <span className="text-xl font-semibold text-black">SeminAI</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-sm text-gray-600 hover:text-black transition"
            >
              Dashboard
            </Link>
            <Link
              to="/auth"
              className="text-sm text-gray-600 hover:text-black transition"
            >
              Accedi
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Ultimo aggiornamento:{" "}
          {new Date().toLocaleDateString("it-IT", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Introduzione
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              La presente Privacy Policy descrive come SeminAI ("noi", "ci",
              "nostro") raccoglie, utilizza e protegge le informazioni personali
              degli utenti ("tu", "tuo") della nostra piattaforma.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Ci impegniamo a proteggere la tua privacy e a trattare i tuoi dati
              personali in conformità con il Regolamento Generale sulla
              Protezione dei Dati (GDPR - Reg. UE 2016/679) e le leggi italiane
              applicabili.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Titolare del Trattamento
            </h2>
            <div className="bg-agri-green-50 p-4 rounded-lg mb-4">
              <p className="text-gray-700">
                <strong>Titolare del Trattamento:</strong> SeminAI
                <br />
                <strong>Email:</strong> privacy@seminai.it
                <br />
                <strong>Sede:</strong> Italia
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Dati Raccolti
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Raccogliamo e trattiamo le seguenti categorie di dati personali:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              3.1 Dati forniti direttamente da te
            </h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                <strong>Dati di registrazione:</strong> nome, cognome, email,
                password (criptata), codice fiscale, numero di telefono,
                indirizzo
              </li>
              <li>
                <strong>Dati dell'azienda agricola:</strong> nome dell'azienda,
                indirizzo, coordinate geografiche, informazioni sugli
                appezzamenti
              </li>
              <li>
                <strong>Dati sui prodotti:</strong> informazioni sulle colture,
                varietà, prodotti fitosanitari utilizzati
              </li>
              <li>
                <strong>Dati delle etichette:</strong> informazioni relative
                alle etichette e alla tracciabilità dei prodotti
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              3.2 Dati raccolti automaticamente
            </h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                <strong>Dati di utilizzo:</strong> pagine visitate, funzionalità
                utilizzate, tempo di utilizzo
              </li>
              <li>
                <strong>Dati tecnici:</strong> indirizzo IP, tipo di browser,
                sistema operativo, dispositivo utilizzato
              </li>
              <li>
                <strong>Cookie:</strong> utilizziamo cookie per migliorare
                l'esperienza utente (vedi sezione Cookie)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Finalità e Base Giuridica del Trattamento
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Trattiamo i tuoi dati personali per le seguenti finalità:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-3 mb-4">
              <li>
                <strong>Esecuzione del contratto:</strong> fornitura dei servizi
                richiesti, gestione dell'account, elaborazione delle richieste
                (base giuridica: art. 6(1)(b) GDPR)
              </li>
              <li>
                <strong>Obblighi legali:</strong> adempimento di obblighi
                normativi e fiscali (base giuridica: art. 6(1)(c) GDPR)
              </li>
              <li>
                <strong>Interessi legittimi:</strong> miglioramento dei servizi,
                sicurezza della piattaforma, prevenzione frodi (base giuridica:
                art. 6(1)(f) GDPR)
              </li>
              <li>
                <strong>Consenso:</strong> comunicazioni di marketing,
                newsletter (base giuridica: art. 6(1)(a) GDPR - consenso
                revocabile in qualsiasi momento)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Condivisione dei Dati
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              I tuoi dati personali possono essere condivisi con:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                <strong>Fornitori di servizi:</strong> società che ci assistono
                nella gestione della piattaforma (hosting, cloud storage,
                servizi di posta elettronica)
              </li>
              <li>
                <strong>Partner tecnologici:</strong> fornitori di servizi di
                analisi e supporto tecnico
              </li>
              <li>
                <strong>Autorità competenti:</strong> quando richiesto dalla
                legge o per proteggere i nostri diritti
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Tutti i terzi che trattano dati per nostro conto sono vincolati da
              accordi contrattuali che garantiscono un livello di protezione
              adeguato dei dati personali.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Trasferimento dei Dati
            </h2>
            <p className="text-gray-700 leading-relaxed">
              I tuoi dati sono conservati su server situati nell'Unione Europea.
              In caso di trasferimento di dati al di fuori dell'UE, ci
              assicuriamo che siano adottate misure di salvaguardia appropriate,
              come le Clausole Contrattuali Standard della Commissione Europea.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Conservazione dei Dati
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Conserviamo i tuoi dati personali per il tempo necessario a:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Fornirti i servizi richiesti</li>
              <li>
                Adempiere agli obblighi legali (es. conservazione documentale
                fiscale per 10 anni)
              </li>
              <li>Gestire eventuali controversie legali</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Una volta cessata la necessità di conservazione, i dati saranno
              cancellati o resi anonimi in modo irreversibile.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. I Tuoi Diritti
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              In conformità con il GDPR, hai i seguenti diritti:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                <strong>Diritto di accesso (art. 15):</strong> ottenere conferma
                del trattamento e una copia dei tuoi dati
              </li>
              <li>
                <strong>Diritto di rettifica (art. 16):</strong> correggere dati
                inesatti o incompleti
              </li>
              <li>
                <strong>Diritto alla cancellazione (art. 17):</strong>{" "}
                richiedere la cancellazione dei tuoi dati ("diritto all'oblio")
              </li>
              <li>
                <strong>Diritto di limitazione (art. 18):</strong> limitare il
                trattamento in determinati casi
              </li>
              <li>
                <strong>Diritto alla portabilità (art. 20):</strong> ricevere i
                dati in formato strutturato per trasferirli ad altro titolare
              </li>
              <li>
                <strong>Diritto di opposizione (art. 21):</strong> opporti al
                trattamento per motivi legittimi
              </li>
              <li>
                <strong>Diritto di revocare il consenso:</strong> quando il
                trattamento è basato sul consenso
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-4">
              Per esercitare i tuoi diritti, contattaci all'indirizzo{" "}
              <strong>privacy@seminai.it</strong>
            </p>
            <p className="text-gray-700 leading-relaxed">
              Hai inoltre il diritto di proporre reclamo all'Autorità Garante
              per la Protezione dei Dati Personali (www.garanteprivacy.it).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Sicurezza dei Dati
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Adottiamo misure tecniche e organizzative appropriate per
              proteggere i tuoi dati personali da:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Accessi non autorizzati</li>
              <li>Perdita, distruzione o alterazione accidentale</li>
              <li>Divulgazione o accesso non autorizzato</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Le misure includono crittografia dei dati sensibili (come le
              password), controlli di accesso, backup regolari e monitoraggio
              della sicurezza.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Cookie
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Utilizziamo cookie e tecnologie simili per:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                <strong>Cookie tecnici:</strong> necessari per il funzionamento
                della piattaforma
              </li>
              <li>
                <strong>Cookie analitici:</strong> per analizzare l'uso della
                piattaforma e migliorare i servizi
              </li>
              <li>
                <strong>Cookie di preferenze:</strong> per ricordare le tue
                impostazioni
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Puoi gestire le preferenze sui cookie tramite le impostazioni del
              tuo browser.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Modifiche alla Privacy Policy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Ci riserviamo il diritto di modificare questa Privacy Policy in
              qualsiasi momento. Le modifiche saranno pubblicate su questa
              pagina con indicazione della data di ultimo aggiornamento. Ti
              invitiamo a consultare periodicamente questa pagina.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Contatti
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Per qualsiasi domanda o richiesta relativa alla presente Privacy
              Policy o al trattamento dei tuoi dati, puoi contattarci a:
            </p>
            <div className="bg-agri-green-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Email:</strong> privacy@seminai.it
                <br />
                <strong>PEC:</strong> seminai@pec.it
                <br />
                <strong>Indirizzo:</strong> Italia
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} SeminAI. Tutti i diritti riservati.
            </p>
            <div className="flex gap-6">
              <Link
                to="/terms-of-service"
                className="text-sm text-gray-600 hover:text-black transition"
              >
                Termini di Servizio
              </Link>
              <Link
                to="/privacy-policy"
                className="text-sm text-gray-600 hover:text-black transition"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
