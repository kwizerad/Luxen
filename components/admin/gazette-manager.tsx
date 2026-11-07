"use client";

import React, { useState, useEffect } from "react";
import {
  Scale,
  Plus,
  Search,
  Trash2,
  Edit2,
  FileText,
  RotateCcw,
  Upload,
  Check,
  X,
  Loader2,
  Filter,
  CheckCircle2,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { GazetteArticle } from "@/lib/gazette-data";

export function GazetteManager() {
  const [articles, setArticles] = useState<GazetteArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLang, setFilterLang] = useState<"all" | "rw" | "en" | "fr">("all");

  // Single Article Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<GazetteArticle> | null>(null);
  const [takeawaysInput, setTakeawaysInput] = useState("");
  const [savingArticle, setSavingArticle] = useState(false);

  // Bulk Paste Modal State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkLang, setBulkLang] = useState<"rw" | "en" | "fr">("rw");
  const [bulkDecreeRef, setBulkDecreeRef] = useState(
    "Presidential Order No 85/01 / Iteka rya Perezida No 85/01"
  );
  const [importingBulk, setImportingBulk] = useState(false);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/gazette");
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      }
    } catch {
      toast.error("Failed to load Gazette articles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // Filtered articles
  const filtered = articles.filter((art) => {
    const matchLang = filterLang === "all" || art.language === filterLang || art.language === "all";
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      art.articleNumber.toLowerCase().includes(q) ||
      art.title.toLowerCase().includes(q) ||
      art.content.toLowerCase().includes(q);
    return matchLang && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditingArticle({
      articleNumber: "Ingingo ya ",
      title: "",
      category: "general",
      language: "rw",
      decreeRef: "Iteka rya Perezida No 85/01 ryo kuwa 02/09/2002",
      content: "",
      keyTakeaways: [],
    });
    setTakeawaysInput("");
    setIsEditOpen(true);
  };

  const handleOpenEdit = (art: GazetteArticle) => {
    setEditingArticle(art);
    setTakeawaysInput((art.keyTakeaways || []).join("\n"));
    setIsEditOpen(true);
  };

  const handleSaveArticle = async () => {
    if (!editingArticle?.articleNumber?.trim() || !editingArticle?.content?.trim()) {
      toast.error("Article number and legal content are required");
      return;
    }

    setSavingArticle(true);
    try {
      const takeaways = takeawaysInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/gazette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          article: {
            ...editingArticle,
            keyTakeaways: takeaways,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        setIsEditOpen(false);
        toast.success("Gazette article saved successfully");
      } else {
        toast.error("Failed to save article");
      }
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setSavingArticle(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      const res = await fetch("/api/admin/gazette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });

      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        toast.success("Article deleted");
      }
    } catch {
      toast.error("Failed to delete article");
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all articles to official default Rwanda Traffic Code articles?")) return;

    try {
      const res = await fetch("/api/admin/gazette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });

      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        toast.success("Reset to standard seed articles complete");
      }
    } catch {
      toast.error("Failed to reset");
    }
  };

  const handleBulkParse = async () => {
    if (!bulkText.trim()) {
      toast.error("Please paste gazette decree text");
      return;
    }

    setImportingBulk(true);

    try {
      // Split by "Article \d+" or "Ingingo ya \d+"
      const regex = /(?:Ingingo\s+ya\s+(\d+)|Article\s+(\d+))\s*[:.-]?\s*([^\n]*)/gi;
      const parsedArticles: Array<Partial<GazetteArticle>> = [];

      const parts = bulkText.split(/(?=(?:Ingingo\s+ya\s+\d+|Article\s+\d+))/i);

      for (const chunk of parts) {
        const match = chunk.match(/^(?:Ingingo\s+ya\s+(\d+)|Article\s+(\d+))\s*[:.-]?\s*([^\n]*)/i);
        if (match) {
          const num = match[1] || match[2];
          const title = (match[3] || "").trim() || `${bulkLang === "rw" ? "Ingingo ya" : "Article"} ${num}`;
          const content = chunk.replace(match[0], "").trim();

          if (content.length > 10) {
            parsedArticles.push({
              articleNumber: `${bulkLang === "rw" ? "Ingingo ya" : "Article"} ${num}`,
              title,
              category: "general",
              language: bulkLang,
              decreeRef: bulkDecreeRef,
              content,
              keyTakeaways: [],
            });
          }
        }
      }

      if (parsedArticles.length === 0) {
        // Fallback: save as a single document/decree article
        parsedArticles.push({
          articleNumber: bulkLang === "rw" ? "Iteka ryose" : "Full Decree",
          title: "Official Gazette Import",
          category: "general",
          language: bulkLang,
          decreeRef: bulkDecreeRef,
          content: bulkText.trim(),
          keyTakeaways: [],
        });
      }

      const res = await fetch("/api/admin/gazette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_import",
          articles: parsedArticles,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        setIsBulkOpen(false);
        setBulkText("");
        toast.success(`Successfully imported ${parsedArticles.length} Gazette articles!`);
      } else {
        toast.error("Failed to import articles");
      }
    } catch {
      toast.error("Error parsing and importing text");
    } finally {
      setImportingBulk(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Official Gazette of Rwanda Knowledge Base
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage official legal decrees, traffic law articles, and regulatory citations indexed for the AI Traffic Assistant.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs gap-1.5"
            title="Restore default standard traffic articles"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkOpen(true)}
            className="text-xs gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Paste Gazette Text</span>
          </Button>

          <Button size="sm" onClick={handleOpenAdd} className="text-xs gap-1.5 shadow-xs">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Article</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-card">
          <div className="text-[11px] font-mono text-muted-foreground">Total Indexed</div>
          <div className="text-xl font-bold text-foreground mt-0.5">{articles.length}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-card">
          <div className="text-[11px] font-mono text-muted-foreground">Kinyarwanda</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {articles.filter((a) => a.language === "rw" || a.language === "all").length}
          </div>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-card">
          <div className="text-[11px] font-mono text-muted-foreground">English</div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {articles.filter((a) => a.language === "en" || a.language === "all").length}
          </div>
        </div>
        <div className="p-3.5 rounded-xl border border-border bg-card">
          <div className="text-[11px] font-mono text-muted-foreground">Français</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {articles.filter((a) => a.language === "fr" || a.language === "all").length}
          </div>
        </div>
      </div>

      {/* Search & Language Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by article number, title, or keywords..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="inline-flex items-center gap-1 p-0.5 rounded-lg border border-border bg-muted/30 text-xs shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setFilterLang("all")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterLang === "all" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterLang("rw")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterLang === "rw" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Kinyarwanda
          </button>
          <button
            onClick={() => setFilterLang("en")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterLang === "en" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setFilterLang("fr")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterLang === "fr" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Français
          </button>
        </div>
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Loading Rwanda Gazette articles...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50 space-y-2">
          <Scale className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No Gazette articles found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search query or upload new Gazette decrees.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((art) => (
            <div
              key={art.id}
              className="p-4 rounded-xl border border-border bg-card hover:border-border/80 transition-colors flex flex-col sm:flex-row items-start justify-between gap-4 shadow-xs"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold font-mono text-primary">
                    {art.articleNumber}
                  </span>
                  <span className="text-muted-foreground/60 text-xs">·</span>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {art.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border uppercase">
                    {art.language}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border lowercase">
                    {art.category}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {art.content}
                </p>

                <div className="text-[11px] font-mono text-muted-foreground/75 truncate">
                  Ref: {art.decreeRef}
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(art)}
                  className="h-8 w-8 p-0"
                  title="Edit article"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(art.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  title="Delete article"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Article Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle?.id ? "Edit Gazette Article" : "Add Gazette Article"}
            </DialogTitle>
            <DialogDescription>
              Enter official legal article details from the Official Gazette of Rwanda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Article Number</Label>
                <Input
                  value={editingArticle?.articleNumber || ""}
                  onChange={(e) =>
                    setEditingArticle((prev) => ({ ...prev, articleNumber: e.target.value }))
                  }
                  placeholder="e.g. Ingingo ya 28 / Article 28"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Language</Label>
                <select
                  value={editingArticle?.language || "rw"}
                  onChange={(e) =>
                    setEditingArticle((prev) => ({ ...prev, language: e.target.value as any }))
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="rw">Kinyarwanda</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="all">All / Universal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Title / Subject</Label>
                <Input
                  value={editingArticle?.title || ""}
                  onChange={(e) =>
                    setEditingArticle((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Uburenganzira mu masangano"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <select
                  value={editingArticle?.category || "general"}
                  onChange={(e) =>
                    setEditingArticle((prev) => ({ ...prev, category: e.target.value as any }))
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="priority">Priority & Right of Way</option>
                  <option value="speed">Speed Limits</option>
                  <option value="overtaking">Overtaking</option>
                  <option value="signs">Road Signs</option>
                  <option value="signals">Traffic Lights & Signals</option>
                  <option value="parking">Stopping & Parking</option>
                  <option value="penalties">Penalties & Fines</option>
                  <option value="general">General Regulations</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Official Decree Reference</Label>
              <Input
                value={editingArticle?.decreeRef || ""}
                onChange={(e) =>
                  setEditingArticle((prev) => ({ ...prev, decreeRef: e.target.value }))
                }
                placeholder="e.g. Iteka rya Perezida No 85/01 ryo kuwa 02/09/2002"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Official Legal Text / Gazette Body</Label>
              <Textarea
                rows={6}
                value={editingArticle?.content || ""}
                onChange={(e) =>
                  setEditingArticle((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder="Paste the official legal text of the article..."
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Key Takeaways (one per line)</Label>
              <Textarea
                rows={3}
                value={takeawaysInput}
                onChange={(e) => setTakeawaysInput(e.target.value)}
                placeholder="Rule 1&#10;Rule 2&#10;Rule 3"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveArticle} disabled={savingArticle}>
              {savingArticle ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Save Article"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Paste Gazette Decree Modal */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paste Official Gazette Decree Text</DialogTitle>
            <DialogDescription>
              Paste full chapters or legal decree sections. The parser automatically detects article numbers (e.g. "Ingingo ya 28" or "Article 28") and extracts them into indexed records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Language of Pasted Text</Label>
                <select
                  value={bulkLang}
                  onChange={(e) => setBulkLang(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="rw">Kinyarwanda</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Decree / Legal Order Reference</Label>
                <Input
                  value={bulkDecreeRef}
                  onChange={(e) => setBulkDecreeRef(e.target.value)}
                  placeholder="e.g. Iteka rya Perezida No 85/01 ryo kuwa 02/09/2002"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Paste Official Gazette Text</Label>
              <Textarea
                rows={12}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Paste decree text here, for example:\n\nIngingo ya 28: Uburenganzira mu masangano...\nBuri muyobozi w'ikinyabiziga...\n\nIngingo ya 29: Guhindura icyerekezo...\nUmuyobozi wese ushaka...`}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsBulkOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleBulkParse} disabled={importingBulk || !bulkText.trim()}>
              {importingBulk ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Parsing & Importing...
                </>
              ) : (
                "Parse & Import Articles"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
