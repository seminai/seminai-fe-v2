import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe2, Handshake, Users } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ContactRequestForm } from "@/components/organism/ContactRequestForm";
import { OptimizedImage } from "@/components/ui/optimized-image";
import {
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  type SupportedLanguage,
} from "@/i18n";

interface HighlightCard {
  title: string;
  description: string;
}

interface AdvantageSection {
  title: string;
  features: string[];
}

interface DetailedFeature {
  title: string;
  body: string;
  imageAlt: string;
}

type AudienceIcon = ComponentType<{ className?: string }>;

const audienceIcons: AudienceIcon[] = [Globe2, Users, Handshake];

const detailedFeatureImages = [
  {
    src: "/image/conforme_alle_normative.png",
    backgroundClassName: "bg-agri-green-50",
    imageFirstOnDesktop: true,
  },
  {
    src: "/image/riduzione_costi_tempo.png",
    backgroundClassName: "bg-blue-50",
    imageFirstOnDesktop: false,
  },
  {
    src: "/image/white_label.png",
    backgroundClassName: "bg-purple-50",
    imageFirstOnDesktop: true,
  },
  {
    src: "/image/integrabile.png",
    backgroundClassName: "bg-orange-50",
    imageFirstOnDesktop: false,
  },
  {
    src: "/image/chat_farmer_robot.png",
    backgroundClassName: "bg-emerald-50",
    imageFirstOnDesktop: true,
  },
] as const;

function scrollToContactAndSelectTab(): void {
  const contactSection = document.getElementById("contact-request");
  if (contactSection) {
    contactSection.scrollIntoView({ behavior: "smooth" });
  }
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const currentLanguage = normalizeLanguage(i18n.language);
  const audienceHighlights = t("home.audience.cards", {
    returnObjects: true,
  }) as HighlightCard[];
  const advantagesList = t("home.advantages.sections", {
    returnObjects: true,
  }) as AdvantageSection[];
  const detailedFeatures = t("home.features", {
    returnObjects: true,
  }) as DetailedFeature[];

  const changeLanguage = (language: SupportedLanguage) => {
    void i18n.changeLanguage(language);
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100 px-4 py-2 md:px-0 md:py-0">
        <div className="max-w-7xl mx-auto py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt={`${t("common.brand")} Logo`}
              className="h-10 w-auto"
            />
            <span className="text-xl font-semibold text-black">
              {t("common.brand")}
            </span>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div
              className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-500"
              role="group"
              aria-label={t("language.publicSwitcherAria")}
            >
              {LANGUAGE_OPTIONS.map((option, index) => (
                <span key={option.value} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => changeLanguage(option.value)}
                    aria-pressed={currentLanguage === option.value}
                    className={`rounded-full px-2 py-1 transition-colors ${
                      currentLanguage === option.value
                        ? "bg-agri-green-600 text-white"
                        : "text-gray-600 hover:text-black"
                    }`}
                  >
                    {option.shortLabel}
                  </button>
                  {index < LANGUAGE_OPTIONS.length - 1 && (
                    <span aria-hidden="true">|</span>
                  )}
                </span>
              ))}
            </div>
            <Link
              to="/auth"
              className="px-5 py-2.5 rounded-full bg-agri-green-600 text-white text-sm font-medium hover:bg-agri-green-700 transition-colors"
            >
              {t("common.access")}
            </Link>
          </div>
        </div>
      </header>

      <section
        className="min-h-screen pt-32 flex items-center justify-center px-6 md:px-20"
        id="hero"
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-12 py-20">
          <div className="md:w-1/2 space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900">
              {t("home.hero.title")}
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-600 leading-relaxed">
              {t("home.hero.subtitle")}
            </h2>
            <div className="pt-6">
              <button
                type="button"
                onClick={scrollToContactAndSelectTab}
                className="py-3 px-8 rounded-full bg-agri-green-600 text-white font-medium hover:bg-agri-green-700 transition-colors shadow-lg hover:shadow-xl"
              >
                {t("common.bookFree")}
              </button>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center md:justify-end">
            <OptimizedImage
              src="/robot_farmer.png"
              alt={t("home.hero.imageAlt")}
              priority={true}
              containerClassName="w-full max-w-lg rounded-2xl shadow-xl"
              className="w-full h-auto object-cover rounded-2xl"
            />
          </div>
        </div>
      </section>

      <section id="audience" className="py-20 px-6 md:px-20 bg-agri-green-600">
        <div className="max-w-7xl mx-auto text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white">
              {t("home.audience.title")}
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {audienceHighlights.map((highlight, index) => {
              const Icon = audienceIcons[index] ?? Globe2;
              return (
                <div
                  key={highlight.title}
                  className="bg-agri-green-500 p-8 rounded-2xl text-left h-full flex flex-col items-start hover:bg-agri-green-400 transition-colors"
                >
                  <div className="bg-white rounded-full p-2 w-8 h-8 flex items-center justify-center mb-6">
                    <Icon className="h-5 w-5 text-black" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">
                    {highlight.title}
                  </h3>
                  <p className="text-white/90 text-sm leading-relaxed mb-6 flex-grow">
                    {highlight.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-32 px-6 md:px-20 bg-white">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="md:w-1/2 space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              {t("home.simplified.title")}
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              {t("home.simplified.body")}
            </p>
          </div>
          <div className="md:w-1/2 flex justify-center md:justify-end">
            <OptimizedImage
              src="image/no_calcoli.png"
              alt={t("home.simplified.imageAlt")}
              containerClassName="w-full max-w-xs"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      <section
        id="advantages"
        className="py-32 px-6 md:px-20 bg-agri-green-600"
      >
        <div className="max-w-7xl mx-auto bg-agri-green-500 rounded-3xl p-12 md:p-20 text-white">
          <h2 className="text-4xl font-bold mb-12">
            {t("home.advantages.title")}
          </h2>

          <div className="hidden md:grid md:grid-cols-2 gap-x-12 gap-y-16">
            {advantagesList.map((section) => (
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

          <div className="md:hidden">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {advantagesList.map((section, index) => (
                <AccordionItem
                  value={`item-${index}`}
                  key={section.title}
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

          <div className="text-center mt-12">
            <button
              type="button"
              onClick={scrollToContactAndSelectTab}
              className="py-4 px-10 rounded-full bg-white text-black font-semibold hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl"
            >
              {t("common.freeMeeting")}
            </button>
          </div>
        </div>
      </section>

      <section className="py-32 px-6 md:px-20 bg-white">
        <div className="max-w-7xl mx-auto space-y-32">
          {detailedFeatures.map((feature, index) =>
            renderDetailedFeature({
              feature,
              image: detailedFeatureImages[index],
              bookFreeLabel: t("common.bookFree"),
              onCtaClick: scrollToContactAndSelectTab,
            }),
          )}
        </div>
      </section>

      <section id="contact-request" className="py-20 px-6 md:px-20 bg-white">
        <div className="max-w-3xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              {t("home.contact.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t("home.contact.body")}
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-agri-green-100 text-left shadow-lg shadow-agri-green-50">
            <ContactRequestForm className="shadow-none border-none bg-transparent p-0" />
          </div>
        </div>
      </section>

      <footer
        id="contact"
        className="py-12 px-6 md:px-20 bg-harvest-100 text-black border-t border-harvest-200"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="md:w-1/3">
            <div className="flex items-center gap-2 mb-6">
              <img
                src="/logo.png"
                alt={`${t("common.brand")} Logo`}
                className="h-8 w-auto"
              />
              <span className="text-xl font-semibold text-black">
                {t("common.brand")}
              </span>
            </div>
            <p className="text-black/80 leading-relaxed">
              {t("home.footer.description")}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 text-black">
              {t("home.footer.contactTitle")}
            </h3>
            <p className="text-black/80 mb-4">
              {t("home.footer.contactBody")}
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
          &copy; {new Date().getFullYear()} {t("common.brand")}.{" "}
          {t("home.footer.rights")}
        </div>
      </footer>
    </div>
  );
}

function renderDetailedFeature({
  feature,
  image,
  bookFreeLabel,
  onCtaClick,
}: {
  feature: DetailedFeature;
  image: (typeof detailedFeatureImages)[number];
  bookFreeLabel: string;
  onCtaClick: () => void;
}) {
  const imageBlock = (
    <div
      className={`w-full md:w-1/2 ${
        image.imageFirstOnDesktop ? "order-2 md:order-1" : ""
      } flex justify-center`}
    >
      <div
        className={`relative w-full max-w-md aspect-square ${image.backgroundClassName} rounded-3xl flex items-center justify-center p-12`}
      >
        <OptimizedImage
          src={image.src}
          alt={feature.imageAlt}
          containerClassName="w-full h-full"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );

  const textBlock = (
    <div
      className={`w-full md:w-1/2 ${
        image.imageFirstOnDesktop ? "order-1 md:order-2" : ""
      } space-y-6`}
    >
      <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
        {feature.title}
      </h3>
      <p className="text-lg text-gray-600 leading-relaxed">{feature.body}</p>
      <button
        type="button"
        onClick={onCtaClick}
        className="text-black font-semibold hover:text-black transition-colors underline decoration-2 underline-offset-4"
      >
        {bookFreeLabel}
      </button>
    </div>
  );

  return (
    <div
      key={feature.title}
      className="flex flex-col md:flex-row items-center gap-12 md:gap-24"
    >
      {image.imageFirstOnDesktop ? (
        <>
          {imageBlock}
          {textBlock}
        </>
      ) : (
        <>
          {textBlock}
          {imageBlock}
        </>
      )}
    </div>
  );
}
