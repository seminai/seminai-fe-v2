import { Component } from "react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ContactRequestForm } from "@/components/organism/ContactRequestForm";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface HighlightCard {
  title: string;
  description: string;
}

interface AdvantageSection {
  title: string;
  features: string[];
}

export default class Home extends Component<
  Record<string, never>,
  Record<string, never>
> {
  private readonly audienceHighlights: HighlightCard[] = [
    {
      title: "crea rischio",
      description:
        "Sanzioni e contestazioni se qualcosa non torna. Il quaderno è il primo documento che controllano.",
    },
    {
      title: "fa perdere tempo",
      description:
        "Ore in compilazione, copia e incolla, ricerche su fascicoli e disciplinari invece che in campo.",
    },
    {
      title: "genera errori",
      description:
        "Dosi sbagliate, carenze non rispettate, dati incoerenti. Ogni errore può diventare non conformità.",
    },
    {
      title: "aumenta responsabilità legale",
      description:
        "Sei tu il responsabile in caso di controllo. Ogni firma sul quaderno conta.",
    },
  ];

  private readonly advantagesList: AdvantageSection[] = [
    {
      title: "Import fascicolo in 30 secondi",
      features: [
        "Carica il CSV.",
        "Parcelle e unità produttive vengono generate automaticamente.",
        "Niente creazione manuale campo per campo.",
      ],
    },
    {
      title: "Dosaggi conformi senza calcoli manuali",
      features: [
        "Il sistema verifica: dosi massime, tempi di carenza, limiti disciplinari, conformità normativa.",
        "Prima che tu carichi sul portale.",
      ],
    },
    {
      title: "Stop copia/incolla ripetitivo",
      features: [
        "Scrivi in chat da piattaforma o WhatsApp: «Mais, 12 ettari, glifosato 2.3 L/ha».",
        "Il sistema: struttura l'operazione, controlla conformità, aggiorna unità produttiva.",
        "Tu approvi.",
      ],
    },
    {
      title: "Dati finalmente allineati",
      features: [
        "Superfici, trattamenti, magazzino.",
        "Il sistema segnala discrepanze prima del controllo.",
      ],
    },
  ];

  public render() {
    return (
      <div className="min-h-screen bg-white text-black">
        {this.renderHeader()}
        {this.renderHeroSection()}
        {this.renderAudienceSection()}
        {this.renderNewSection()}
        {this.renderAdvantagesSection()}
        {this.renderDetailedFeaturesSection()}
        {this.renderContactSection()}
        {this.renderFooter()}
      </div>
    );
  }

  private renderHeader() {
    return (
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100 px-4 py-2 md:px-0 md:py-0">
        <div className="max-w-7xl mx-auto py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Seminai Logo" className="h-10 w-auto" />
            <span className="text-xl font-semibold text-black">Seminai</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#advantages"
              className="hidden md:inline-flex px-5 py-2.5 rounded-full border border-agri-green-600 text-black text-sm font-medium hover:bg-agri-green-50 transition-colors"
            >
              Cosa automatizziamo
            </a>
            <Link
              to="/auth"
              className="px-5 py-2.5 rounded-full bg-agri-green-600 text-white text-sm font-medium hover:bg-agri-green-700 transition-colors"
            >
              Accedi
            </Link>
          </div>
        </div>
      </header>
    );
  }

  public constructor(props: Record<string, never>) {
    super(props);
    this.state = {};
  }

  public componentDidMount(): void {
    // removed calendly script loading
  }

  private scrollToContactAndSelectTab = () => {
    const contactSection = document.getElementById("contact-request");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  private renderHeroSection() {
    return (
      <section
        className="min-h-screen pt-32 flex items-center justify-center px-6 md:px-20"
        id="hero"
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-12 py-20">
          <div className="md:w-1/2 space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900">
              Dal 2027 il quaderno sarà obbligatorio.
              <br />
              O automatizzi, o raddoppi le ore.
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-600 leading-relaxed">
              Il quaderno ti fa perdere 8 ore a settimana. Noi automatizziamo la
              parte più pesante.
            </h2>
            <div className="pt-6">
              <button
                type="button"
                onClick={this.scrollToContactAndSelectTab}
                className="py-3 px-8 rounded-full bg-agri-green-600 text-white font-medium hover:bg-agri-green-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Prenota una demo
              </button>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center md:justify-end">
            <OptimizedImage
              src="/robot_farmer.png"
              alt="Robot Farmer"
              priority={true}
              containerClassName="w-full max-w-lg rounded-2xl shadow-xl"
              className="w-full h-auto object-cover rounded-2xl"
            />
          </div>
        </div>
      </section>
    );
  }

  private renderAudienceSection() {
    return (
      <section id="audience" className="py-20 px-6 md:px-20 bg-agri-green-600">
        <div className="max-w-7xl mx-auto text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white">
              Il 50% dei tecnici dice che il quaderno:
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {this.audienceHighlights.map((highlight, index) => (
              <div
                key={highlight.title}
                className="bg-agri-green-500 p-8 rounded-2xl text-left h-full flex flex-col items-start hover:bg-agri-green-400 transition-colors"
              >
                <div className="bg-white rounded-full p-2 w-8 h-8 flex items-center justify-center mb-6">
                  {index === 0 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-black"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  )}
                  {index === 1 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-black"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  {index === 2 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-black"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  {index === 3 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-black"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2"
                      />
                    </svg>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">
                  {highlight.title}
                </h3>
                <p className="text-white/90 text-sm leading-relaxed mb-6 flex-grow">
                  {highlight.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  private renderNewSection() {
    return (
      <section className="py-32 px-6 md:px-20 bg-white">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="md:w-1/2 space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Seminai automatizza la parte più pesante del tuo lavoro.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Preparazione automatica prima del portale: strutture, dosaggi e
              conformità pronti quando serve. Continua a usare il portale
              regionale; Seminai prepara tutto prima.
            </p>
          </div>
          <div className="md:w-1/2 flex justify-center md:justify-end">
            <OptimizedImage
              src="image/no_calcoli.png"
              alt="Gestione semplificata"
              containerClassName="w-full max-w-xs"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>
    );
  }

  private renderAdvantagesSection() {
    return (
      <section
        id="advantages"
        className="py-32 px-6 md:px-20 bg-agri-green-600"
      >
        <div className="max-w-7xl mx-auto bg-agri-green-500 rounded-3xl p-12 md:p-20 text-white">
          <h2 className="text-4xl font-bold mb-12">
            Cosa automatizziamo davvero
          </h2>

          {/* Desktop View - Grid */}
          <div className="hidden md:grid md:grid-cols-2 gap-x-12 gap-y-16">
            {this.advantagesList.map((section) => (
              <div key={section.title}>
                <h3 className="text-xl font-bold mb-6">{section.title}</h3>
                <ul className="space-y-3">
                  {section.features.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm font-medium"
                    >
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-black"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile View - Accordion */}
          <div className="md:hidden">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {this.advantagesList.map((section, index) => (
                <AccordionItem
                  value={`item-${index}`}
                  key={index}
                  className="border-none"
                >
                  <AccordionTrigger className="text-xl font-bold text-white hover:no-underline py-4">
                    {section.title}
                  </AccordionTrigger>
                  <AccordionContent className="text-white">
                    <ul className="space-y-3 pt-2">
                      {section.features.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-3 text-sm font-medium"
                        >
                          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-3 h-3 text-black"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-12">
            <button
              type="button"
              onClick={this.scrollToContactAndSelectTab}
              className="py-4 px-10 rounded-full bg-white text-black font-semibold hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl"
            >
              Prenota una demo
            </button>
          </div>
        </div>
      </section>
    );
  }

  private renderDetailedFeaturesSection() {
    return (
      <section className="py-32 px-6 md:px-20 bg-white">
        <div className="max-w-7xl mx-auto space-y-32">
          {/* 1. Import fascicolo in 30 secondi */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="w-full md:w-1/2 order-2 md:order-1 flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-agri-green-50 rounded-3xl flex items-center justify-center p-12">
                <OptimizedImage
                  src="/image/conforme_alle_normative.png"
                  alt="Import fascicolo"
                  containerClassName="w-full h-full"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="w-full md:w-1/2 order-1 md:order-2 space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                1. Import fascicolo in 30 secondi
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Carica il CSV. Parcelle e unità produttive vengono generate
                automaticamente. Niente creazione manuale campo per campo.
              </p>
              <button
                type="button"
                onClick={this.scrollToContactAndSelectTab}
                className="text-black font-semibold hover:text-black transition-colors underline decoration-2 underline-offset-4"
              >
                Prenota una demo
              </button>
            </div>
          </div>

          {/* 2. Dosaggi conformi senza calcoli manuali */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="w-full md:w-1/2 space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                2. Dosaggi conformi senza calcoli manuali
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Il sistema verifica: dosi massime, tempi di carenza, limiti
                disciplinari, conformità normativa. Prima che tu carichi sul
                portale.
              </p>
              <button
                type="button"
                onClick={this.scrollToContactAndSelectTab}
                className="text-black font-semibold hover:text-black transition-colors underline decoration-2 underline-offset-4"
              >
                Prenota una demo
              </button>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-blue-50 rounded-3xl flex items-center justify-center p-12">
                <OptimizedImage
                  src="/image/riduzione_costi_tempo.png"
                  alt="Dosaggi conformi"
                  containerClassName="w-full h-full"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* 3. Stop copia/incolla ripetitivo */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="w-full md:w-1/2 order-2 md:order-1 flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-emerald-50 rounded-3xl flex items-center justify-center p-12">
                <OptimizedImage
                  src="/image/chat_farmer_robot.png"
                  alt="Chat operazioni"
                  containerClassName="w-full h-full"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="w-full md:w-1/2 order-1 md:order-2 space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                3. Stop copia/incolla ripetitivo
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Scrivi in chat da piattaforma o WhatsApp: &quot;Mais, 12 ettari,
                glifosato 2.3 L/ha&quot;. Il sistema struttura l&apos;operazione,
                controlla conformità, aggiorna unità produttiva. Tu approvi.
              </p>
              <button
                type="button"
                onClick={this.scrollToContactAndSelectTab}
                className="text-black font-semibold hover:text-black transition-colors underline decoration-2 underline-offset-4"
              >
                Prenota una demo
              </button>
            </div>
          </div>

          {/* 4. Dati finalmente allineati */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="w-full md:w-1/2 space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                4. Dati finalmente allineati
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Superfici, trattamenti, magazzino. Il sistema segnala discrepanze
                prima del controllo.
              </p>
              <button
                type="button"
                onClick={this.scrollToContactAndSelectTab}
                className="text-black font-semibold hover:text-black transition-colors underline decoration-2 underline-offset-4"
              >
                Prenota una demo
              </button>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-orange-50 rounded-3xl flex items-center justify-center p-12">
                <OptimizedImage
                  src="/image/integrabile.png"
                  alt="Dati allineati"
                  containerClassName="w-full h-full"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* 5. Il risultato */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="w-full md:w-1/2 space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                Il risultato
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Meno inserimento manuale. Meno errori arancioni. Meno notti tra
                ottobre e febbraio. Gestisci più aziende senza raddoppiare le
                ore.
              </p>
              <button
                type="button"
                onClick={this.scrollToContactAndSelectTab}
                className="text-black font-semibold hover:text-black transition-colors underline decoration-2 underline-offset-4"
              >
                Prenota una demo
              </button>
            </div>
          </div>

          {/* 6. Positioning */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="w-full space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                Non è un altro gestionale.
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                È un sistema che compila il quaderno per te. Continua a usare il
                portale regionale. Seminai prepara tutto prima.
              </p>
              <button
                type="button"
                onClick={this.scrollToContactAndSelectTab}
                className="text-black font-semibold hover:text-black transition-colors underline decoration-2 underline-offset-4"
              >
                Prenota una demo
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  private renderContactSection() {
    return (
      <section id="contact-request" className="py-20 px-6 md:px-20 bg-white">
        <div className="max-w-3xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Prenota una demo
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Se oggi perdi 8 ore a settimana per azienda, vedi cosa succede
              quando ne perdi 2.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-agri-green-100 text-left shadow-lg shadow-agri-green-50">
            <ContactRequestForm className="shadow-none border-none bg-transparent p-0" />
          </div>
        </div>
      </section>
    );
  }

  private renderFooter() {
    return (
      <footer
        id="contact"
        className="py-12 px-6 md:px-20 bg-harvest-100 text-black border-t border-harvest-200"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="md:w-1/3">
            <div className="flex items-center gap-2 mb-6">
              <img src="/logo.png" alt="Seminai Logo" className="h-8 w-auto" />
              <span className="text-xl font-semibold text-black">Seminai</span>
            </div>
            <p className="text-black/80 leading-relaxed">
              Rivoluziona la gestione dei tuoi campi con l&apos;intelligenza
              artificiale.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 text-black">Contattaci</h3>
            <p className="text-black/80 mb-4">
              Hai domande? Siamo qui per aiutarti.
            </p>
            <a
              href="mailto:get.seminai@gmail.com"
              className="text-black hover:text-black font-medium transition-colors"
            >
              get.seminai@gmail.com
            </a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-harvest-200 text-center text-black/60 text-sm">
          &copy; {new Date().getFullYear()} Seminai. Tutti i diritti riservati.
        </div>
      </footer>
    );
  }
}
