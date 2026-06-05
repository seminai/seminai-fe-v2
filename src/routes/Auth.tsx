import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { createSeminaiQueryClient } from "@/lib/queryClient";
import AuthLayout from "./Auth/AuthLayout";
import "@/index.css";
import "@/components/ui/custom-theme.css";

const queryClient = createSeminaiQueryClient();

export default function Auth() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <AuthLayout />
        <Toaster />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
