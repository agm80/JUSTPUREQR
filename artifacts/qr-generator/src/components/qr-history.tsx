import React, { useState } from "react";
import { format } from "date-fns";
import { Star, X, Download, Upload, Trash2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QROptions } from "@/lib/qr-render";
import { ContentType } from "@/lib/qr-formats";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface QRHistoryItem {
  id: string;
  text: string;
  contentType: ContentType;
  timestamp: number;
  options: QROptions;
  thumbnail: string;
  favorite: boolean;
}

interface QRHistoryProps {
  history: QRHistoryItem[];
  onLoad: (item: QRHistoryItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onClearAll: () => void;
  onExport: () => void;
  onImport: (items: QRHistoryItem[]) => void;
}

export function QRHistory({ history, onLoad, onDelete, onToggleFavorite, onClearAll, onExport, onImport }: QRHistoryProps) {
  const [search, setSearch] = useState("");

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          onImport(imported);
        }
      } catch (err) {
        console.error("Failed to parse history JSON");
      }
    };
    reader.readAsText(file);
  };

  const filteredHistory = history.filter(item => item.text.toLowerCase().includes(search.toLowerCase()));

  const renderList = (items: QRHistoryItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              className="group relative flex items-center gap-3 p-2.5 rounded-2xl border border-border/40 bg-background shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer" 
              onClick={() => onLoad(item)}
            >
              <div className="w-12 h-12 flex-shrink-0 bg-white rounded-xl shadow-sm border border-border/40 overflow-hidden p-1">
                <img src={item.thumbnail} alt="QR" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.contentType}</span>
                  <span className="text-[10px] text-muted-foreground">{format(item.timestamp, "MMM d, HH:mm")}</span>
                </div>
                <p className="text-sm font-medium truncate text-foreground/90 group-hover:text-foreground">{item.text}</p>
              </div>
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={item.favorite} className="w-8 h-8 rounded-full" onClick={() => onToggleFavorite(item.id)}>
                  <Star className={`w-4 h-4 ${item.favorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete history item" className="w-8 h-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(item.id)}>
                  <X className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input 
            id="qr-history-search"
            placeholder="Search history..." 
            aria-label="Search QR history"
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9 h-10 rounded-xl bg-muted/30 border-border/40"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl border-border/40 shadow-sm" onClick={onExport}>
          <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Export
        </Button>
        <div className="flex-1 relative">
          <Input type="file" accept=".json" aria-label="Import QR history from JSON file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImport} />
          <Button variant="outline" size="sm" aria-hidden="true" tabIndex={-1} className="w-full h-9 rounded-xl border-border/40 shadow-sm pointer-events-none">
            <Upload className="w-4 h-4 mr-2" aria-hidden="true" /> Import
          </Button>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 shadow-sm">
              <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" /> Clear
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Clear History</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete all QR code history? This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onClearAll} className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground">Clear All</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-thin">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {history.length === 0 ? "No history yet." : "No results found."}
          </div>
        ) : (
          renderList(filteredHistory.sort((a, b) => {
            if (a.favorite && !b.favorite) return -1;
            if (!a.favorite && b.favorite) return 1;
            return b.timestamp - a.timestamp;
          }))
        )}
      </div>
    </div>
  );
}