import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowLeft,
  ChevronRight,
  Info,
  Github,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Palette,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/agm80/JUSTPUREQR";

interface AppSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SidebarView = "menu" | "about";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Privacy First",
    description:
      "No Ads, No Tracking, dan No Database. Data Anda tidak pernah dikirim atau disimpan di server mana pun.",
  },
  {
    icon: Cpu,
    title: "Client-Side Processing",
    description:
      "Semua proses pembuatan QR Code dilakukan langsung di browser Anda, sehingga data Anda tetap aman.",
  },
  {
    icon: Palette,
    title: "Kustomisasi Penuh",
    description:
      "Anda bisa bebas mengubah bentuk titik (dots), sudut (corners), dan warna sesuai keinginan.",
  },
  {
    icon: Sparkles,
    title: "Gratis & Bersih",
    description:
      "Dibuat murni sebagai alat bantu yang bersih tanpa biaya tersembunyi.",
  },
];

export function AppSidebar({ open, onOpenChange }: AppSidebarProps) {
  const [view, setView] = useState<SidebarView>("menu");

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setView("menu"), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />

          <motion.aside
            key="sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-background border-r border-border/40 shadow-2xl z-50 flex flex-col"
            role="dialog"
            aria-label="Sidebar"
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-border/40 flex-none">
              <AnimatePresence mode="wait" initial={false}>
                {view === "menu" ? (
                  <motion.div
                    key="title-menu"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm font-semibold tracking-tight"
                  >
                    Menu
                  </motion.div>
                ) : (
                  <motion.button
                    key="title-back"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setView("menu")}
                    className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground hover:text-foreground/80 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </motion.button>
                )}
              </AnimatePresence>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-lg"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
              <AnimatePresence mode="wait" initial={false}>
                {view === "menu" ? (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 space-y-1"
                  >
                    <button
                      type="button"
                      onClick={() => setView("about")}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-muted/70 transition-colors group"
                    >
                      <span className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-none">
                        <Info className="w-4 h-4 text-foreground/80" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          Tentang Web Ini
                        </span>
                        <span className="block text-xs text-muted-foreground truncate">
                          Privacy, fitur, dan filosofi
                        </span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-none" />
                    </button>

                    <a
                      href={GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-muted/70 transition-colors group"
                    >
                      <span className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-none">
                        <Github className="w-4 h-4 text-foreground/80" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          GitHub Repository
                        </span>
                        <span className="block text-xs text-muted-foreground truncate">
                          Lihat source code
                        </span>
                      </span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-none" />
                    </a>
                  </motion.div>
                ) : (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}
                    className="p-5 space-y-5"
                  >
                    <div>
                      <h2 className="text-base font-bold tracking-tight">
                        Tentang Web Ini
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        QR Generator yang ringan, privat, dan sepenuhnya berjalan di
                        browser Anda.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {FEATURES.map((f) => {
                        const Icon = f.icon;
                        return (
                          <div
                            key={f.title}
                            className="flex gap-3 p-3 rounded-xl bg-muted/40 border border-border/30"
                          >
                            <span className="w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-none border border-border/40">
                              <Icon className="w-4 h-4 text-foreground/80" />
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground">
                                {f.title}
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                                {f.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="secondary"
                        className="w-full h-10 rounded-xl text-sm font-medium"
                        onClick={() => setView("menu")}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Menu
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="px-5 py-3 border-t border-border/40 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex-none">
              QR Generator
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
