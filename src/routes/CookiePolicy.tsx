import { Seo } from "@/components/molecules/Seo/Seo";
import { SEO } from "@/config/seo";
import { LegalPageLayout } from "./Home/LegalPageLayout";

export default function CookiePolicy() {
  return (
    <LegalPageLayout>
      <Seo {...SEO.cookie} />
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
      <p className="text-sm text-gray-500 mb-8" suppressHydrationWarning>
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
            1. Cosa sono i cookie
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            I cookie sono piccoli file di testo che i siti web e le applicazioni
            salvano sul dispositivo dell&apos;utente per memorizzare preferenze,
            mantenere la sessione o raccogliere informazioni sull&apos;utilizzo
            del servizio.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            2. Tipologie di cookie utilizzati
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            SeminAI utilizza cookie e tecnologie simili per:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
            <li>
              <strong>Cookie tecnici:</strong> necessari per il funzionamento
              della piattaforma, inclusa l&apos;autenticazione e la gestione
              della sessione
            </li>
            <li>
              <strong>Cookie analitici:</strong> per analizzare l&apos;uso della
              piattaforma e migliorare gli strumenti software
            </li>
            <li>
              <strong>Cookie di preferenze:</strong> per ricordare le
              impostazioni dell&apos;utente, come la lingua selezionata
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            3. Gestione delle preferenze
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Puoi gestire o disabilitare i cookie tramite le impostazioni del tuo
            browser. Tieni presente che la disabilitazione dei cookie tecnici
            potrebbe compromettere il corretto funzionamento della piattaforma.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            4. Contatti
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Per domande relative alla presente Cookie Policy, contattaci a:
          </p>
          <div className="bg-agri-green-50 p-4 rounded-lg">
            <p className="text-gray-700">
              <strong>Email:</strong> info@seminai.tech
            </p>
          </div>
        </section>
      </div>
    </LegalPageLayout>
  );
}
