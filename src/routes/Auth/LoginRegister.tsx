import { useEffect, useState, useRef } from "react";
import {
  useNavigate,
  useSearchParams,
  useLocation,
  Link,
} from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  useLogin,
  // useGoogleLogin,
  useRegister,
  useMe,
  useWakeUp,
} from "@/hooks/useAuth";
// import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import type { AuthApiError } from "@/api/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ContactRequestForm } from "@/components/organism/ContactRequestForm";
import { BetaTesterAgreementCheckbox } from "@/components/organism/BetaTesterAgreementCheckbox";
import { emailApiService } from "@/api/email";
import { buildBetaTesterPdfBlob } from "@/utils/buildBetaTesterPdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import createAuthPollingService, {
  type AuthPollingService,
} from "@/utils/auth_polling";

class RegistrationUnlockService {
  private static readonly envCode =
    import.meta.env.VITE_REGISTRATION_CODE ??
    import.meta.env.VITE_REGISTRATION_CODE ??
    "";

  public static isCodeValid(code: string): boolean {
    if (!RegistrationUnlockService.envCode) {
      return false;
    }

    return (
      code.trim().toLowerCase() ===
      RegistrationUnlockService.envCode.trim().toLowerCase()
    );
  }
}

export default function LoginRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  // const googleLoginMutation = useGoogleLogin();

  const { data: meData, refetch: refetchMe, error: meError } = useMe();
  const { isSuccess: isWakeUpSuccess } = useWakeUp();

  // Show success message from reset-password redirect
  useEffect(() => {
    const stateMessage = (location.state as { message?: string } | null)
      ?.message;
    if (stateMessage) {
      toast.success(stateMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (searchParams.get("reason") === "session_expired") {
      toast.info("Sessione scaduta. Effettua nuovamente l'accesso.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const authPollingServiceRef = useRef<AuthPollingService | null>(null);

  useEffect(() => {
    authPollingServiceRef.current = createAuthPollingService();
    authPollingServiceRef.current.setRefetchFunction(refetchMe);
    authPollingServiceRef.current.setOnAuthenticatedCallback(() => {
      navigate("/dashboard", { replace: true });
    });

    return () => {
      if (authPollingServiceRef.current) {
        authPollingServiceRef.current.cleanup();
        authPollingServiceRef.current = null;
      }
    };
  }, [refetchMe, navigate]);

  useEffect(() => {
    if (isWakeUpSuccess && authPollingServiceRef.current) {
      authPollingServiceRef.current.handleWakeUpSuccess();
    }
  }, [isWakeUpSuccess]);

  useEffect(() => {
    if (meData && authPollingServiceRef.current) {
      authPollingServiceRef.current.handleAuthenticationSuccess();
    }
  }, [meData]);

  useEffect(() => {
    if (authPollingServiceRef.current) {
      if (meError) {
        authPollingServiceRef.current.stopPolling();
        return;
      }
      authPollingServiceRef.current.startPolling(!!meData);
    }
  }, [meData, meError]);

  const [activeTab, setActiveTab] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [betaTermsAccepted, setBetaTermsAccepted] = useState(false);
  const [isRegistrationDisabled, setIsRegistrationDisabled] = useState(true);
  const [unlockCode, setUnlockCode] = useState("");

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await loginMutation.mutateAsync({
        email: loginEmail,
        password: loginPassword,
      });
      toast.success(`Benvenuto ${result.data.user.name}`);
      await refetchMe();
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 100);
    } catch (error: unknown) {
      console.error("Login failed:", error);
      const authError = error as AuthApiError;
      if (authError.code === "GOOGLE_ONLY_ACCOUNT") {
        toast.error("Questo account usa Google. Accedi con Google.");
        return;
      }
      const message =
        error instanceof Error ? error.message : "Login non riuscito";
      toast.error(message);
    }
  }

  // async function handleGoogleLogin(response: CredentialResponse) {
  //   if (!response.credential) return;

  //   try {
  //     const result = await googleLoginMutation.mutateAsync({
  //       idToken: response.credential,
  //     });
  //     toast.success(`Benvenuto ${result.data.user.name}`);
  //     await refetchMe();
  //     setTimeout(() => {
  //       navigate("/dashboard", { replace: true });
  //     }, 100);
  //   } catch (error: unknown) {
  //     console.error("Google login failed:", error);
  //     const message =
  //       error instanceof Error
  //         ? error.message
  //         : "Accesso con Google non riuscito";
  //     toast.error(message);
  //   }
  // }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!betaTermsAccepted) {
      toast.error("Devi accettare i termini commerciali per i Beta Tester.");
      return;
    }
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

      sendBetaTesterAgreementEmail({
        name: name.trim(),
        surname: surname.trim(),
        email: email.trim(),
        fiscalCode: fiscalCode.trim(),
        address: address.trim(),
      });

      setActiveTab("login");
      setLoginEmail(email);

      setName("");
      setSurname("");
      setEmail("");
      setPassword("");
      setFiscalCode("");
      setPhoneNumber("");
      setAddress("");
      setBetaTermsAccepted(false);

      toast.info(
        "Ora puoi eseguire login. L'email è già inserita, inserisci solo la password.",
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Registrazione non riuscita";
      toast.error(message);
    }
  }

  function handleUnlockRegistration(e: React.FormEvent) {
    e.preventDefault();
    const isValid = RegistrationUnlockService.isCodeValid(unlockCode);

    if (!isValid) {
      toast.error("Codice di sblocco non valido");
      return;
    }

    setIsRegistrationDisabled(false);
    setUnlockCode("");
    toast.success("Registrazione sbloccata con successo");
  }

  async function sendBetaTesterAgreementEmail(data: {
    name: string;
    surname: string;
    email: string;
    fiscalCode: string;
    address: string;
  }) {
    try {
      const now = new Date();
      const timestampFormatted = format(now, "dd/MM/yyyy HH:mm:ss", {
        locale: it,
      });
      const fullName = `${data.name} ${data.surname}`;

      const { blob, fileName } = buildBetaTesterPdfBlob({
        placeholders: {
          currentDate: format(now, "dd/MM/yyyy", { locale: it }),
          partnerName: fullName,
          registeredOfficeAddress:
            data.address || "__________indirizzo completo___________",
          vatNumber: data.fiscalCode || "______________________",
        },
        checkboxAcceptance: {
          timestamp: timestampFormatted,
          email: data.email,
          fullName,
        },
        fileNameHint: `${data.name}_${data.surname}`,
      });

      const pdfFile = new File([blob], fileName, {
        type: "application/pdf",
      });

      const emailBody = `Nuovo accordo Beta Tester accettato in fase di registrazione.

Dati partner:
- Nome e cognome: ${fullName}
- Email: ${data.email}
- Partita IVA / C.F.: ${data.fiscalCode}
- Indirizzo: ${data.address}
- Data e ora accettazione: ${timestampFormatted}

Modalita: accettazione tramite checkbox in fase di registrazione.
Il PDF dell'accordo e' allegato a questa email.`;

      await emailApiService.sendContactEmail({
        name: fullName,
        email: data.email,
        body: emailBody,
        files: [pdfFile],
      });
    } catch (err) {
      console.error("Failed to send beta tester agreement email:", err);
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
          <div className="flex justify-end">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-slate-500 underline underline-offset-4 hover:text-black"
            >
              Password dimenticata?
            </Link>
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
        {/* TODO: login con google */}
        {/* <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500">oppure</span>
          </div>
        </div> */}

        <div className="flex justify-center">
          {/* TODO: login con google */}
          {/* <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => toast.error("Accesso con Google non riuscito")}
            text="signin_with"
            shape="rectangular"
            width={400}
          /> */}
        </div>

        <p className="text-xs text-center text-slate-500 px-8">
          Cliccando continua, accetti i nostri{" "}
          <a
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-black cursor-pointer"
          >
            Termini di Servizio
          </a>{" "}
          e la{" "}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-black cursor-pointer"
          >
            Privacy Policy
          </a>
          .
        </p>
      </TabsContent>

      <TabsContent value="register" className="space-y-6">
        <Alert className="border-agri-green-200 bg-agri-green-50">
          <AlertTitle>Registrazione su invito</AlertTitle>
          <AlertDescription className="space-y-3 text-slate-600">
            <p>
              Per provare SeminAI e creare un nuovo account devi prima fissare
              un incontro con il nostro team dedicato. Organizziamo insieme una
              breve call per guidarti nella fase di onboarding.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-agri-green-400 text-black hover:bg-agri-green-100"
                >
                  Prenota una call con SeminAI
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl max-w-3xl bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Fissa un incontro con il team SeminAI
                  </DialogTitle>
                  <DialogDescription>
                    Compila il form qui sotto per richiedere una demo o un
                    incontro.
                  </DialogDescription>
                </DialogHeader>
                <ContactRequestForm className="shadow-none border-none p-0" />
              </DialogContent>
            </Dialog>
          </AlertDescription>
        </Alert>
        {isRegistrationDisabled ? (
          <section className="pt-4 border-t border-slate-200 space-y-3">
            <p className="text-sm font-semibold text-slate-700 text-center uppercase tracking-wide">
              Sblocca la registrazione
            </p>
            <p className="text-xs text-slate-500 text-center">
              Inserisci il codice condiviso dal team SeminAI per abilitare il
              form.
            </p>
            <form
              onSubmit={handleUnlockRegistration}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Input
                placeholder="Inserisci il codice ricevuto"
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value)}
                required
                className="h-11"
              />
              <Button
                type="submit"
                variant="outline"
                className="h-11 border-agri-green-400 text-black hover:bg-agri-green-100"
              >
                Conferma
              </Button>
            </form>
          </section>
        ) : (
          <div className="pt-4 border-t border-slate-200 text-center text-sm text-black font-medium">
            Registrazione sbloccata! Compila ora il modulo sottostante.
          </div>
        )}

        {!isRegistrationDisabled && (
          <>
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Crea un account
              </h1>
              <p className="text-sm text-slate-500">
                Inserisci i tuoi dati per registrarti
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Cognome <span className="text-red-500">*</span>
                  </label>
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
                <label className="text-sm font-medium text-slate-700">
                  Email <span className="text-red-500">*</span>
                </label>
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
                <label className="text-sm font-medium text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
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
                <label className="text-sm font-medium text-slate-700">
                  Codice Fiscale <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Codice Fiscale"
                  value={fiscalCode}
                  onChange={(e) => setFiscalCode(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Telefono <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Telefono"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Indirizzo <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Indirizzo"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <BetaTesterAgreementCheckbox
                checked={betaTermsAccepted}
                onCheckedChange={setBetaTermsAccepted}
                formData={{
                  name,
                  surname,
                  email,
                  fiscalCode,
                  address,
                }}
              />

              <Button
                type="submit"
                disabled={registerMutation.isPending || !betaTermsAccepted}
                className="w-full h-11 bg-agri-green-600 hover:bg-agri-green-700"
              >
                {registerMutation.isPending
                  ? "Registrazione..."
                  : "Registrati con Email"}
              </Button>
            </form>
          </>
        )}
        {/* TODO: registrazione con google */}
        {/* <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500">oppure</span>
          </div>
        </div> */}

        <div className="flex justify-center">
          {/* TODO: registrazione con google */}
          {/* <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => toast.error("Registrazione con Google non riuscita")}
            text="signup_with"
            shape="rectangular"
            width={400}
          /> */}
        </div>

        <p className="text-xs text-center text-slate-500 px-8">
          Cliccando continua, accetti i nostri{" "}
          <a
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-black cursor-pointer"
          >
            Termini di Servizio
          </a>{" "}
          e la{" "}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-black cursor-pointer"
          >
            Privacy Policy
          </a>
          .
        </p>
      </TabsContent>
    </Tabs>
  );
}
