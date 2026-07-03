import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { QROptions } from "@/lib/qr-render";

interface BulkGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: QROptions;
}

type ECLevel = "L" | "M" | "Q" | "H";
type FileFormat = "png" | "svg";

const EC_LABEL: Record<ECLevel, string> = {
  L: "Low (~7%)",
  M: "Medium (~15%)",
  Q: "Quartile (~25%)",
  H: "High (~30%)",
};

// Each QR code is generated synchronously on the main thread (canvas/SVG
// rendering), one at a time. With no cap, pasting thousands of lines could
// lock up the tab for a long time. This keeps a single bulk job responsive.
const MAX_BULK_LINES = 500;

export function BulkGeneratorDialog({ open, onOpenChange, options }: BulkGeneratorDialogProps) {
  const [text, setText] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Local bulk-only QR settings (seeded from main options when dialog opens)
  const [ecLevel, setEcLevel] = useState<ECLevel>(options.errorCorrectionLevel);
  const [size, setSize] = useState<number>(options.size);
  const [margin, setMargin] = useState<number>(options.margin);
  const [darkColor, setDarkColor] = useState<string>(options.color.dark);
  const [lightColor, setLightColor] = useState<string>(options.color.light);
  const [fileFormat, setFileFormat] = useState<FileFormat>("png");

  // Re-seed local settings when dialog opens so it reflects the latest main options
  useEffect(() => {
    if (open) {
      setEcLevel(options.errorCorrectionLevel);
      setSize(options.size);
      setMargin(options.margin);
      setDarkColor(options.color.dark);
      setLightColor(options.color.light);
    }
  }, [open]);

  const allLines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const lines = allLines.slice(0, MAX_BULK_LINES);
  const truncatedCount = allLines.length - lines.length;

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    const generatePreviews = async () => {
      const previewLines = lines.slice(0, 12);
      const urls = await Promise.all(
        previewLines.map(line =>
          QRCode.toDataURL(line, {
            margin,
            color: { dark: darkColor, light: lightColor },
            errorCorrectionLevel: ecLevel,
          }).catch(() => "")
        )
      );
      if (isMounted) setPreviews(urls.filter(Boolean));
    };
    generatePreviews();
    return () => { isMounted = false; };
  }, [text, open, ecLevel, margin, darkColor, lightColor]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const resetToMain = () => {
    setEcLevel(options.errorCorrectionLevel);
    setSize(options.size);
    setMargin(options.margin);
    setDarkColor(options.color.dark);
    setLightColor(options.color.light);
  };

  const handleGenerateZip = async () => {
    if (lines.length === 0) return;
    setIsGenerating(true);
    setProgress(0);

    try {
      // JSZip (~97KB) is only needed for this action, so it's loaded on
      // demand rather than bundled into the initial page load.
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        try {
          const safeName = line.substring(0, 20).replace(/[^a-z0-9]/gi, "_");

          if (fileFormat === "svg") {
            const svg = await QRCode.toString(line, {
              type: "svg",
              margin,
              width: size,
              color: { dark: darkColor, light: lightColor },
              errorCorrectionLevel: ecLevel,
            });
            zip.file(`qr-${i + 1}-${safeName}.svg`, svg);
          } else {
            const canvas = document.createElement("canvas");
            await QRCode.toCanvas(canvas, line, {
              width: size,
              margin,
              color: { dark: darkColor, light: lightColor },
              errorCorrectionLevel: ecLevel,
            });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
            if (blob) {
              zip.file(`qr-${i + 1}-${safeName}.png`, blob);
            }
          }
        } catch (err) {
          console.error(`Failed to generate QR for line ${i}: ${line}`);
        }
        setProgress(Math.round(((i + 1) / lines.length) * 100));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bulk-qr-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Generate</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">Paste multiple lines or upload a text file. Each line will generate a separate QR code.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <div className="flex gap-4 items-end bg-muted/30 p-4 rounded-2xl border border-border/40">
            <div className="flex-1 space-y-2">
              <Label htmlFor="bulk-file-upload" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upload TXT/CSV</Label>
              <Input id="bulk-file-upload" type="file" accept=".txt,.csv" aria-label="Upload TXT or CSV file with one entry per line" onChange={handleFileUpload} className="h-10 rounded-xl bg-background shadow-sm" />
            </div>
            <div className="flex-none">
              <span className="text-sm font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">{lines.length} items</span>
            </div>
          </div>

          {truncatedCount > 0 && (
            <p className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-xl">
              Only the first {MAX_BULK_LINES} lines will be generated ({truncatedCount} more will be ignored). Split large lists into smaller batches.
            </p>
          )}

          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="https://example.com&#10;https://example.org"
            aria-label="Bulk QR content, one entry per line"
            className="min-h-[150px] font-mono text-sm whitespace-pre rounded-2xl bg-muted/20 border-border/40 shadow-sm"
          />

          {/* QR SETTINGS */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <div className="rounded-2xl border border-border/40 bg-muted/20 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">QR Settings</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {ecLevel} · {size}px · {fileFormat.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{settingsOpen ? "Hide" : "Show"}</span>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="p-4 pt-2 space-y-5 border-t border-border/40">
                  {/* Error Correction */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Error Correction</Label>
                      <Select value={ecLevel} onValueChange={(v) => setEcLevel(v as ECLevel)}>
                        <SelectTrigger aria-label="Bulk error correction level" className="h-10 rounded-xl bg-background shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L">{EC_LABEL.L}</SelectItem>
                          <SelectItem value="M">{EC_LABEL.M}</SelectItem>
                          <SelectItem value="Q">{EC_LABEL.Q}</SelectItem>
                          <SelectItem value="H">{EC_LABEL.H}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">File Format</Label>
                      <ToggleGroup
                        type="single"
                        value={fileFormat}
                        onValueChange={(v) => v && setFileFormat(v as FileFormat)}
                        className="w-full bg-background rounded-xl p-1 grid grid-cols-2 gap-1 h-10 shadow-sm border border-border/40"
                      >
                        <ToggleGroupItem value="png" className="h-8 text-xs rounded-lg data-[state=on]:bg-foreground data-[state=on]:text-background">PNG</ToggleGroupItem>
                        <ToggleGroupItem value="svg" className="h-8 text-xs rounded-lg data-[state=on]:bg-foreground data-[state=on]:text-background">SVG</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>

                  {/* Size & Margin */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</Label>
                        <span className="text-xs font-mono text-muted-foreground">{size}px</span>
                      </div>
                      <Slider
                        value={[size]}
                        min={100}
                        max={1000}
                        step={50}
                        onValueChange={(v) => setSize(v[0])}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margin</Label>
                        <span className="text-xs font-mono text-muted-foreground">{margin}</span>
                      </div>
                      <Slider
                        value={[margin]}
                        min={0}
                        max={10}
                        step={1}
                        onValueChange={(v) => setMargin(v[0])}
                      />
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-fg-hex" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Foreground</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-border/40 shadow-sm flex-none">
                          <Input
                            id="bulk-fg-picker"
                            type="color"
                            value={darkColor}
                            aria-label="Bulk foreground color picker"
                            onChange={(e) => setDarkColor(e.target.value)}
                            className="absolute -inset-2 w-14 h-14 p-0 border-0 cursor-pointer"
                          />
                        </div>
                        <Input
                          id="bulk-fg-hex"
                          value={darkColor.toUpperCase()}
                          aria-label="Bulk foreground color hex value"
                          onChange={(e) => setDarkColor(e.target.value)}
                          className="h-10 rounded-xl bg-background text-xs font-mono shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bulk-bg-hex" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Background</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-border/40 shadow-sm flex-none">
                          <Input
                            id="bulk-bg-picker"
                            type="color"
                            value={lightColor}
                            aria-label="Bulk background color picker"
                            onChange={(e) => setLightColor(e.target.value)}
                            className="absolute -inset-2 w-14 h-14 p-0 border-0 cursor-pointer"
                          />
                        </div>
                        <Input
                          id="bulk-bg-hex"
                          value={lightColor.toUpperCase()}
                          aria-label="Bulk background color hex value"
                          onChange={(e) => setLightColor(e.target.value)}
                          className="h-10 rounded-xl bg-background text-xs font-mono shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetToMain}
                      className="rounded-lg text-xs h-8 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-accent/60"
                    >
                      Reset to main settings
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {previews.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview (first {previews.length})</Label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {previews.map((url, i) => (
                  <div key={i} className="aspect-square bg-white rounded-xl border border-border/40 shadow-sm overflow-hidden p-1">
                    <img src={url} alt={`Preview ${i}`} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button onClick={handleGenerateZip} disabled={lines.length === 0 || isGenerating} className="w-full sm:w-auto rounded-xl h-11 px-8 text-base">
              {isGenerating ? `Generating... ${progress}%` : `Generate ZIP (${fileFormat.toUpperCase()})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
