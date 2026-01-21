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
              La presente Privacy Policy descrive come il Titolare del
              Trattamento raccoglie, utilizza e protegge le informazioni
              personali degli utenti ("tu", "tuo") nell'ambito dell'utilizzo
              della piattaforma software SeminAI.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              I dati sono trattati da Mazzi Francesco Saverio nell'ambito di
              attività professionali di supporto, analisi e sperimentazione,
              mediante l'utilizzo della piattaforma SeminAI, che rappresenta uno
              strumento tecnico e non un servizio SaaS autonomo.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Il Titolare si impegna a proteggere la tua privacy e a trattare i
              tuoi dati personali in conformità con il Regolamento Generale
              sulla Protezione dei Dati (GDPR - Reg. UE 2016/679) e le leggi
              italiane applicabili.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Titolare del Trattamento
            </h2>
            <div className="bg-agri-green-50 p-4 rounded-lg mb-4">
              <p className="text-gray-700">
                <strong>Titolare del Trattamento:</strong> Mazzi Francesco
                Saverio
                <br />
                <strong>Libero professionista</strong>
                <br />
                <strong>Partita IVA:</strong>02750410207
                <br />
                <br />
                <strong>Email:</strong> get.seminai@gmail.com
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed">
              SeminAI è il nome del software utilizzato dal Titolare nell'ambito
              delle prestazioni professionali. SeminAI non costituisce un
              soggetto giuridico distinto, ma rappresenta lo strumento
              tecnologico utilizzato nell'ambito dell'attività professionale.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Dati Raccolti
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Il Titolare raccoglie e tratta le seguenti categorie di dati
              personali nell'ambito delle prestazioni professionali:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              3.1 Dati forniti direttamente dall'utente
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
                appezzamenti. Tali dati sono trattati esclusivamente su
                istruzione dell'utente e nell'ambito della prestazione
                professionale concordata.
              </li>
              <li>
                <strong>Dati sui prodotti:</strong> informazioni sulle colture,
                varietà, prodotti fitosanitari utilizzati. Si precisa che tali
                dati non costituiscono dati sanitari né dati relativi a minori.
              </li>
              <li>
                <strong>Dati delle etichette:</strong> informazioni relative
                alle etichette e alla tracciabilità dei prodotti
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Importante:</strong> I dati agricoli, produttivi e
              geografici trattati possono essere considerati dati economicamente
              sensibili o dati professionali riservati, ma non costituiscono
              dati sanitari o dati relativi a minori. Il trattamento avviene
              esclusivamente su istruzione dell'utente e nell'ambito della
              prestazione professionale.
            </p>

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
                <strong>Cookie:</strong> il software utilizza cookie per il
                funzionamento della piattaforma (vedi sezione Cookie)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Finalità e Base Giuridica del Trattamento
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Il Titolare tratta i dati personali per le seguenti finalità:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-3 mb-4">
              <li>
                <strong>Esecuzione della prestazione professionale:</strong>{" "}
                gestione del rapporto professionale, fornitura di supporto,
                analisi e sperimentazione, gestione dell'account, elaborazione
                delle richieste (base giuridica: art. 6(1)(b) GDPR)
              </li>
              <li>
                <strong>Obblighi legali:</strong> adempimento di obblighi
                normativi e fiscali (base giuridica: art. 6(1)(c) GDPR)
              </li>
              <li>
                <strong>Interessi legittimi:</strong> miglioramento degli
                strumenti software, sicurezza della piattaforma, prevenzione
                frodi (base giuridica: art. 6(1)(f) GDPR)
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
              I dati personali possono essere condivisi con:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                <strong>Fornitori di servizi:</strong> società che assistono il
                Titolare nella gestione della piattaforma (hosting, cloud
                storage, servizi di posta elettronica). Tali fornitori agiscono
                come responsabili del trattamento ex art. 28 GDPR e non
                utilizzano i dati per finalità proprie.
              </li>
              <li>
                <strong>Partner tecnologici:</strong> fornitori di servizi di
                analisi e supporto tecnico, che agiscono come responsabili del
                trattamento ex art. 28 GDPR.
              </li>
              <li>
                <strong>Autorità competenti:</strong> quando richiesto dalla
                legge o per proteggere i diritti del Titolare
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Tutti i terzi che trattano dati per conto del Titolare sono
              vincolati da accordi contrattuali che garantiscono un livello di
              protezione adeguato dei dati personali e che chiariscono il loro
              ruolo come responsabili del trattamento.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Trasferimento dei Dati
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              I dati sono conservati su server situati nell'Unione Europea. In
              caso di trasferimento di dati al di fuori dell'UE, il Titolare si
              assicura che siano adottate misure di salvaguardia appropriate,
              come le Clausole Contrattuali Standard (SCC) della Commissione
              Europea.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Trasferimenti verso provider di servizi AI:</strong> Nel
              caso in cui la piattaforma utilizzi servizi di intelligenza
              artificiale forniti da provider extra-UE, tali trasferimenti
              avvengono esclusivamente mediante SCC e con la garanzia che i dati
              non vengono utilizzati per addestrare modelli o per finalità
              diverse da quelle del trattamento concordato.
            </p>
            <p className="text-gray-700 leading-relaxed">
              I provider di servizi AI agiscono come responsabili del
              trattamento ex art. 28 GDPR e sono vincolati a non utilizzare i
              dati per finalità proprie, inclusa l'addestramento di modelli di
              machine learning.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Conservazione dei Dati
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Il Titolare conserva i dati personali per il tempo necessario alle
              finalità indicate, distinguendo tra:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                <strong>Dati di account:</strong> per la durata del rapporto
                professionale e, successivamente, per il tempo necessario agli
                obblighi legali
              </li>
              <li>
                <strong>Dati di progetto:</strong> per la durata del progetto e
                per il tempo necessario alla prestazione professionale
              </li>
              <li>
                <strong>Dati di log:</strong> per il tempo strettamente
                necessario alla sicurezza e al funzionamento della piattaforma
              </li>
              <li>
                <strong>Dati di backup:</strong> per il tempo necessario alla
                continuità del servizio e agli obblighi legali
              </li>
              <li>
                <strong>Obblighi legali:</strong> adempimento di obblighi
                normativi e fiscali (es. conservazione documentale fiscale per
                10 anni)
              </li>
              <li>
                <strong>Controversie legali:</strong> per il tempo necessario a
                gestire eventuali controversie legali
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Una volta cessata la necessità di conservazione, i dati saranno
              cancellati o resi anonimi in modo irreversibile.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Output AI e Dati Generati
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              La piattaforma SeminAI può generare output mediante strumenti di
              intelligenza artificiale, inclusi analisi, report, suggerimenti e
              elaborazioni.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Mazzi Francesco Saverio non si assume responsabilità per eventuali
              problemi derivanti da dosaggi, conformità normativa o altre
              indicazioni generate dal software, poiché gli output sono prodotti
              da sistemi di intelligenza artificiale che elaborano dati forniti
              dall'utente e non sono sotto il controllo diretto del Titolare.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Importante:</strong> Gli output generati dall'AI
              rappresentano elaborazioni tecniche basate sui dati forniti
              dall'utente e non costituiscono nuovi dati personali ai sensi del
              GDPR. Tali output sono:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                Elaborazioni tecniche prodotte mediante algoritmi e modelli di
                intelligenza artificiale
              </li>
              <li>
                Non generano nuovi diritti GDPR per l'utente, pur essendo
                forniti nell'ambito della prestazione professionale
              </li>
              <li>
                Restano di proprietà del Titolare come elaborazioni tecniche,
                salvo diverso accordo
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              L'utente mantiene tutti i diritti sui dati personali forniti, ma
              gli output AI non sono considerati dati personali ai sensi del
              GDPR.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. I Tuoi Diritti
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
              Per esercitare i tuoi diritti, contattare il Titolare
              all'indirizzo <strong>privacy@seminai.it</strong> o alla PEC{" "}
              <strong>seminai@pec.it</strong>
            </p>
            <p className="text-gray-700 leading-relaxed">
              Hai inoltre il diritto di proporre reclamo all'Autorità Garante
              per la Protezione dei Dati Personali (www.garanteprivacy.it).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Sicurezza dei Dati
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Il Titolare adotta misure tecniche e organizzative appropriate per
              proteggere i dati personali da:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Accessi non autorizzati</li>
              <li>Perdita, distruzione o alterazione accidentale</li>
              <li>Divulgazione o accesso non autorizzato</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Le misure includono crittografia dei dati sensibili (come le
              password), controlli di accesso, backup regolari e monitoraggio
              della sicurezza della piattaforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Cookie
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Il software utilizza cookie e tecnologie simili per:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                <strong>Cookie tecnici:</strong> necessari per il funzionamento
                della piattaforma
              </li>
              <li>
                <strong>Cookie analitici:</strong> per analizzare l'uso della
                piattaforma e migliorare gli strumenti software
              </li>
              <li>
                <strong>Cookie di preferenze:</strong> per ricordare le
                impostazioni dell'utente
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Puoi gestire le preferenze sui cookie tramite le impostazioni del
              tuo browser.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Modifiche alla Privacy Policy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Il Titolare si riserva il diritto di modificare questa Privacy
              Policy in qualsiasi momento. Le modifiche saranno pubblicate su
              questa pagina con indicazione della data di ultimo aggiornamento.
              Si invita a consultare periodicamente questa pagina.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Contatti
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Per qualsiasi domanda o richiesta relativa alla presente Privacy
              Policy o al trattamento dei dati personali, è possibile contattare
              il Titolare del Trattamento:
            </p>
            <div className="bg-agri-green-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Titolare:</strong> Mazzi Francesco Saverio
                <br />
                <strong>Email:</strong> get.seminai@gmail.com
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              I contatti sopra indicati fanno riferimento al Titolare del
              Trattamento. I domini seminai.it e seminai@pec.it sono utilizzati
              per le comunicazioni relative al progetto SeminAI, ma il titolare
              del trattamento resta Mazzi Francesco Saverio.
            </p>
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
