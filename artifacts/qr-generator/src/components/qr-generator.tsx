import React, { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Moon, Sun, Copy, QrCode, Layers, Keyboard, ExternalLink, Sparkles, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { renderQRToCanvas, QROptions } from "@/lib/qr-render";
import { ContentType } from "@/lib/qr-formats";

import { ContentTypeTabs } from "./content-type-tabs";
import { QRHistory, QRHistoryItem } from "./qr-history";
import { BulkGeneratorDialog } from "./bulk-generator-dialog";
import { ExportMenu } from "./export-menu";
import { AppSidebar } from "./app-sidebar";

// Note: these components themselves are small. The heavy libraries they use
// (jsPDF, JSZip) are dynamically imported inside each component, only at the
// moment the user actually triggers that feature — see export-menu.tsx and
// bulk-generator-dialog.tsx. That keeps this initial page load light without
// needing React.lazy/Suspense for components that are always mounted anyway.


const DEFAULT_OPTIONS: QROptions = {
  size: 300,
  color: { dark: '#000000', light: '#ffffff' },
  errorCorrectionLevel: 'M',
  margin: 4,
  dotStyle: 'square',
  cornerStyle: 'square',
};

// History thumbnails are rendered at a small fixed size instead of reusing
// the full preview canvas (which can be up to 500px, or larger with a
// logo). At 50 saved items, full-size thumbnails can approach the
// localStorage quota; a small fixed thumbnail keeps each entry tiny.
const HISTORY_THUMBNAIL_SIZE = 96;

const PRESETS = [
  { name: "Ink", fg: "#0A0A0A", bg: "#FFFFFF", gradient: false },
  { name: "Terracotta", fg: "#9C2A10", bg: "#FFF5F0", gradient: false },
  { name: "Forest", fg: "#1A4A38", bg: "#F0FDF4", gradient: false },
  { name: "Amber", fg: "#92400E", bg: "#FEF3C7", gradient: false },
  { name: "Sunset", fg: "#EA580C", bg: "#FFFFFF", gradient: true, color2: "#E11D48", gradType: "linear-diagonal" as const },
  { name: "Ocean", fg: "#0284C7", bg: "#FFFFFF", gradient: true, color2: "#059669", gradType: "linear-horizontal" as const },
];

export function QRGenerator() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [text, setText] = useState("");
  const [contentType, setContentType] = useState<ContentType>("text");
  const [options, setOptions] = useState<QROptions>(DEFAULT_OPTIONS);
  const [autoGenerate, setAutoGenerate] = useLocalStorage("qr-autogen", true);
  const [history, setHistory] = useLocalStorage<QRHistoryItem[]>("qr-history-v2", [], () => {
    toast({
      title: "History not saved",
      description: "Local storage is full. Older or larger history items may not be persisted.",
      variant: "destructive",
    });
  });
  
  const [bulkOpen, setBulkOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const generateQR = useCallback(async (currentText: string, currentOptions: QROptions, saveToHistory: boolean = false) => {
    if (!currentText.trim() || !canvasRef.current) {
      if (saveToHistory) {
        toast({ title: "Input Required", description: "Please enter some content.", variant: "destructive" });
      }
      return;
    }

    setIsGenerating(true);
    try {
      await renderQRToCanvas(canvasRef.current, currentText, currentOptions);
      setIsGenerated(true);

      if (saveToHistory) {
        const thumbCanvas = document.createElement("canvas");
        await renderQRToCanvas(thumbCanvas, currentText, { ...currentOptions, size: HISTORY_THUMBNAIL_SIZE });
        const thumbnail = thumbCanvas.toDataURL("image/png");
        setHistory((prev) => {
          const lastItem = prev[0];
          if (lastItem && lastItem.text === currentText && JSON.stringify(lastItem.options) === JSON.stringify(currentOptions)) {
            return prev;
          }
          const newItem: QRHistoryItem = {
            id: crypto.randomUUID(),
            text: currentText,
            contentType,
            timestamp: Date.now(),
            options: { ...currentOptions },
            thumbnail,
            favorite: false
          };
          return [newItem, ...prev].slice(0, 50);
        });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Generation Failed", description: "Failed to generate QR code.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [contentType, setHistory, toast]);

  useEffect(() => {
    if (!autoGenerate) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!text.trim()) {
      setIsGenerated(false);
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      generateQR(text, options, false);
    }, 300);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [text, options, autoGenerate, generateQR]);

  const handleGenerateClick = () => generateQR(text, options, true);

  const handleClear = () => {
    setText("");
    setOptions(DEFAULT_OPTIONS);
    setIsGenerated(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleCopy = async () => {
    if (!canvasRef.current || !isGenerated) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) throw new Error("Could not get canvas blob");
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast({ title: "Copied!", description: "QR code copied to clipboard." });
      }, "image/png");
    } catch (err) {
      toast({ title: "Copy Failed", description: "Could not copy image to clipboard.", variant: "destructive" });
    }
  };

  // Memoized so its identity stays stable across re-renders. Previously this
  // was a plain function, which changed identity on every render and forced
  // ContentTypeTabs' effect (which depends on onContentChange) to re-fire on
  // every unrelated parent re-render (e.g. toggling dark mode).
  const handleContentChange = useCallback((newText: string, type: ContentType) => {
    setText(newText);
    setContentType(type);
  }, []);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setOptions(o => ({
      ...o,
      color: { dark: preset.fg, light: preset.bg },
      gradient: preset.gradient ? {
        enabled: true,
        color1: preset.fg,
        color2: preset.color2!,
        type: preset.gradType!
      } : { enabled: false, color1: preset.fg, color2: preset.fg, type: 'linear-diagonal' }
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setOptions(o => {
        const { logo, ...rest } = o;
        return rest;
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setOptions(o => ({ ...o, logo: { src: event.target?.result as string, size: 0.2 } }));
    };
    reader.readAsDataURL(file);
  };

  const loadHistoryItem = (item: QRHistoryItem) => {
    setText(item.text);
    setContentType(item.contentType);
    setOptions(item.options);
    generateQR(item.text, item.options, false);
  };
  const deleteHistoryItem = (id: string) => setHistory(prev => prev.filter(i => i.id !== id));
  const toggleFavorite = (id: string) => setHistory(prev => prev.map(i => i.id === id ? { ...i, favorite: !i.favorite } : i));
  const clearAllHistory = () => setHistory([]);
  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-history-${Date.now()}.json`;
    a.click();
  };
  const importHistory = (items: QRHistoryItem[]) => {
    setHistory(prev => {
      const combined = [...items, ...prev];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      return unique;
    });
    toast({ title: "Imported", description: `Imported ${items.length} history items.` });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleGenerateClick();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        if (canvasRef.current && isGenerated) {
          const url = canvasRef.current.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = url;
          a.download = `qr-code-${Date.now()}.png`;
          a.click();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')?.focus();
      } else if (e.key === "?" && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        setShortcutsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [text, options, isGenerated]);

  const isUrlText = (contentType === 'url' || contentType === 'text') && (text.startsWith("http://") || text.startsWith("https://"));

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-200 pb-20">
      
      {/* SIDEBAR */}
      <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-xl"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm" aria-hidden="true">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              QR Generator
            </h1>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              Generate, customize, share
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBulkOpen(true)}
            aria-label="Open bulk QR generator"
            className="h-9 rounded-xl font-medium border border-black/15 dark:border-white/15 hover:border-black/25 dark:hover:border-white/25 hover:bg-accent/60 transition-colors"
          >
            <Layers className="w-4 h-4 mr-2" aria-hidden="true" /> Bulk
          </Button>
          <div className="w-px h-4 bg-border mx-1 hidden sm:block" aria-hidden="true"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShortcutsOpen(true)}
            aria-label="Show keyboard shortcuts"
            className="w-9 h-9 rounded-xl border border-black/15 dark:border-white/15 hover:border-black/25 dark:hover:border-white/25 hover:bg-accent/60 transition-colors"
          >
            <Keyboard className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={theme === "dark"}
            className="w-9 h-9 rounded-xl border border-black/15 dark:border-white/15 hover:border-black/25 dark:hover:border-white/25 hover:bg-accent/60 transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={theme}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.15 }}
                aria-hidden="true"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </motion.div>
            </AnimatePresence>
          </Button>
        </div>
      </header>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Input, Style, Settings */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* CONTENT INPUT */}
          <Card className="shadow-sm rounded-3xl border-border/40 bg-card overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <ContentTypeTabs onContentChange={handleContentChange} />
              
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs font-medium text-muted-foreground">
                  {text.length} chars
                  {text.length > 1000 && <span className={`ml-2 ${text.length > 2000 ? 'text-destructive font-bold' : 'text-amber-600'}`}>Warning: Dense QR</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="autoGenerate" className="text-xs font-medium text-muted-foreground cursor-pointer">Auto-update</Label>
                  <Switch id="autoGenerate" checked={autoGenerate} onCheckedChange={setAutoGenerate} className="scale-75 origin-right" />
                </div>
              </div>

              {/* Quick design controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Dot Style</Label>
                  <ToggleGroup
                    type="single"
                    value={options.dotStyle ?? 'square'}
                    onValueChange={(val) => val && setOptions((o) => ({ ...o, dotStyle: val as 'square' | 'rounded' }))}
                    className="w-full bg-muted/50 rounded-xl p-1 grid grid-cols-2 gap-1"
                  >
                    <ToggleGroupItem value="square" className="h-8 text-xs rounded-lg data-[state=on]:bg-background data-[state=on]:shadow-sm">Square</ToggleGroupItem>
                    <ToggleGroupItem value="rounded" className="h-8 text-xs rounded-lg data-[state=on]:bg-background data-[state=on]:shadow-sm">Dots</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Corner Style</Label>
                  <ToggleGroup
                    type="single"
                    value={options.cornerStyle ?? 'square'}
                    onValueChange={(val) => val && setOptions((o) => ({ ...o, cornerStyle: val as 'square' | 'rounded' }))}
                    className="w-full bg-muted/50 rounded-xl p-1 grid grid-cols-2 gap-1"
                  >
                    <ToggleGroupItem value="square" className="h-8 text-xs rounded-lg data-[state=on]:bg-background data-[state=on]:shadow-sm">Square</ToggleGroupItem>
                    <ToggleGroupItem value="rounded" className="h-8 text-xs rounded-lg data-[state=on]:bg-background data-[state=on]:shadow-sm">Rounded</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="quick-qr-color" className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">QR Color</Label>
                  <div className="flex items-center gap-2 h-10 bg-muted/50 rounded-xl px-2">
                    <div className="relative w-7 h-7 rounded-lg overflow-hidden border shadow-sm flex-none">
                      <Input
                        id="quick-qr-color"
                        type="color"
                        value={options.color.dark}
                        onChange={(e) => setOptions((o) => ({ ...o, color: { ...o.color, dark: e.target.value } }))}
                        aria-label="QR foreground color"
                        className="absolute -inset-2 w-12 h-12 p-0 border-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-xs font-mono uppercase text-foreground/80 truncate">{options.color.dark}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button variant="secondary" className="h-12 px-6 rounded-2xl flex-none" onClick={handleClear} disabled={!text}>
                  Clear
                </Button>
                <Button 
                  className="h-12 flex-1 rounded-2xl text-base shadow-sm font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0" 
                  onClick={handleGenerateClick} 
                  disabled={!text.trim() || isGenerating}
                >
                  {isGenerating ? "Generating..." : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" /> Generate QR
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* STYLE & SETTINGS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-8 gap-6">
            
            {/* STYLE */}
            <Card className="md:col-span-5 shadow-sm rounded-3xl border-border/40 p-6 sm:p-8">
              <h2 className="text-sm font-bold tracking-tight mb-5">Aesthetic</h2>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Presets</Label>
                  <div className="flex gap-3 flex-wrap">
                    {PRESETS.map((p, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <motion.button 
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => applyPreset(p)}
                            aria-label={`Apply ${p.name} color preset`}
                            className="w-8 h-8 rounded-full shadow-sm cursor-pointer border-2 border-transparent hover:border-foreground/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            style={{ 
                              background: p.gradient ? `linear-gradient(to bottom right, ${p.fg}, ${p.color2})` : p.fg,
                              boxShadow: `0 2px 8px -2px ${p.fg}40`
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{p.name}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fg-color-hex" className="text-xs font-medium">Foreground</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden border shadow-sm flex-none">
                        <Input id="fg-color-picker" type="color" value={options.color.dark} onChange={(e) => setOptions(o => ({ ...o, color: { ...o.color, dark: e.target.value } }))} aria-label="Foreground color picker" className="absolute -inset-2 w-12 h-12 p-0 border-0 cursor-pointer" />
                      </div>
                      <Input id="fg-color-hex" value={options.color.dark.toUpperCase()} onChange={(e) => setOptions(o => ({ ...o, color: { ...o.color, dark: e.target.value } }))} aria-label="Foreground color hex value" className="h-8 text-xs font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bg-color-hex" className="text-xs font-medium">Background</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden border shadow-sm flex-none">
                        <Input id="bg-color-picker" type="color" value={options.color.light} onChange={(e) => setOptions(o => ({ ...o, color: { ...o.color, light: e.target.value } }))} aria-label="Background color picker" className="absolute -inset-2 w-12 h-12 p-0 border-0 cursor-pointer" />
                      </div>
                      <Input id="bg-color-hex" value={options.color.light.toUpperCase()} onChange={(e) => setOptions(o => ({ ...o, color: { ...o.color, light: e.target.value } }))} aria-label="Background color hex value" className="h-8 text-xs font-mono" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium cursor-pointer" htmlFor="enable-gradient">Enable Gradient</Label>
                    <Switch id="enable-gradient" checked={options.gradient?.enabled || false} onCheckedChange={(val) => setOptions(o => ({ ...o, gradient: { ...o.gradient, enabled: val, color1: o.color.dark, color2: '#EA580C', type: 'linear-diagonal' } }))} className="scale-75 origin-right" />
                  </div>
                  
                  <AnimatePresence>
                    {options.gradient?.enabled && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Color 2</Label>
                            <div className="flex items-center gap-2">
                              <div className="relative w-8 h-8 rounded-lg overflow-hidden border shadow-sm flex-none">
                                <Input id="gradient-color-2" type="color" aria-label="Gradient secondary color" value={options.gradient.color2} onChange={(e) => setOptions(o => ({ ...o, gradient: { ...o.gradient!, color2: e.target.value } }))} className="absolute -inset-2 w-12 h-12 p-0 border-0 cursor-pointer" />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Type</Label>
                            <Select value={options.gradient.type} onValueChange={(val: any) => setOptions(o => ({ ...o, gradient: { ...o.gradient!, type: val } }))}>
                              <SelectTrigger aria-label="Gradient type" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="linear-horizontal">Horizontal</SelectItem>
                                <SelectItem value="linear-vertical">Vertical</SelectItem>
                                <SelectItem value="linear-diagonal">Diagonal</SelectItem>
                                <SelectItem value="radial">Radial</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </Card>

            {/* SETTINGS */}
            <Card className="md:col-span-3 shadow-sm rounded-3xl border-border/40 p-6 sm:p-8">
              <h2 className="text-sm font-bold tracking-tight mb-5">Settings</h2>
              <div className="space-y-6">
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Size</Label>
                  <ToggleGroup type="single" value={options.size.toString()} onValueChange={(val) => val && setOptions((o) => ({ ...o, size: parseInt(val) }))} className="justify-start">
                    <ToggleGroupItem value="200" className="h-8 px-3 text-xs rounded-lg">S</ToggleGroupItem>
                    <ToggleGroupItem value="300" className="h-8 px-3 text-xs rounded-lg">M</ToggleGroupItem>
                    <ToggleGroupItem value="500" className="h-8 px-3 text-xs rounded-lg">L</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Error Correction</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "L", label: "Low", hint: "Simple" },
                      { value: "M", label: "Medium", hint: "Standard" },
                      { value: "Q", label: "High", hint: "Better" },
                      { value: "H", label: "Ultra", hint: "Best for Logo" },
                    ].map((opt) => {
                      const hasLogo = !!options.logo?.src;
                      // With a logo present, rendering always forces level H
                      // (see renderQRToCanvas) so a logo is scannable through
                      // the occlusion. Reflect that here instead of letting
                      // the buttons show a selection that has no real effect.
                      const active = hasLogo ? opt.value === "H" : options.errorCorrectionLevel === opt.value;
                      const locked = hasLogo && opt.value !== "H";
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={locked}
                          aria-disabled={locked}
                          onClick={() => !hasLogo && setOptions((o) => ({ ...o, errorCorrectionLevel: opt.value as QROptions["errorCorrectionLevel"] }))}
                          className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border text-left transition-all ${
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : locked
                              ? "bg-muted/30 text-muted-foreground/50 border-transparent cursor-not-allowed"
                              : "bg-muted/50 text-foreground border-transparent hover:bg-muted"
                          }`}
                        >
                          <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                          <span className={`text-[10px] leading-tight ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {opt.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {!!options.logo?.src && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Locked to Ultra while a center logo is set — needed to keep the code scannable.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Margin</Label>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{options.margin}</span>
                  </div>
                  <Slider 
                    value={[options.margin]} 
                    min={0} max={10} step={1}
                    onValueChange={(val) => setOptions(o => ({ ...o, margin: val[0] }))}
                    aria-label="QR code margin"
                    className="py-1"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="center-logo-upload" className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Center Logo</Label>
                  <div className="flex items-center gap-2">
                    <Input id="center-logo-upload" type="file" accept="image/*" aria-label="Upload center logo image" onChange={handleLogoUpload} className="text-xs file:h-full file:bg-transparent file:text-xs file:font-medium file:text-foreground h-8 p-0" />
                    {options.logo?.src && (
                      <Button variant="ghost" size="icon" aria-label="Remove center logo" className="h-8 w-8 rounded-lg flex-none text-destructive hover:bg-destructive/10" onClick={() => setOptions(o => { const { logo, ...rest } = o; return rest; })}>
                        <span aria-hidden="true">&times;</span>
                      </Button>
                    )}
                  </div>
                </div>

              </div>
            </Card>

          </div>
        </div>

        {/* RIGHT COLUMN: Preview & History */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* PREVIEW */}
          <Card className="shadow-sm rounded-3xl border-border/40 flex-none bg-card overflow-hidden">
            <div className="p-6 bg-muted/20 border-b border-border/40 flex justify-between items-center">
              <h2 className="text-sm font-bold tracking-tight">Preview</h2>
              <Badge contentLength={text.length} type={contentType} />
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center min-h-[320px] relative bg-gradient-to-b from-transparent to-muted/10">
              <div
                className="relative p-5 rounded-2xl shadow-xl transition-all duration-300"
                style={{ 
                  backgroundColor: options.color.light,
                  opacity: isGenerated && text ? 1 : 0,
                  transform: isGenerated && text ? "scale(1)" : "scale(0.85)",
                  pointerEvents: isGenerated && text ? "auto" : "none",
                }}
              >
                <canvas 
                  ref={canvasRef} 
                  className="block mx-auto rounded-lg shadow-sm"
                  style={{ width: "260px", height: "260px" }}
                />
              </div>

              {!(isGenerated && text) && (
                <div className="flex flex-col items-center justify-center text-center p-6 absolute inset-0 pointer-events-none">
                  <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-4 shadow-inner">
                    <QrCode className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Ready to generate</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-muted/20 border-t border-border/40 flex items-center justify-center gap-3">
              <ExportMenu canvas={canvasRef.current} text={text} options={options} disabled={!isGenerated || !text} />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Copy QR code image to clipboard" onClick={handleCopy} disabled={!isGenerated || !text} className="rounded-xl h-10 w-10 shadow-sm bg-card hover:bg-muted">
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy Image</TooltipContent>
              </Tooltip>

              {isUrlText && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Open URL in new tab" onClick={() => window.open(text, "_blank")} disabled={!isGenerated || !text} className="rounded-xl h-10 w-10 shadow-sm bg-card hover:bg-muted">
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open URL</TooltipContent>
                </Tooltip>
              )}
            </div>
          </Card>

          {/* HISTORY */}
          <Card className="shadow-sm rounded-3xl border-border/40 flex-1 min-h-[300px] flex flex-col bg-card">
            <div className="p-6 pb-2">
              <h2 className="text-sm font-bold tracking-tight">History</h2>
            </div>
            <div className="px-4 pb-4 flex-1">
              <QRHistory 
                history={history}
                onLoad={loadHistoryItem}
                onDelete={deleteHistoryItem}
                onToggleFavorite={toggleFavorite}
                onClearAll={clearAllHistory}
                onExport={exportHistory}
                onImport={importHistory}
              />
            </div>
          </Card>

        </div>

      </div>

      <BulkGeneratorDialog open={bulkOpen} onOpenChange={setBulkOpen} options={options} />

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center py-2 border-b"><span className="text-sm font-medium">Generate QR</span><kbd className="px-2.5 py-1 bg-muted rounded-md text-xs font-mono shadow-sm">Cmd + Enter</kbd></div>
            <div className="flex justify-between items-center py-2 border-b"><span className="text-sm font-medium">Download PNG</span><kbd className="px-2.5 py-1 bg-muted rounded-md text-xs font-mono shadow-sm">Cmd + D</kbd></div>
            <div className="flex justify-between items-center py-2 border-b"><span className="text-sm font-medium">Focus Input</span><kbd className="px-2.5 py-1 bg-muted rounded-md text-xs font-mono shadow-sm">Cmd + K</kbd></div>
            <div className="flex justify-between items-center py-2"><span className="text-sm font-medium">Show Shortcuts</span><kbd className="px-2.5 py-1 bg-muted rounded-md text-xs font-mono shadow-sm">?</kbd></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Badge({ contentLength, type }: { contentLength: number, type: string }) {
  if (!contentLength) return <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">Draft</span>;
  return (
    <span className="text-[10px] font-semibold tracking-wider uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
      {type}
    </span>
  );
}
