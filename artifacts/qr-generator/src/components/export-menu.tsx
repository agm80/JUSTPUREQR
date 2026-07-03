import React, { useState } from "react";
import { Download } from "lucide-react";
import QRCode from "qrcode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QROptions } from "@/lib/qr-render";
import { useToast } from "@/hooks/use-toast";
import { renderQRToCanvas } from "@/lib/qr-render";

// Loads jsPDF on demand from the vendored UMD bundle (public/vendors/jspdf.umd.min.js).
// The UMD build exposes window.jspdf once the script is evaluated.
let jsPDFLoadPromise: Promise<void> | null = null;
function loadJsPDF(): Promise<void> {
  if ((window as any).jspdf) return Promise.resolve();
  if (jsPDFLoadPromise) return jsPDFLoadPromise;
  jsPDFLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${import.meta.env.BASE_URL}vendors/jspdf.umd.min.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load jsPDF"));
    document.head.appendChild(script);
  });
  return jsPDFLoadPromise;
}

interface ExportMenuProps {
  canvas: HTMLCanvasElement | null;
  text: string;
  options: QROptions;
  disabled?: boolean;
}

export function ExportMenu({ canvas, text, options, disabled }: ExportMenuProps) {
  const { toast } = useToast();
  const [hdDialogOpen, setHdDialogOpen] = useState(false);
  const [hdSize, setHdSize] = useState<string>("1024");
  const [isExporting, setIsExporting] = useState(false);

  const getFileName = (ext: string) => `qr-code-${Date.now()}.${ext}`;

  const downloadURL = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPNG = () => {
    if (!canvas) return;
    downloadURL(canvas.toDataURL("image/png"), getFileName("png"));
    toast({ title: "Downloaded", description: "QR code saved as PNG." });
  };

  const handleDownloadJPEG = () => {
    if (!canvas) return;
    downloadURL(canvas.toDataURL("image/jpeg", 0.95), getFileName("jpg"));
    toast({ title: "Downloaded", description: "QR code saved as JPEG." });
  };

  const handleDownloadSVG = async () => {
    if (!text) return;
    try {
      // gradient and logo won't be easily supported by qrcode's SVG, but we use what we can
      const svgString = await QRCode.toString(text, {
        type: 'svg',
        margin: options.margin,
        color: {
          dark: options.color.dark,
          light: options.color.light,
        },
        errorCorrectionLevel: options.errorCorrectionLevel,
      });
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      downloadURL(url, getFileName("svg"));
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded", description: "QR code saved as SVG." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to generate SVG.", variant: "destructive" });
    }
  };

  const handleDownloadPDF = async () => {
    if (!canvas) return;
    try {
      // jsPDF is loaded on demand from a vendored UMD bundle to keep
      // the initial JS payload small. The UMD build sets window.jspdf.
      await loadJsPDF();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = 100; // 100mm width
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      const x = (pdfWidth - imgWidth) / 2;
      const y = 40;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(getFileName("pdf"));
      toast({ title: "Downloaded", description: "QR code saved as PDF." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("No blob");
        const file = new File([blob], 'qr.png', { type: 'image/png' });
        if (navigator.share) {
          await navigator.share({
            files: [file],
            title: 'QR Code',
          });
        } else {
          toast({ title: "Not supported", description: "Sharing is not supported on this device.", variant: "destructive" });
        }
      }, "image/png");
    } catch (err) {
      toast({ title: "Error", description: "Failed to share.", variant: "destructive" });
    }
  };

  const handleHDDownload = async () => {
    if (!text) return;
    setIsExporting(true);
    try {
      const tempCanvas = document.createElement("canvas");
      const hdOptions = { ...options, size: parseInt(hdSize, 10) };
      await renderQRToCanvas(tempCanvas, text, hdOptions);
      downloadURL(tempCanvas.toDataURL("image/png"), getFileName("png"));
      toast({ title: "Downloaded", description: "HD QR code saved." });
      setHdDialogOpen(false);
    } catch (err) {
      toast({ title: "Error", description: "Failed to generate HD QR code.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" aria-label="Export QR code" className="rounded-xl shadow-sm w-full sm:w-auto h-10 px-6 font-medium" disabled={disabled}>
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-2xl shadow-md p-2">
          <DropdownMenuItem onClick={handleDownloadPNG} className="rounded-xl cursor-pointer font-medium text-sm">Download PNG</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setHdDialogOpen(true)} className="rounded-xl cursor-pointer font-medium text-sm">Download PNG (HD)</DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadJPEG} className="rounded-xl cursor-pointer font-medium text-sm">Download JPEG</DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadSVG} className="rounded-xl cursor-pointer font-medium text-sm">Download SVG</DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadPDF} className="rounded-xl cursor-pointer font-medium text-sm">Download PDF</DropdownMenuItem>
          <DropdownMenuItem onClick={handleShare} className="rounded-xl cursor-pointer font-medium text-sm">Share</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={hdDialogOpen} onOpenChange={setHdDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Download HD PNG</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="hd-size-select" className="text-sm font-medium">Select Resolution</label>
              <Select value={hdSize} onValueChange={setHdSize}>
                <SelectTrigger id="hd-size-select" aria-label="HD QR code resolution" className="rounded-xl h-12">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="256" className="rounded-xl">256 x 256</SelectItem>
                  <SelectItem value="512" className="rounded-xl">512 x 512</SelectItem>
                  <SelectItem value="1024" className="rounded-xl">1024 x 1024</SelectItem>
                  <SelectItem value="2048" className="rounded-xl">2048 x 2048</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl h-11" onClick={() => setHdDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleHDDownload} className="rounded-xl h-11" disabled={isExporting}>
              {isExporting ? "Generating..." : "Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}