import { LegalPageLayout } from "./Home/LegalPageLayout";

export default function TermsOfService() {
  return (
    <LegalPageLayout>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Termini di Servizio
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
              1. Identità del Fornitore e Accettazione dei Termini
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              SeminAI è una piattaforma software sviluppata da Mazzi Francesco
              Saverio, libero professionista, utilizzata nell'ambito di
              prestazioni professionali e attività di supporto e
              sperimentazione.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Utilizzando gli strumenti software SeminAI, accetti di essere
              vincolato dai presenti Termini di Servizio. Se non accetti questi
              termini, ti preghiamo di non utilizzare gli strumenti software
              forniti.
            </p>
            <p className="text-gray-700 leading-relaxed">
              SeminAI non costituisce un soggetto giuridico distinto, ma
              rappresenta lo strumento tecnologico utilizzato nell'ambito delle
              prestazioni professionali erogate.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Descrizione degli Strumenti Software
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              SeminAI fornisce strumenti software a supporto di attività
              professionali di analisi, consulenza, sperimentazione e supporto
              decisionale in ambito agricolo. Gli strumenti disponibili
              includono, ma non sono limitati a:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                Strumenti per la gestione di aziende agricole e appezzamenti
              </li>
              <li>
                Funzionalità per l'etichettatura e tracciabilità dei prodotti
              </li>
              <li>
                Accesso a database di prodotti fitosanitari e varietà vegetali
              </li>
              <li>Strumenti di analisi e reportistica</li>
              <li>
                Strumenti di supporto decisionale basati su intelligenza
                artificiale
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Tali strumenti sono forniti nell'ambito delle prestazioni
              professionali concordate e non costituiscono un servizio autonomo
              o standardizzato.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Registrazione dell'Account
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              La creazione di un account è funzionale all'erogazione delle
              prestazioni professionali concordate. L'accesso alla piattaforma è
              riservato e richiede un codice di invito fornito dal Titolare a
              seguito della definizione di un accordo professionale (LOI o
              contratto di prestazione).
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              L'account può essere limitato, sospeso o personalizzato in base
              alle esigenze specifiche del progetto o della collaborazione
              professionale. La registrazione non costituisce acquisto di un
              prodotto software, ma attivazione degli strumenti necessari
              all'erogazione della prestazione professionale concordata.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Per utilizzare gli strumenti software di SeminAI, devi registrarti
              creando un account con il codice di invito ricevuto. Ti impegni a:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                Fornire informazioni accurate, complete e aggiornate durante la
                registrazione
              </li>
              <li>
                Mantenere la sicurezza della tua password e accettare la
                responsabilità per tutte le attività svolte tramite il tuo
                account
              </li>
              <li>
                Notificarci immediatamente qualsiasi uso non autorizzato del tuo
                account
              </li>
              <li>
                Non creare account falsi o impersonare altre persone o entità
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Uso Accettabile
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Ti impegni a utilizzare gli strumenti software di SeminAI solo per
              scopi legali e in conformità con questi Termini. È vietato:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Violare leggi, regolamenti o diritti di terzi</li>
              <li>
                Trasmettere contenuti illegali, dannosi, minacciosi, abusivi o
                diffamatori
              </li>
              <li>
                Tentare di accedere senza autorizzazione ai sistemi o alle reti
                di SeminAI
              </li>
              <li>
                Interferire con o interrompere l'integrità o le prestazioni
                degli strumenti software
              </li>
              <li>Raccogliere dati degli utenti senza consenso</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Proprietà Intellettuale
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Tutti i contenuti, funzionalità e tecnologie presenti su SeminAI,
              inclusi testi, grafiche, loghi, icone, immagini, clip audio e
              software, sono di proprietà di Mazzi Francesco Saverio o dei
              contributori del progetto software o dei suoi licenzianti e sono
              protetti dalle leggi italiane ed internazionali sul copyright.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              L'utilizzo degli strumenti software non comporta alcuna cessione
              di diritti di proprietà intellettuale, né sul software né sui suoi
              sviluppi. Restano di esclusiva proprietà di Mazzi Francesco
              Saverio o dei contributori del progetto software:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Il software e il codice sorgente</li>
              <li>I modelli di intelligenza artificiale utilizzati</li>
              <li>I prompt e le configurazioni del sistema</li>
              <li>Gli output generati dall'AI</li>
              <li>
                I miglioramenti e gli sviluppi derivati dall'utilizzo della
                piattaforma
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              I dati che inserisci tramite gli strumenti software rimangono di
              tua proprietà. Concedi una licenza d'uso limitata per utilizzare
              tali dati al fine di fornirti il supporto nell'ambito delle
              prestazioni professionali concordate.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Responsabilità Agronomica e Decisionale
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Le informazioni e gli strumenti forniti tramite SeminAI sono di
              supporto e non sostituiscono la consulenza agronomica o tecnica
              abilitata. Le decisioni operative, inclusi ma non limitati a:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>La scelta e l'applicazione di trattamenti fitosanitari</li>
              <li>I dosaggi e le modalità di applicazione</li>
              <li>La conformità normativa e regolamentare</li>
              <li>Le scelte agronomiche e produttive</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              restano di esclusiva responsabilità dell'utente o del
              professionista incaricato. Il fornitore non assume alcuna
              responsabilità per le decisioni operative prese dall'utente sulla
              base delle informazioni o degli strumenti forniti.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Mazzi Francesco Saverio non si assume responsabilità per eventuali
              problemi derivanti da dosaggi, conformità normativa o altre
              indicazioni generate dal software, poiché gli output sono prodotti
              da sistemi di intelligenza artificiale che elaborano dati forniti
              dall'utente e non sono sotto il controllo diretto di Mazzi
              Francesco Saverio o dei contributori del progetto software.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Limitazione di Responsabilità
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Gli strumenti software sono forniti "così com'è" e "come
              disponibile". Non garantiamo che l'utilizzo sarà ininterrotto,
              sicuro o privo di errori.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Nella misura massima consentita dalla legge, non viene fornita
              alcuna garanzia, né espressa né implicita, riguardo a:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>
                La conformità normativa automatica delle informazioni o dei
                suggerimenti
              </li>
              <li>
                Il risultato produttivo o economico derivante dall'utilizzo
                degli strumenti
              </li>
              <li>
                La responsabilità per decisioni operative prese dall'utente
              </li>
              <li>
                L'accuratezza, completezza o tempestività delle informazioni
                fornite
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Nella misura massima consentita dalla legge, non si assume
              responsabilità per danni indiretti, incidentali, speciali,
              consequenziali o punitivi, o per perdite di profitti o ricavi,
              derivanti dall'uso o dall'impossibilità di utilizzare gli
              strumenti software.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Modifiche ai Termini
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Ci riserviamo il diritto di modificare questi Termini in qualsiasi
              momento. Le modifiche saranno efficaci al momento della
              pubblicazione. L'utilizzo continuato degli strumenti software dopo
              tali modifiche costituisce accettazione dei nuovi Termini.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Sospensione e Cessazione dell'Utilizzo
            </h2>
            <p className="text-gray-700 leading-relaxed">
              L'accesso agli strumenti software di SeminAI può essere sospeso o
              terminato nei seguenti casi:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>In caso di violazione di questi Termini</li>
              <li>Per motivi tecnici o di manutenzione</li>
              <li>
                In caso di cessazione della prestazione professionale concordata
              </li>
              <li>
                Al termine del progetto o della collaborazione professionale
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              La sospensione o cessazione sarà comunicata con ragionevole
              preavviso, salvo casi di violazione grave o necessità tecniche
              urgenti.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Legge Applicabile
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Questi Termini sono regolati e interpretati in conformità con le
              leggi italiane. Qualsiasi controversia sarà di competenza
              esclusiva dei tribunali italiani.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Contatti
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Per domande sui presenti Termini di Servizio, contattaci a:
            </p>
            <div className="bg-agri-green-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Email:</strong> get.seminai@gmail.com
                <br />
                <strong>Indirizzo:</strong> Italia
              </p>
            </div>
          </section>
        </div>
    </LegalPageLayout>
  );
}
