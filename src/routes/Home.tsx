import { ChangeEvent, Component, FormEvent } from "react";
import { Link } from "react-router-dom";
import { MorphingText } from "@/components/magicui/morphing-text";
import { VideoText } from "@/components/magicui/video-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Card } from "@/components/ui/card";
import { feedbacks } from "@/utils/feedback";
import { useIsMobile } from "@/hooks/use-mobile";
import { emailApiService } from "@/api/email";

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

export default function Home() {
  const isMobile = useIsMobile();
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Seminai Logo" className="h-10 w-auto" />
          <span className="text-xl font-semibold text-agri-green-600">
            Seminai
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a
            href="#advantages"
            className="text-sm font-medium hover:text-agri-green-600 transition-colors"
          >
            Vantaggi
          </a>
          <a
            href="#compliance"
            className="text-sm font-medium hover:text-agri-green-600 transition-colors"
          >
            Normative
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

      {/* Hero Section */}
      <section className="min-h-screen pt-32 flex items-center px-6 md:px-20 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-12 py-20">
          <div className="md:w-1/2 space-y-8">
            {/* <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900">
              L'agricoltura{" "}
              <span className="text-agri-green-500">intelligente</span> oggi.
            </h1> */}
            <MorphingText texts={["L'agricoltura", "Semina"]} />
            <MorphingText texts={["intelligente", "oggi"]} />
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
              Il quaderno di campagna digitale personalizzabile che rivoluziona
              la gestione delle operazioni con l'intelligenza artificiale.
            </p>
            <div className="flex gap-4 pt-6">
              <Link
                to="/auth"
                className="py-3 px-8 rounded-full bg-green-700 text-white font-medium hover:bg-green-600 cursor-pointer hover:scale-105 transition-colors"
              >
                Inizia ora
              </Link>
              <a
                href="#advantages"
                className="py-3 px-8 rounded-full border border-gray-300 font-medium hover:bg-gray-50 transition-colors"
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

      {/* Advantages Section */}
      <section
        id="advantages"
        className="pt-20 pb-30 bg-harvest-100 px-6 md:px-20"
      >
        <div className="max-w-7xl mx-auto">
          {/*  className="text-4xl font-bold text-center mb-16 text-gray-900">
           
        */}

          <div
            className={`relative ${
              isMobile ? "h-[180px]" : "h-[340px]"
            } w-full overflow-hidden`}
          >
            <VideoText
              fontSize={isMobile ? 24 : 14}
              fontFamily="Inter, system-ui, sans-serif"
              src="https://videos.pexels.com/video-files/1649831/1649831-uhd_2560_1440_30fps.mp4"
            >
              Vantaggi
            </VideoText>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="h-12 w-12 rounded-full bg-agri-green-100 flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-agri-green-600"
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
              </div>
              <h3 className="text-xl font-semibold mb-3">Risparmio di tempo</h3>
              <p className="text-gray-600">
                <span className="text-agri-green-600 font-bold">80%</span> del
                tempo risparmiato rispetto alla gestione tradizionale.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="h-12 w-12 rounded-full bg-agri-green-100 flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-agri-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Riduzione dei costi
              </h3>
              <p className="text-gray-600">
                <span className="text-agri-green-600 font-bold">30 ore</span> a
                settimana in meno per la gestione amministrativa.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="h-12 w-12 rounded-full bg-agri-green-100 flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-agri-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">
                White label personalizzabile
              </h3>
              <p className="text-gray-600">
                <span className="text-agri-green-600 font-bold">
                  Branding dedicato
                </span>{" "}
                e configurazione per utenti, studi, consorzi e cooperative.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-20 px-6 md:px-20 bg-harvest-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            Cosa dicono i{" "}
            <span className="text-agri-green-500">nostri clienti</span>
          </h2>
          <div className="flex flex-row overflow-x-auto gap-x-4">
            {feedbacks.map((feedback) => (
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm  min-w-[300px]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {feedback.initials}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{feedback.name}</h4>
                    <p className="text-sm text-gray-500">{feedback.role}</p>
                  </div>
                </div>
                <p className="text-gray-700">
                  {feedback.text}
                  <span className="text-blue-500 font-semibold">
                    {feedback.highlight}
                  </span>{" "}
                  {feedback.highlight}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-20 px-6 md:px-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            Conforme alle <span className="text-agri-green-500">normative</span>
          </h2>
          <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-gray-900">
                  Un click per la conformità
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Con Seminai puoi gestire con un solo click i piani dei
                  fertilizzanti e la gestione dei fitofarmaci secondo:
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-agri-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-agri-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-gray-700">
                      Direttive EU sul Green Deal
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-agri-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-agri-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-gray-700">
                      Disciplinari biologici
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-agri-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-agri-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-gray-700">
                      Disciplinari di filiera agricola
                    </span>
                  </li>
                </ul>
              </div>
              <Card className="relative overflow-hidden p-8">
                <div className="h-20 w-20 mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-full w-full text-agri-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-medium mb-4 text-gray-900">
                  Protezione totale
                </h4>
                <p className="text-gray-600">
                  Il sistema verifica automaticamente la conformità delle tue
                  attività con le normative vigenti, proteggendoti da sanzioni e
                  garantendo la tracciabilità completa di tutte le operazioni.
                </p>
                <BorderBeam
                  duration={4}
                  size={300}
                  reverse
                  className="from-transparent via-green-500 to-transparent"
                />
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-request" className="py-20 px-6 md:px-20 bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <p className="uppercase text-green-700/90 font-medium tracking-wider">
            Richiedi informazioni
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Contattaci
          </h2>
          <p className="text-lg text-gray-600">
            Compila il messaggio e ti risponderemo al più presto
          </p>
          <ContactRequestForm />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-6 md:px-20 bg-harvest-100 transition-colors">
        <div className="max-w-5xl mx-auto text-center">
          <p className="uppercase text-green-700/90 font-medium tracking-wider mb-4">
            PRONTO A INIZIARE?
          </p>
          <h2 className="text-5xl font-bold mb-10 text-gray-900">
            Inizia la tua prova gratuita oggi.
          </h2>
          <Link
            to="/auth"
            className="py-4 px-8 bg-green-700 text-white cursor-pointer hover:bg-green-600 transition-colors rounded-xl text-lg font-medium hover:scale-105 inline-flex items-center mx-auto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z"
                clipRule="evenodd"
              />
            </svg>
            Inizia gratuitamente
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="py-12 px-6 md:px-20 bg-gray-900 text-white"
      >
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <img src="/logo.png" alt="Seminai Logo" className="h-8 w-auto" />
              <span className="text-xl font-semibold text-white">Seminai</span>
            </div>
            <p className="text-gray-300">
              Rivoluziona la gestione dei tuoi campi con l'intelligenza
              artificiale.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-4 text-white">Piattaforma</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Funzionalità
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Piani
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Sicurezza
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-4 text-white">Azienda</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Chi siamo
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Contatti
                </a>
              </li>
            </ul>
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
    </div>
  );
}
