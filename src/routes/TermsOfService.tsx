import { Link } from "react-router-dom";

export default function TermsOfService() {
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
            <span className="text-xl font-semibold text-agri-green-800">
              SeminAI
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-sm text-gray-600 hover:text-agri-green-700 transition"
            >
              Dashboard
            </Link>
            <Link
              to="/auth"
              className="text-sm text-gray-600 hover:text-agri-green-700 transition"
            >
              Accedi
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
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
              1. Accettazione dei Termini
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Benvenuto su SeminAI. Utilizzando la nostra piattaforma, accetti
              di essere vincolato dai presenti Termini di Servizio. Se non
              accetti questi termini, ti preghiamo di non utilizzare i nostri
              servizi.
            </p>
            <p className="text-gray-700 leading-relaxed">
              SeminAI è una piattaforma dedicata alla gestione agricola digitale
              che fornisce strumenti per ottimizzare le pratiche agricole e
              prendere decisioni informate basate sui dati.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Descrizione del Servizio
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              SeminAI offre servizi di gestione agricola digitale, inclusi ma
              non limitati a:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Gestione di aziende agricole e appezzamenti</li>
              <li>Etichettatura e tracciabilità dei prodotti</li>
              <li>
                Accesso a database di prodotti fitosanitari e varietà vegetali
              </li>
              <li>Strumenti di analisi e reportistica</li>
              <li>Consulenza tramite intelligenza artificiale</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Registrazione dell'Account
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Per utilizzare determinate funzionalità di SeminAI, devi
              registrarti creando un account. Ti impegni a:
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
              Ti impegni a utilizzare SeminAI solo per scopi legali e in
              conformità con questi Termini. È vietato:
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
                della piattaforma
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
              software, sono di proprietà esclusiva di SeminAI o dei suoi
              licenzianti e sono protetti dalle leggi italiane ed internazionali
              sul copyright.
            </p>
            <p className="text-gray-700 leading-relaxed">
              I dati che inserisci nella piattaforma rimangono di tua proprietà.
              Concedi a SeminAI una licenza per utilizzare tali dati al fine di
              fornirti i servizi richiesti.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Limitazione di Responsabilità
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              SeminAI fornisce la piattaforma "così com'è" e "come disponibile".
              Non garantiamo che il servizio sarà ininterrotto, sicuro o privo
              di errori.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Nella misura massima consentita dalla legge, SeminAI non sarà
              responsabile per danni indiretti, incidentali, speciali,
              consequenziali o punitivi, o per perdite di profitti o ricavi,
              derivanti dall'uso o dall'impossibilità di utilizzare il servizio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Modifiche ai Termini
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Ci riserviamo il diritto di modificare questi Termini in qualsiasi
              momento. Le modifiche saranno efficaci al momento della
              pubblicazione sulla piattaforma. L'uso continuato del servizio
              dopo tali modifiche costituisce accettazione dei nuovi Termini.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Risoluzione
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Possiamo sospendere o terminare il tuo accesso a SeminAI
              immediatamente, senza preavviso, in caso di violazione di questi
              Termini o per qualsiasi altro motivo a nostra discrezione.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Legge Applicabile
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Questi Termini sono regolati e interpretati in conformità con le
              leggi italiane. Qualsiasi controversia sarà di competenza
              esclusiva dei tribunali italiani.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Contatti
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
                className="text-sm text-gray-600 hover:text-agri-green-700 transition"
              >
                Termini di Servizio
              </Link>
              <Link
                to="/privacy-policy"
                className="text-sm text-gray-600 hover:text-agri-green-700 transition"
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
