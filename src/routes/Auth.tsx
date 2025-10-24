import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin, useRegister, useMe } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const { data: meData } = useMe();

  useEffect(() => {
    if (meData) {
      navigate("/dashboard", { replace: true });
    }
  }, [meData, navigate]);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await loginMutation.mutateAsync({
        email: loginEmail,
        password: loginPassword,
      });
      toast.success(`Benvenuto ${result.data.user.name}`);
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("❌ Login failed:", error);
      const message =
        error instanceof Error ? error.message : "Login non riuscito";
      toast.error(message);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await registerMutation.mutateAsync({
        email,
        password,
        name,
        surname,
        fiscalCode,
        phoneNumber,
        address,
      });
      toast.success(result.data.message || "Registrazione completata");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Registrazione non riuscita";
      toast.error(message);
    }
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Side - Background with branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-agri-green-50 via-nature-100 to-agri-green-100 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SeminAI Logo" className="h-10 w-auto" />
          <span className="text-xl font-semibold text-agri-green-800">
            SeminAI
          </span>
        </div>

        <div className="max-w-md">
          <p className="text-base text-agri-green-700 leading-relaxed">
            "Questa piattaforma ha rivoluzionato il modo in cui gestisco la mia
            azienda agricola, aiutandomi a prendere decisioni più informate e a
            ottimizzare i miei raccolti."
          </p>
          <p className="mt-4 text-sm text-agri-green-600">
            - Marco Rossi, Agricoltore
          </p>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo mobile - visibile solo su schermi piccoli */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <img src="/logo.png" alt="SeminAI Logo" className="h-8 w-auto" />
            <span className="text-lg font-semibold text-agri-green-800">
              SeminAI
            </span>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Registrati</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-6">
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Accedi al tuo account
                </h1>
                <p className="text-sm text-slate-500">
                  Inserisci la tua email per accedere
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="nome@esempio.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-11 bg-agri-green-600 hover:bg-agri-green-700"
                >
                  {loginMutation.isPending
                    ? "Accesso in corso..."
                    : "Accedi con Email"}
                </Button>
              </form>

              <p className="text-xs text-center text-slate-500 px-8">
                Cliccando continua, accetti i nostri{" "}
                <a
                  href="/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-agri-green-700 cursor-pointer"
                >
                  Termini di Servizio
                </a>{" "}
                e la{" "}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-agri-green-700 cursor-pointer"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </TabsContent>

            <TabsContent value="register" className="space-y-6">
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Crea un account
                </h1>
                <p className="text-sm text-slate-500">
                  Inserisci i tuoi dati per registrarti
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Input
                      placeholder="Nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Cognome"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="nome@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Codice Fiscale"
                    value={fiscalCode}
                    onChange={(e) => setFiscalCode(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Telefono"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Indirizzo"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full h-11 bg-agri-green-600 hover:bg-agri-green-700"
                >
                  {registerMutation.isPending
                    ? "Registrazione..."
                    : "Registrati con Email"}
                </Button>
              </form>

              <p className="text-xs text-center text-slate-500 px-8">
                Cliccando continua, accetti i nostri{" "}
                <a
                  href="/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-agri-green-700 cursor-pointer"
                >
                  Termini di Servizio
                </a>{" "}
                e la{" "}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-agri-green-700 cursor-pointer"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
