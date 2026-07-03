import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QRGenerator } from "@/components/qr-generator";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="qr-theme">
        <TooltipProvider>
          <div className="min-h-dvh flex flex-col bg-background text-foreground transition-colors duration-300 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
            <main className="flex-1 py-4 px-4 sm:px-6 md:py-8">
              <QRGenerator />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;