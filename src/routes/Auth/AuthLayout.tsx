import { Outlet } from "react-router-dom";
import { Seo } from "@/components/molecules/Seo/Seo";
import { APP_LOGO_URL } from "@/config/brand";
import { SEO } from "@/config/seo";

export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full flex">
      <Seo {...SEO.auth} />
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-agri-green-50 via-nature-100 to-agri-green-100 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <img src={APP_LOGO_URL} alt="SeminAI Logo" className="h-10 w-auto" />
          <span className="text-xl font-semibold text-black">SeminAI</span>
        </div>

        <div className="max-w-md">
          <p className="text-base text-black leading-relaxed">
            "Questa piattaforma ha rivoluzionato il modo in cui gestisco la mia
            azienda agricola, aiutandomi a prendere decisioni più informate e a
            ottimizzare i miei raccolti."
          </p>
          <p className="mt-4 text-sm text-black">- Marco Rossi, Agricoltore</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <img src={APP_LOGO_URL} alt="SeminAI Logo" className="h-8 w-auto" />
            <span className="text-lg font-semibold text-black">SeminAI</span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
