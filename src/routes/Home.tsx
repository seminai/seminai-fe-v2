import { ChangeEvent, Component, FormEvent } from "react";
import { Link } from "react-router-dom";
import { emailApiService } from "@/api/email";
import CalendlyInlineWidget from "@/components/organism/CalendlyInlineWidget";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Clock,
  Database,
  FileCheck,
  LayoutTemplate,
  Palette,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface ContactRequestFormProps {
  className?: string;
}

interface ContactRequestFormState {
  name: string;
  email: string;
  message: string;
  isSubmitting: boolean;
  errorMessage: string;
  successMessage: string;
}

class ContactRequestForm extends Component<
  ContactRequestFormProps,
  ContactRequestFormState
> {
  public constructor(props: ContactRequestFormProps) {
    super(props);
    this.state = {
      name: "",
      email: "",
      message: "",
      isSubmitting: false,
      errorMessage: "",
      successMessage: "",
    };
  }

  private handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      name: event.target.value,
      errorMessage: "",
      successMessage: "",
    });
  };

  private handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      email: event.target.value,
      errorMessage: "",
      successMessage: "",
    });
  };

  private handleMessageChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({
      message: event.target.value,
      errorMessage: "",
      successMessage: "",
    });
  };

  private handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = this.state.name.trim();
    const trimmedEmail = this.state.email.trim();
    const trimmedMessage = this.state.message.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      this.setState({ errorMessage: "Please fill out every field." });
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      this.setState({ errorMessage: "Please provide a valid email address." });
      return;
    }

    this.setState({ isSubmitting: true, errorMessage: "" });

    try {
      const response = await emailApiService.sendContactEmail({
        name: trimmedName,
        email: trimmedEmail,
        body: trimmedMessage,
      });

      this.setState({
        name: "",
        email: "",
        message: "",
        isSubmitting: false,
        successMessage: response.message ?? "Richiesta inviata correttamente.",
      });
    } catch {
      this.setState({
        isSubmitting: false,
        errorMessage:
          "Si è verificato un errore durante l'invio della richiesta.",
      });
    }
  };

  public render() {
    const { className } = this.props;
    const { name, email, message, isSubmitting, errorMessage, successMessage } =
      this.state;

    return (
      <form
        className={`bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6 ${
          className ?? ""
        }`}
        onSubmit={this.handleSubmit}
      >
        <label className="block text-left">
          <span className="text-gray-700 font-medium">Nome e cognome</span>
          <input
            className="mt-3 w-full rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
            placeholder="Mario Rossi"
            value={name}
            onChange={this.handleNameChange}
          />
        </label>
        <label className="block text-left">
          <span className="text-gray-700 font-medium">Email</span>
          <input
            type="email"
            className="mt-3 w-full rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
            placeholder="mario.rossi@example.com"
            value={email}
            onChange={this.handleEmailChange}
          />
        </label>
        <label className="block text-left">
          <span className="text-gray-700 font-medium">
            Raccontaci la tua richiesta
          </span>
          <textarea
            className="mt-3 w-full min-h-[180px] rounded-2xl border border-gray-200 p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-agri-green-500 focus:border-transparent transition"
            placeholder="Descrivi come possiamo aiutarti..."
            value={message}
            onChange={this.handleMessageChange}
          />
        </label>
        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
        {successMessage && (
          <p className="text-sm text-agri-green-600">{successMessage}</p>
        )}
        <button
          type="submit"
          className="w-full py-4 px-6 rounded-2xl bg-green-700 text-white font-semibold hover:bg-green-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Invio in corso..." : "Invia"}
        </button>
      </form>
    );
  }
}

interface HighlightCard {
  title: string;
  description: string;
}

interface AdvantageSection {
  title: string;
  features: string[];
}

interface HomeState {
  mobileTab: "message" | "meeting";
}

export default class Home extends Component<Record<string, never>, HomeState> {
  private readonly audienceHighlights: HighlightCard[] = [
    {
      title: "Per Agricoltori",
      description:
        "Ottimizza il tuo lavoro quotidiano con strumenti semplici e intuitivi. La nostra piattaforma ti permette di redigere i quaderni di campagna in modo rapido, preciso e sempre conforme alle normative. Riduci il tempo dedicato alla burocrazia e concentrati su ciò che conta davvero: la tua produzione.",
    },
    {
      title: "Per Tecnici Agronomi",
      description:
        "Gestisci più aziende contemporaneamente con maggiore efficienza. Grazie alle nostre soluzioni digitali puoi seguire i quaderni di campagna dei tuoi clienti in modo centralizzato, organizzato e trasparente. Offri un servizio più completo, riduci gli errori e aumenta il valore della tua consulenza professionale.",
    },
    {
      title: "Per Associazioni di Categoria e Fornitori di Servizi",
      description:
        "Amplia la tua offerta con un servizio avanzato di consulenza digitale sui quaderni di campagna. Supporta agricoltori, tecnici e imprese con strumenti moderni e affidabili, migliorando la qualità dei servizi offerti e incrementando la soddisfazione dei tuoi associati o clienti.",
    },
  ];

  private readonly advantagesList: AdvantageSection[] = [
    {
      title: "Conforme alle normative",
      features: [
        "Verifica automatica della conformità",
        "Tracciabilità completa",
        "Aggiornamenti normativi automatici",
        "Protezione da sanzioni",
        "Documentazione pronta per controlli",
        "Calcolo automatico tempi di carenza",
      ],
    },
    {
      title: "Riduzione di tempo e costi",
      features: [
        "Interfaccia intuitiva",
        "Compilazione guidata",
        "Template operazioni ricorrenti",
        "Calcolo automatico delle dosi",
        "Eliminazione della carta",
        "Riduzione errori di trascrizione",
      ],
    },
    {
      title: "White label personalizzato",
      features: [
        "Branding completo",
        "Configurazioni su misura",
        "Personalizzazione workflow",
        "Domini dedicati",
        "Interfaccia brandizzata",
        "Modulazione funzionalità",
      ],
    },
    {
      title: "Integrabile con sistemi terzi",
      features: [
        "API aperte e documentate",
        "Import/export dati",
        "Sincronizzazione con e-commerce",
        "Integrazione con sistemi meteo",
        "Connessione con marketplace agricoli",
        "Interoperabilità con IoT",
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
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-20 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Seminai Logo" className="h-10 w-auto" />
            <span className="text-xl font-semibold text-agri-green-600">
              Seminai
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#advantages"
              className="hidden md:inline-flex px-5 py-2.5 rounded-full border border-agri-green-600 text-agri-green-600 text-sm font-medium hover:bg-agri-green-50 transition-colors"
            >
              Scopri i vantaggi
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
    this.state = {
      mobileTab: "message",
    };
  }

  private scrollToContactAndSelectTab = () => {
    this.setState({ mobileTab: "meeting" }, () => {
      const contactSection = document.getElementById("contact-request");
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: "smooth" });
      }
    });
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
              Fare quaderni di campagna non è mai stato così semplice
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-600 leading-relaxed">
              Il quaderno di campagna digitale personalizzabile che rivoluziona
              la gestione delle operazioni con l&apos;intelligenza artificiale.
            </h2>
            <div className="pt-6">
              <button
                type="button"
                onClick={this.scrollToContactAndSelectTab}
                className="py-3 px-8 rounded-full bg-agri-green-600 text-white font-medium hover:bg-agri-green-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Prenota gratis
              </button>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center md:justify-end">
            <img
              src="/robot_farmer.png"
              alt="Robot Farmer"
              className="w-full max-w-lg h-auto object-cover rounded-2xl shadow-xl"
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
            <h2 className="text-4xl font-bold text-white">A chi è dedicato?</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {this.audienceHighlights.map((highlight, index) => (
              <div
                key={highlight.title}
                className="bg-agri-green-500 p-8 rounded-2xl text-left h-full flex flex-col items-start hover:bg-agri-green-400 transition-colors"
              >
                <div className="bg-white rounded-full p-2 w-8 h-8 flex items-center justify-center mb-6">
                  {index === 0 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-agri-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  {index === 1 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-agri-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  )}
                  {index === 2 && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-agri-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
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
              Niente più calcoli complessi, fogli sparsi o dati incompleti.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Che tu sia in campo, in ufficio o in movimento, la nostra
              soluzione automatizza i dosaggi, integra tutte le informazioni
              agronomiche in un’unica fonte dati e ti guida nel pieno rispetto
              delle normative. Un modo semplice, preciso e immediato per
              compilare il quaderno di campagna senza stress.
            </p>
          </div>
          <div className="md:w-1/2 flex justify-center md:justify-end">
            <img
              src="image/no_calcoli.png"
              alt="Gestione semplificata"
              className="w-full max-w-xs h-auto object-cover "
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
            Scopri i vantaggi di Seminai
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
                          className="w-3 h-3 text-agri-green-600"
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
                              className="w-3 h-3 text-agri-green-600"
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
        </div>
      </section>
    );
  }

  private renderDetailedFeaturesSection() {
    return (
      <section className="py-32 px-6 md:px-20 bg-white">
        <div className="max-w-7xl mx-auto space-y-32">
          {/* Feature 1: Conforme alle normative */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="w-full md:w-1/2 order-2 md:order-1 flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-agri-green-50 rounded-3xl flex items-center justify-center p-12">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
                    <ShieldCheck className="w-24 h-24 text-agri-green-600" />
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-md">
                      <FileCheck className="w-12 h-12 text-agri-green-500" />
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md">
                      <CheckCircle2 className="w-12 h-12 text-agri-green-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 order-1 md:order-2 space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                Conforme alle normative
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Il sistema verifica automaticamente ogni operazione che
                registri, assicurandosi che rispetti tutte le normative vigenti.
                Lavora sereno sapendo che ogni trattamento è tracciato
                correttamente e la documentazione è sempre pronta per eventuali
                controlli.
              </p>
            </div>
          </div>

          {/* Feature 2: Riduzione di tempo e costi */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="w-full md:w-1/2 space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                Riduzione di tempo e costi
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Un&apos;interfaccia così intuitiva che chiunque può usarla dal
                primo giorno. Compila il quaderno in pochi clic grazie alle
                automazioni intelligenti che calcolano dosi, suggeriscono
                prodotti e salvano i tuoi trattamenti ricorrenti.
              </p>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-blue-50 rounded-3xl flex items-center justify-center p-12">
                <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-white p-6 rounded-full shadow-xl mb-8">
                    <Clock className="w-24 h-24 text-blue-600" />
                  </div>
                  <div className="absolute top-1/2 right-10 bg-white p-4 rounded-2xl shadow-lg animate-bounce">
                    <Zap className="w-10 h-10 text-yellow-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: White label personalizzato */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="w-full md:w-1/2 order-2 md:order-1 flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-purple-50 rounded-3xl flex items-center justify-center p-12">
                <div className="relative z-10">
                  <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-purple-100">
                    <LayoutTemplate className="w-32 h-32 text-purple-600" />
                  </div>
                  <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-full shadow-lg">
                    <Palette className="w-12 h-12 text-pink-500" />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 order-1 md:order-2 space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                White label personalizzato
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Trasforma la piattaforma nella tua soluzione aziendale con logo,
                colori e dominio personalizzati. Configura campi, workflow e
                funzionalità per adattare il sistema esattamente al tuo modo di
                lavorare.
              </p>
            </div>
          </div>

          {/* Feature 4: Integrabile con sistemi terzi */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="w-full md:w-1/2 space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
                Integrabile con sistemi terzi
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Collega il quaderno ai software che già utilizzi attraverso API
                aperte e sincronizzazioni automatiche. Unifica tutte le
                informazioni aziendali in un&apos;unica piattaforma e lascia che
                i dati fluiscano liberamente tra i sistemi.
              </p>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-orange-50 rounded-3xl flex items-center justify-center p-12">
                <div className="relative z-10 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-full shadow-xl z-20">
                    <Database className="w-20 h-20 text-orange-600" />
                  </div>
                  {/* Connection nodes */}
                  <div className="absolute -top-16 -right-12 bg-white p-3 rounded-xl shadow-md">
                    <div className="w-8 h-8 bg-blue-500 rounded-full" />
                  </div>
                  <div className="absolute -bottom-12 -left-10 bg-white p-3 rounded-xl shadow-md">
                    <div className="w-8 h-8 bg-green-500 rounded-full" />
                  </div>
                  {/* Connecting lines would be complex in pure CSS/Tailwind without SVG paths, simulating with borders/positioning if needed, but icons are enough for "mini component" */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  private renderContactSection() {
    return (
      <section id="contact-request" className="py-20 px-6 md:px-20 bg-white">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Contattaci
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Hai bisogno di informazioni o vuoi vedere Seminai in azione?
              Scegli come preferisci metterti in contatto con noi.
            </p>
          </div>

          {/* Desktop Layout: Side-by-side */}
          <div className="hidden md:grid md:grid-cols-2 gap-12 items-start">
            <div className="bg-white p-8 rounded-3xl border border-agri-green-100 text-left h-full shadow-lg shadow-agri-green-50">
              <h3 className="text-2xl font-bold mb-6 text-gray-900">
                Scrivici un messaggio
              </h3>
              <p className="text-gray-600 mb-8">
                Compila il form e ti risponderemo al più presto via email.
              </p>
              <ContactRequestForm className="shadow-none border-none bg-transparent p-0" />
            </div>

            <div className="bg-white p-8 rounded-3xl border border-agri-green-100 text-left h-full overflow-hidden shadow-lg shadow-agri-green-50">
              <h3 className="text-2xl font-bold mb-6 text-gray-900">
                Prenota una demo
              </h3>
              <p className="text-gray-600 mb-8">
                Scegli il giorno e l'orario che preferisci per una videochiamata
                con il nostro team.
              </p>
              <CalendlyInlineWidget height={650} />
            </div>
          </div>

          {/* Mobile Layout: Tabs */}
          <div className="md:hidden">
            <Tabs
              value={this.state.mobileTab}
              onValueChange={(value) =>
                this.setState({ mobileTab: value as "message" | "meeting" })
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-agri-green-50">
                <TabsTrigger
                  value="message"
                  className="data-[state=active]:bg-agri-green-600 data-[state=active]:text-white rounded-full py-3"
                >
                  Scrivici
                </TabsTrigger>
                <TabsTrigger
                  value="meeting"
                  className="data-[state=active]:bg-agri-green-600 data-[state=active]:text-white rounded-full py-3"
                >
                  Pianifica incontro
                </TabsTrigger>
              </TabsList>
              <TabsContent value="message" className="mt-0">
                <div className="bg-white p-6 rounded-3xl border border-agri-green-100 text-left shadow-lg shadow-agri-green-50">
                  <ContactRequestForm className="shadow-none border-none bg-transparent p-0" />
                </div>
              </TabsContent>
              <TabsContent value="meeting" className="mt-0">
                <div className="bg-white p-2 rounded-3xl border border-agri-green-100 overflow-hidden shadow-lg shadow-agri-green-50">
                  <CalendlyInlineWidget height={650} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    );
  }

  private renderFooter() {
    return (
      <footer
        id="contact"
        className="py-12 px-6 md:px-20 bg-harvest-100 text-agri-green-900 border-t border-harvest-200"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="md:w-1/3">
            <div className="flex items-center gap-2 mb-6">
              <img src="/logo.png" alt="Seminai Logo" className="h-8 w-auto" />
              <span className="text-xl font-semibold text-agri-green-700">
                Seminai
              </span>
            </div>
            <p className="text-agri-green-800/80 leading-relaxed">
              Rivoluziona la gestione dei tuoi campi con l&apos;intelligenza
              artificiale.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 text-agri-green-800">
              Contattaci
            </h3>
            <p className="text-agri-green-800/80 mb-4">
              Hai domande? Siamo qui per aiutarti.
            </p>
            <a
              href="mailto:get.seminai@gmail.com"
              className="text-agri-green-600 hover:text-agri-green-700 font-medium transition-colors"
            >
              get.seminai@gmail.com
            </a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-harvest-200 text-center text-agri-green-800/60 text-sm">
          &copy; {new Date().getFullYear()} Seminai. Tutti i diritti riservati.
        </div>
      </footer>
    );
  }
}
