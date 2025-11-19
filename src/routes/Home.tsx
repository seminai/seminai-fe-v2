import { ChangeEvent, Component, FormEvent } from "react";
import { Link } from "react-router-dom";
import { emailApiService } from "@/api/email";
import CalendlyBookingDialog from "@/components/organism/CalendlyBookingDialog";

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

interface AdvantageCard {
  title: string;
  description: string;
  image: string;
}

export default class Home extends Component<Record<string, never>> {
  private readonly audienceHighlights: HighlightCard[] = [
    {
      title: "Per Agricoltori",
      description: "Inizia anche tu a redigere i quaderni di campagna.",
    },
    {
      title: "Per Tecnici agronomi",
      description: "Aumenta le aziende di cui seguire i quaderni di campagna.",
    },
    {
      title: "Per Associazioni di categoria o fornitori di servizi associabili",
      description:
        "Fornisci anche tu un servizio di consulenza sui quaderni di campagna e aumenta la soddisfazione dei tuoi clienti.",
    },
  ];

  private readonly advantageHighlights: AdvantageCard[] = [
    {
      title: "Conforme alle normative",
      description:
        "Il sistema verifica automaticamente la conformità delle tue attività con le normative vigenti, proteggendoti da sanzioni e garantendo la tracciabilità completa di tutte le operazioni.",
      image: "/image/conforme_alle_normative .png",
    },
    {
      title: "Riduzione di tempo e costi",
      description:
        "Interfaccia chiara e semplice per permettere a tutti l'utilizzo con automazioni che permettono la redazione delle operazioni di trattamento in modo veloce.",
      image: "/image/riduzione_tempo.png",
    },
    {
      title: "Integrabile con sistemi terzi",
      description:
        "Integrazioni con piattaforme terze per permettere l'unificazione di informazioni in una piattaforma.",
      image: "/image/integrabile.png",
    },
    {
      title: "White label personalizzato",
      description:
        "Il software può essere personalizzato tramite branding dedicato e configurazioni specifiche per i tuoi bisogni.",
      image: "/image/white_label.png",
    },
  ];

  public render() {
    return (
      <div className="min-h-screen bg-white text-black">
        {this.renderHeader()}
        {this.renderHeroSection()}
        {this.renderAudienceSection()}
        {this.renderAdvantagesSection()}
        {this.renderContactSection()}
        {this.renderFooter()}
      </div>
    );
  }

  private renderHeader() {
    return (
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Seminai Logo" className="h-10 w-auto" />
          <span className="text-xl font-semibold text-agri-green-600">
            Seminai
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a
            href="#audience"
            className="text-sm font-medium hover:text-agri-green-600 transition-colors"
          >
            Per chi è?
          </a>
          <a
            href="#advantages"
            className="text-sm font-medium hover:text-agri-green-600 transition-colors"
          >
            Vantaggi
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            to="/auth"
            className="text-sm font-medium hover:text-agri-green-600 transition-colors"
          >
            Accedi
          </Link>
        </div>
      </header>
    );
  }

  private renderHeroSection() {
    return (
      <section
        className="min-h-screen pt-32 flex items-center px-6 md:px-20 max-w-7xl mx-auto"
        id="hero"
      >
        <div className="flex flex-col md:flex-row items-center gap-12 py-20">
          <div className="md:w-1/2 space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900">
              Fare quaderni di campagna non è mai stato così semplice
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-600 leading-relaxed">
              Il quaderno di campagna digitale personalizzabile che rivoluziona
              la gestione delle operazioni con l&apos;intelligenza artificiale.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <CalendlyBookingDialog
                trigger={
                  <button
                    type="button"
                    className="py-3 px-8 rounded-full bg-green-700 text-white font-medium hover:bg-green-600 transition-colors"
                  >
                    Prenota un meeting gratuito
                  </button>
                }
              />
              <a
                href="#audience"
                className="py-3 px-8 rounded-full border border-gray-300 font-medium hover:bg-gray-50 transition-colors text-center"
              >
                Scopri di più
              </a>
            </div>
          </div>
          <div className="md:w-1/2">
            <img
              src="/robot_farmer.png"
              alt="Robot Farmer"
              className="w-full h-auto object-cover rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </section>
    );
  }

  private renderAudienceSection() {
    return (
      <section id="audience" className="py-20 px-6 md:px-20 bg-harvest-100">
        <div className="max-w-7xl mx-auto text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-gray-900">Per chi è?</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {this.audienceHighlights.map((highlight) => (
              <div
                key={highlight.title}
                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-left h-full"
              >
                <h3 className="text-xl font-semibold mb-4 text-gray-900">
                  {highlight.title}
                </h3>
                <p className="text-gray-600">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  private renderAdvantagesSection() {
    return (
      <section id="advantages" className="py-20 px-6 md:px-20 bg-white">
        <div className="max-w-7xl mx-auto text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-gray-900">Vantaggi</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {this.advantageHighlights.map((highlight) => (
              <div
                key={highlight.title}
                className="bg-harvest-50 p-8 rounded-2xl border border-harvest-200 text-left h-full flex flex-col"
              >
                <div className="mb-6 flex justify-center">
                  <img
                    src={highlight.image}
                    alt={highlight.title}
                    className="h-40 w-auto object-contain"
                  />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900">
                  {highlight.title}
                </h3>
                <p className="text-gray-700">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  private renderContactSection() {
    return (
      <section id="contact-request" className="py-20 px-6 md:px-20 bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Contattaci
          </h2>
          <p className="text-lg text-gray-600">
            Compila il messaggio e ti risponderemo al più presto
          </p>
          <ContactRequestForm />
        </div>
      </section>
    );
  }

  private renderFooter() {
    return (
      <footer
        id="contact"
        className="py-12 px-6 md:px-20 bg-gray-900 text-white"
      >
        <div className="max-w-7xl mx-auto flex justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <img src="/logo.png" alt="Seminai Logo" className="h-8 w-auto" />
              <span className="text-xl font-semibold text-white">Seminai</span>
            </div>
            <p className="text-gray-300">
              Rivoluziona la gestione dei tuoi campi con l&apos;intelligenza
              artificiale.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4 text-white">Contattaci</h3>
            <p className="text-gray-400 mb-4">
              Hai domande? Siamo qui per aiutarti.
            </p>
            <a
              href="mailto:get.seminai@gmail.com.it"
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              get.seminai@gmail.com
            </a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Seminai. Tutti i diritti riservati.
        </div>
      </footer>
    );
  }

}
