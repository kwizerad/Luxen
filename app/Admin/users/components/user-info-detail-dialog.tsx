"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Car,
  FileText,
  User,
  Loader2,
  AlertCircle,
  IdCard,
  Calendar,
  MapPin,
  Users as UsersIcon,
  Home,
  Award,
  CheckCircle,
  XCircle,
  Download,
  Shield,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  Maximize2,
  Eye,
  EyeOff,
  Edit3,
  Search,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import type { UserWithStatus } from "./types";
import type {
  DLInfoAPIResponse,
  ExamResultDetails,
  TheoryExamDLInfoAPIResponse,
} from "@/lib/live-exam/types";
import type { CitizenFullProfile } from "@/lib/live-exam/irembo";

interface UserInfoDetailDialogProps {
  user: UserWithStatus | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function UserInfoDetailDialog({
  user,
  onClose,
  onUpdated,
}: UserInfoDetailDialogProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("id_info");
  const [copiedId, setCopiedId] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; title: string } | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // National ID management state
  const [currentNationalId, setCurrentNationalId] = useState<string>("");
  const [isEditingId, setIsEditingId] = useState(false);
  const [idInput, setIdInput] = useState("");

  const [citizenProfile, setCitizenProfile] = useState<CitizenFullProfile | null>(null);
  const [examResults, setExamResults] = useState<Record<string, ExamResultDetails>>({});
  const [examCodes, setExamCodes] = useState<{ practical: string[]; theory: string[] }>({
    practical: [],
    theory: [],
  });
  const [dlInfo, setDlInfo] = useState<DLInfoAPIResponse | null>(null);
  const [theoryExamInfo, setTheoryExamInfo] = useState<TheoryExamDLInfoAPIResponse | null>(null);
  const [fetched, setFetched] = useState(false);

  const open = Boolean(user);

  // References to prevent stale state without recreating callbacks or retriggering effects
  const currentNationalIdRef = useRef(currentNationalId);
  currentNationalIdRef.current = currentNationalId;

  const idInputRef = useRef(idInput);
  idInputRef.current = idInput;

  const userRef = useRef(user);
  userRef.current = user;

  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;

  const loadedUserKeyRef = useRef<string | null>(null);

  /**
   * Check and retrieve live data from Irembo API.
   */
  const fetchIremboData = useCallback(async (targetIdParam?: string, isManualSync: boolean = false) => {
    const targetId = (targetIdParam || currentNationalIdRef.current || idInputRef.current).trim().replace(/\D/g, "");
    if (!targetId || targetId.length !== 16) {
      if (isManualSync) {
        toast.error(t("liveExamInvalidId") || "Please enter a valid 16-digit Rwandan National ID");
      }
      return;
    }

    if (isManualSync) {
      setIsSyncing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // 1. Call sync-irembo API endpoint which queries live from all official Irembo police and exam endpoints
      const syncRes = await fetch("/api/admin/sync-irembo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          national_id: targetId,
          user_id: userRef.current?.id?.startsWith("manual-") || userRef.current?.id?.startsWith("national-id-") ? undefined : userRef.current?.id,
        }),
      });

      const syncData = await syncRes.json();

      if (syncData.status === "success") {
        setCitizenProfile(syncData.citizenProfile || null);
        setDlInfo(syncData.dlInfo || null);
        setTheoryExamInfo(syncData.theoryExamInfo || null);
        setExamResults(syncData.examResults || {});
        setExamCodes(syncData.examCodes || { practical: [], theory: [] });
        const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLastSyncedAt(timeNow);
        setCurrentNationalId(targetId);
        setIdInput(targetId);
        setIsEditingId(false);

        if (isManualSync) {
          toast.success(t("iremboSyncSuccess") || "Data successfully updated from Irembo API!");
          if (onUpdatedRef.current) {
            try {
              onUpdatedRef.current();
            } catch {
              // ignore
            }
          }
        }
      } else {
        // Fallback to secondary endpoints if sync route returned non-success
        const [theoryRes, dlRes, examRes] = await Promise.allSettled([
          fetch("/api/theory-exam-dl-info?full=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ national_id: targetId }),
          }).then((r) => r.json()),
          fetch("/api/dl-info?full=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ national_id: targetId }),
          }).then((r) => r.json()),
          fetch("/api/check-marks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ national_id: targetId }),
          }).then((r) => r.json()),
        ]);

        let hasAnyData = false;
        if (theoryRes.status === "fulfilled" && theoryRes.value?.status === "success") {
          setTheoryExamInfo(theoryRes.value);
          hasAnyData = true;
        }
        if (dlRes.status === "fulfilled" && dlRes.value?.status === "success") {
          setDlInfo(dlRes.value);
          hasAnyData = true;
        }
        if (examRes.status === "fulfilled" && examRes.value?.status === "success") {
          setExamResults(examRes.value.results || {});
          setExamCodes({
            practical: examRes.value.practical_codes || [],
            theory: examRes.value.theory_codes || [],
          });
          hasAnyData = true;
        }

        if (hasAnyData) {
          const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setLastSyncedAt(timeNow);
          setCurrentNationalId(targetId);
          setIdInput(targetId);
          setIsEditingId(false);
          if (isManualSync) {
            toast.success(t("iremboSyncSuccess") || "Data successfully updated from Irembo API!");
            if (onUpdatedRef.current) {
              try {
                onUpdatedRef.current();
              } catch {
                // ignore
              }
            }
          }
        } else {
          setError(syncData.message || t("fetchInfoError") || "No records found on Irembo for this National ID.");
          if (isManualSync) {
            toast.error(syncData.message || t("fetchInfoError") || "Failed to update from Irembo API");
          }
        }
      }

      setFetched(true);
    } catch {
      setError(t("fetchInfoError") || "Unable to retrieve records from Irembo.");
      if (isManualSync) {
        toast.error(t("fetchInfoError") || "Unable to retrieve records from Irembo.");
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [t]);

  // Initial load when user prop changes (stabilized against parent re-renders)
  const userKey = user ? `${user.id || ""}_${user.national_id || ""}` : null;
  useEffect(() => {
    if (!user) {
      loadedUserKeyRef.current = null;
      return;
    }

    if (loadedUserKeyRef.current === userKey) {
      return;
    }
    loadedUserKeyRef.current = userKey;

    const rawId = (user.national_id || "").trim().replace(/\D/g, "");
    setShowSignature(false);
    setExamResults({});
    setExamCodes({ practical: [], theory: [] });
    setDlInfo(null);
    setTheoryExamInfo(null);
    setCitizenProfile(null);
    setFetched(false);
    setError(null);
    setLastSyncedAt(null);

    if (rawId && rawId.length === 16) {
      setCurrentNationalId(rawId);
      setIdInput(rawId);
      setIsEditingId(false);
      fetchIremboData(rawId, false);
    } else {
      setCurrentNationalId("");
      setIdInput("");
      setIsEditingId(true);

      // Check if user has an existing record in national_id_records in database
      if (user.id && !user.id.startsWith("manual-") && !user.id.startsWith("national-id-")) {
        fetch(`/api/national-id-records?user_id=${user.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.records?.[0]?.national_id) {
              const foundId = String(data.records[0].national_id).trim().replace(/\D/g, "");
              if (foundId.length === 16) {
                setCurrentNationalId(foundId);
                setIdInput(foundId);
                setIsEditingId(false);
                fetchIremboData(foundId, false);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [userKey, user, fetchIremboData]);

  const handleLinkAndFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = idInput.trim().replace(/\D/g, "");
    if (cleanId.length !== 16) {
      toast.error(t("liveExamInvalidId") || "National ID must be exactly 16 digits");
      return;
    }
    setCurrentNationalId(cleanId);
    setIsEditingId(false);
    if (user) {
      loadedUserKeyRef.current = `${user.id || ""}_${cleanId}`;
    }
    await fetchIremboData(cleanId, true);
  };

  const copyId = () => {
    if (!currentNationalId) return;
    navigator.clipboard.writeText(currentNationalId);
    setCopiedId(true);
    toast.success(t("copied") || "Copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      loadedUserKeyRef.current = null;
      onClose();
      setExamResults({});
      setExamCodes({ practical: [], theory: [] });
      setDlInfo(null);
      setTheoryExamInfo(null);
      setCitizenProfile(null);
      setFetched(false);
      setError(null);
      setLastSyncedAt(null);
      setShowSignature(false);
      setCurrentNationalId("");
      setIdInput("");
      setIsEditingId(false);
    }
  };

  const handleSaveAsPng = async () => {
    if (!exportRef.current || !user) return;
    setExporting(true);
    try {
      const fileName = `user-${(user.full_name || user.username || currentNationalId || "info").replace(/[^a-zA-Z0-9]/g, "-")}.png`;
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#09090b",
        style: {
          transform: "none",
        },
      });
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      toast.success(t("imageSavedSuccess") || "Image downloaded successfully");
    } catch {
      toast.error(t("imageSaveError") || "Failed to generate image");
    } finally {
      setExporting(false);
    }
  };

  if (!user) return null;

  // Combine and extract detailed data from all endpoints
  const totalExams = examCodes.practical.length + examCodes.theory.length;
  const categoriesCount = dlInfo?.categoryCount || theoryExamInfo?.categoriesAllowed?.length || 0;

  const docTheory = theoryExamInfo?.document;
  const docDl = dlInfo?.document;

  const docName =
    (docDl?.firstName || docDl?.lastName ? `${docDl.firstName || ""} ${docDl.lastName || ""}`.trim() : null) ||
    (docTheory?.firstName || docTheory?.lastName ? `${docTheory.firstName || ""} ${docTheory.lastName || ""}`.trim() : null) ||
    citizenProfile?.fullName ||
    docDl?.names ||
    user.full_name ||
    null;

  const docDob = docDl?.dateOfBirth || docTheory?.dateOfBirth || citizenProfile?.dateOfBirth || user.birthdate || null;
  const docSex = docDl?.sex || docTheory?.sex || citizenProfile?.gender || user.gender || null;
  const docCivil = docDl?.civilStatus || docTheory?.civilStatus || citizenProfile?.civilStatus || null;
  const docSpouse = docDl?.spouse || docTheory?.spouse || citizenProfile?.spouse || null;
  const docNationality = docDl?.nationality || docTheory?.nationality || citizenProfile?.nationality || "Rwandan";
  const docPob = docDl?.placeOfBirth || docTheory?.placeOfBirth || citizenProfile?.placeOfBirth || null;

  // Parents Information
  const docFather = docDl?.fatherNames || docTheory?.fatherNames || citizenProfile?.fatherNames || null;
  const docMother = docDl?.motherNames || docTheory?.motherNames || citizenProfile?.motherNames || null;

  // Residential Hierarchy
  const docProvince = docDl?.province || docTheory?.province || citizenProfile?.province || null;
  const docDistrict = docDl?.district || docTheory?.district || citizenProfile?.district || null;
  const docSector = docDl?.sector || docTheory?.sector || citizenProfile?.sector || null;
  const docCell = docDl?.cell || docTheory?.cell || citizenProfile?.cell || null;
  const docVillage = docDl?.village || docTheory?.village || citizenProfile?.village || null;
  const docVillageId = docDl?.villageId || docTheory?.villageId || citizenProfile?.villageId || null;

  // Document metadata & timestamps
  const docIssueDate = docDl?.dateOfIssue || docTheory?.dateOfIssue || citizenProfile?.dateOfIssue || null;
  const docExpiryDate = docDl?.dateOfExpiry || docTheory?.dateOfExpiry || citizenProfile?.dateOfExpiry || null;
  const docIssuePlace = docDl?.placeOfIssue || docTheory?.placeOfIssue || citizenProfile?.placeOfIssue || null;
  const docAppNumber = docDl?.applicationNumber || docTheory?.applicationNumber || null;
  const docType = docDl?.documentType || docTheory?.documentType || "National ID Card";
  const docIssueNumber = docDl?.issueNumber ? String(docDl.issueNumber) : docTheory?.issueNumber ? String(docTheory.issueNumber) : null;
  const docTimeSubmitted = docDl?.timeSubmitted || docTheory?.timeSubmitted || null;

  const photoBase64 =
    docDl?.photo ||
    docTheory?.photo ||
    (citizenProfile?.photoUrl?.startsWith("data:") ? citizenProfile.photoUrl.replace(/^data:[^;]+;base64,/, "") : null) ||
    null;
  const signatureBase64 =
    docDl?.signature ||
    docTheory?.signature ||
    (citizenProfile?.signatureUrl?.startsWith("data:") ? citizenProfile.signatureUrl.replace(/^data:[^;]+;base64,/, "") : null) ||
    null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl h-[92vh] sm:h-[88vh] p-0 flex flex-col overflow-hidden bg-background border border-border shadow-2xl rounded-2xl sm:rounded-3xl">
          {/* Header (fixed at top) */}
          <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 border-b bg-muted/20 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <IdCard className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight truncate">
                    {docName || user.username || t("userDocument") || "User Details"}
                  </DialogTitle>
                  {user.role && (
                    <Badge variant={user.role === "Admin" ? "default" : "secondary"} className="text-[11px] h-5 px-2">
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                    </Badge>
                  )}
                  {lastSyncedAt && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                      {t("syncedAt") || "Synced"} {lastSyncedAt}
                    </Badge>
                  )}
                </div>

                {/* National ID Display or Inline Editor */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {!isEditingId && currentNationalId ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyId}
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
                        title={t("clickToCopyId") || "Click to copy National ID"}
                      >
                        <span className="font-semibold text-foreground">ID: {currentNationalId}</span>
                        {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />}
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIdInput(currentNationalId);
                          setIsEditingId(true);
                        }}
                        className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-primary gap-1"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>{t("edit") || "Change"}</span>
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleLinkAndFetch} className="flex items-center gap-1.5 max-w-sm">
                      <Input
                        value={idInput}
                        onChange={(e) => setIdInput(e.target.value.replace(/\D/g, "").slice(0, 16))}
                        placeholder="16-digit Rwandan ID (e.g. 120058...)"
                        className="h-7 text-xs font-mono w-48 sm:w-56 px-2 bg-background"
                        maxLength={16}
                        autoFocus={isEditingId && !currentNationalId}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={idInput.length !== 16 || isSyncing || loading}
                        className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                      >
                        {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
                        {currentNationalId ? (t("update") || "Update") : (t("linkAndSync") || "Link & Sync")}
                      </Button>
                      {currentNationalId && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingId(false)}
                          className="h-7 px-1.5 text-xs text-muted-foreground"
                        >
                          {t("cancel") || "Cancel"}
                        </Button>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="default"
                onClick={() => fetchIremboData(undefined, true)}
                disabled={isSyncing || loading || (!currentNationalId && idInput.length !== 16)}
                className="h-9 px-3 text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? (t("updatingIrembo") || "Updating...") : (t("updateFromIrembo") || "Update from Irembo")}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveAsPng}
                disabled={exporting || loading}
                className="h-9 px-3 text-xs sm:text-sm font-medium"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                {exporting ? (t("exportingImage") || "Saving...") : (t("saveAsPng") || "Save PNG")}
              </Button>
            </div>
          </DialogHeader>

          {/* 3 Main Tabs: ID & Demographics, Driving Permit, Exams & Marks */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Tabs List */}
            <div className="px-5 sm:px-6 pt-3 pb-0 border-b bg-background shrink-0">
              <TabsList className="w-full justify-start h-11 p-1 bg-muted/50 rounded-xl gap-1 overflow-x-auto">
                <TabsTrigger value="id_info" className="gap-2 text-xs sm:text-sm rounded-lg px-3 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                  <IdCard className="h-4 w-4 text-primary" />
                  <span>{t("idInfo") || "ID & Demographics"}</span>
                </TabsTrigger>

                <TabsTrigger value="permit_info" className="gap-2 text-xs sm:text-sm rounded-lg px-3 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                  <Car className="h-4 w-4 text-emerald-500" />
                  <span>{t("permitInfo") || "Driving Permit"}</span>
                  {categoriesCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-bold">
                      {categoriesCount}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger value="exam_results" className="gap-2 text-xs sm:text-sm rounded-lg px-3 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span>{t("exams") || "Exams & Marks"}</span>
                  {totalExams > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-bold">
                      {totalExams}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Scrollable Content Container (Smooth native scroll) */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 overscroll-contain">
              <div ref={exportRef}>
                {!currentNationalId ? (
                  /* Callout to Link National ID */
                  <div className="max-w-xl mx-auto py-10 px-4 text-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
                      <IdCard className="h-8 w-8" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-foreground">
                        {t("noIdLinkedTitle") || "No National ID Linked"}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t("noIdLinkedDesc") || "Enter a 16-digit Rwandan National ID to query official Police databases, driving permits, photos, and exam results."}
                      </p>
                    </div>

                    <form onSubmit={handleLinkAndFetch} className="flex flex-col sm:flex-row items-center gap-2 justify-center pt-2">
                      <Input
                        value={idInput}
                        onChange={(e) => setIdInput(e.target.value.replace(/\D/g, "").slice(0, 16))}
                        placeholder="16-digit Rwandan ID (e.g. 1200580049150025)"
                        className="h-10 text-sm font-mono text-center sm:text-left max-w-xs bg-background"
                        maxLength={16}
                      />
                      <Button
                        type="submit"
                        disabled={idInput.length !== 16 || isSyncing || loading}
                        className="h-10 px-4 text-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm w-full sm:w-auto"
                      >
                        {isSyncing || loading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 mr-2" />
                        )}
                        {t("linkAndSync") || "Lookup & Link ID"}
                      </Button>
                    </form>
                  </div>
                ) : loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="h-9 w-9 animate-spin text-primary mb-3" />
                    <p className="text-sm font-semibold text-foreground">{t("fetchingInfo") || "Retrieving live data directly from Irembo API..."}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("liveIremboData") || "Checking Police databases, driving records, and exam results"}</p>
                  </div>
                ) : error && !dlInfo && !theoryExamInfo && Object.keys(examResults).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">{error}</p>
                    <p className="text-xs text-muted-foreground max-w-sm mb-4">
                      {t("iremboSyncErrorHint") || "Click 'Update from Irembo' to retry direct query."}
                    </p>
                    <Button size="sm" onClick={() => fetchIremboData(undefined, true)} variant="outline" className="gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t("retry") || "Retry Query"}
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* ================= TAB 1: ID INFO & DEMOGRAPHICS ================= */}
                    <TabsContent value="id_info" className="m-0 space-y-5">
                      {/* Photo, Signature & Document Status Banner */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Citizen Photo */}
                        <Card className="border shadow-xs overflow-hidden">
                          <div className="px-4 py-2.5 border-b bg-muted/40 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {t("officialPhoto") || "Official Photo"}
                            </span>
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          </div>
                          <CardContent className="p-4 flex flex-col items-center justify-center">
                            {photoBase64 ? (
                              <div
                                className="relative group cursor-pointer"
                                onClick={() => setZoomedImage({ src: `data:image/jpeg;base64,${photoBase64}`, title: t("officialPhoto") || "Official Photo" })}
                              >
                                <img
                                  src={`data:image/jpeg;base64,${photoBase64}`}
                                  alt={docName || "Citizen Photo"}
                                  className="h-44 w-36 object-cover rounded-xl border border-border/80 shadow-md group-hover:scale-102 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <Maximize2 className="h-6 w-6" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-44 w-36 rounded-xl border border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                                <User className="h-10 w-10 opacity-30 mb-1" />
                                <span className="text-xs">{t("noPhotoAvailable") || "No Photo on File"}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Citizen Signature (HIDDEN BY DEFAULT, UNHIDDEN BY USER ON CLICK) */}
                        <Card className="border shadow-xs overflow-hidden flex flex-col">
                          <div className="px-4 py-2.5 border-b bg-muted/40 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {t("officialSignature") || "Citizen Signature"}
                            </span>
                            {signatureBase64 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowSignature(!showSignature)}
                                className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                              >
                                {showSignature ? (
                                  <>
                                    <EyeOff className="h-3 w-3" />
                                    <span>{t("hideSignature") || "Hide"}</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3 text-primary" />
                                    <span className="text-primary font-medium">{t("unhideSignature") || "Unhide"}</span>
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          <CardContent className="p-4 flex-1 flex flex-col items-center justify-center">
                            {signatureBase64 ? (
                              showSignature ? (
                                <div
                                  className="relative group cursor-pointer"
                                  onClick={() => setZoomedImage({ src: `data:image/jpeg;base64,${signatureBase64}`, title: t("officialSignature") || "Citizen Signature" })}
                                >
                                  <div className="h-44 w-36 bg-white dark:bg-zinc-100 rounded-xl border border-border/80 shadow-md p-2 flex items-center justify-center group-hover:scale-102 transition-transform">
                                    <img
                                      src={`data:image/jpeg;base64,${signatureBase64}`}
                                      alt="Citizen Signature"
                                      className="max-h-36 max-w-full object-contain"
                                    />
                                  </div>
                                  <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                    <Maximize2 className="h-6 w-6" />
                                  </div>
                                </div>
                              ) : (
                                <div className="h-44 w-full rounded-xl border border-dashed flex flex-col items-center justify-center text-center p-3 bg-muted/10 space-y-2">
                                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                    <EyeOff className="h-4 w-4" />
                                  </div>
                                  <p className="text-xs text-muted-foreground font-medium">
                                    {t("signatureHidden") || "Signature hidden for security"}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowSignature(true)}
                                    className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                  >
                                    <Eye className="h-3 w-3" />
                                    {t("unhideSignature") || "Click to Unhide"}
                                  </Button>
                                </div>
                              )
                            ) : (
                              <div className="h-44 w-36 rounded-xl border border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                                <FileText className="h-10 w-10 opacity-30 mb-1" />
                                <span className="text-xs">{t("noSignatureAvailable") || "No Signature on File"}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Document Verification & Validity Summary */}
                        <Card className="border shadow-xs flex flex-col justify-between">
                          <div className="px-4 py-2.5 border-b bg-muted/40 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {t("documentStatus") || "Document Status"}
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              {t("activeRecord") || "Active"}
                            </Badge>
                          </div>
                          <CardContent className="p-4 space-y-3">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase">{t("documentNumber") || "National ID Number"}</p>
                              <p className="font-mono font-bold text-base sm:text-lg">{currentNationalId}</p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase">{t("dateOfIssue") || "Date of Issue"}</p>
                              <p className="text-sm font-semibold">{docIssueDate || "—"}</p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase">{t("dateOfExpiry") || "Date of Expiry"}</p>
                              <p className="text-sm font-semibold">{docExpiryDate || "—"}</p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase">{t("placeOfIssue") || "Place of Issue"}</p>
                              <p className="text-sm font-semibold">{docIssuePlace || "—"}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Personal Demographics Grid */}
                      <Card className="border shadow-xs">
                        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm">{t("personalDemographics") || "Personal Demographics"}</h3>
                        </div>
                        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <DataField label={t("fullName") || "Full Name"} value={docName} />
                          <DataField label={t("dateOfBirth") || "Date of Birth"} value={docDob} />
                          <DataField label={t("gender") || "Gender / Sex"} value={docSex} />
                          <DataField label={t("civilStatus") || "Civil Status"} value={docCivil} />
                          <DataField label={t("spouse") || "Spouse"} value={docSpouse} />
                          <DataField label={t("nationality") || "Nationality"} value={docNationality} />
                          <DataField label={t("placeOfBirth") || "Place of Birth"} value={docPob} />
                        </CardContent>
                      </Card>

                      {/* Parents Information Card */}
                      <Card className="border shadow-xs">
                        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UsersIcon className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">{t("parentsInformation") || "Parents Information"}</h3>
                          </div>
                          {(docFather || docMother) && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                              {t("verified") || "Verified"}
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DataField label={t("fatherNames") || "Father's Full Name"} value={docFather} highlight />
                          <DataField label={t("motherNames") || "Mother's Full Name"} value={docMother} highlight />
                        </CardContent>
                      </Card>

                      {/* Official Residential Location (Rwanda) */}
                      <Card className="border shadow-xs">
                        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                          <Home className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm">{t("residentialAddress") || "Official Residential Location (Rwanda)"}</h3>
                        </div>
                        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                          <DataField label={t("province") || "Province"} value={docProvince} />
                          <DataField label={t("district") || "District"} value={docDistrict} />
                          <DataField label={t("sector") || "Sector"} value={docSector} />
                          <DataField label={t("cell") || "Cell"} value={docCell} />
                          <DataField label={t("village") || "Village"} value={docVillage} />
                          {docVillageId && <DataField label={t("villageId") || "Village ID"} value={docVillageId} mono />}
                        </CardContent>
                      </Card>

                      {/* Document Details & Registration Audit */}
                      <Card className="border shadow-xs">
                        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm">{t("documentDetails") || "Document Registration Details"}</h3>
                        </div>
                        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <DataField label={t("documentType") || "Document Type"} value={docType} />
                          <DataField label={t("applicationNumber") || "Application Number"} value={docAppNumber} mono />
                          <DataField label={t("issueNumber") || "Issue Number"} value={docIssueNumber} />
                          <DataField label={t("timeSubmitted") || "Submission Time"} value={docTimeSubmitted} />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* ================= TAB 2: PERMIT & DRIVING LICENSE ================= */}
                    <TabsContent value="permit_info" className="m-0 space-y-5">
                      {/* License Status & Basic Card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border shadow-xs">
                          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-primary" />
                              <h3 className="font-semibold text-sm">{t("drivingLicenseDetails") || "Driving License Record"}</h3>
                            </div>
                            {dlInfo?.license?.status && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  dlInfo.license.status.toUpperCase() === "VALID" || dlInfo.license.status.toUpperCase() === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                }`}
                              >
                                {dlInfo.license.status}
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4 space-y-3">
                            <DataField label={t("licenseNumber") || "License Number"} value={dlInfo?.license?.licenseNumber} mono />
                            <DataField label={t("vehicleClass") || "Vehicle Class / Categories"} value={dlInfo?.license?.vehicleClass} />
                            <DataField label={t("placeOfIssue") || "Place of Issue"} value={dlInfo?.license?.placeOfIssue} />
                            <div className="grid grid-cols-2 gap-3">
                              <DataField label={t("dateOfIssue") || "Date of Issue"} value={dlInfo?.license?.dateOfIssue || docIssueDate} />
                              <DataField label={t("expiryDate") || "Expiry Date"} value={dlInfo?.license?.expiryDate || docExpiryDate} />
                            </div>
                            {dlInfo?.license?.documentType && (
                              <DataField label={t("licenseType") || "License Document Type"} value={dlInfo.license.documentType} />
                            )}
                          </CardContent>
                        </Card>

                        {/* Theory / Learner Eligibility Card */}
                        <Card className="border shadow-xs">
                          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <h3 className="font-semibold text-sm">{t("theoryExamPermitStatus") || "Learner / Provisional Eligibility"}</h3>
                            </div>
                            {theoryExamInfo && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  theoryExamInfo.hasCategories
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-zinc-500/10 text-zinc-600 border-zinc-500/30"
                                }`}
                              >
                                {theoryExamInfo.hasCategories ? t("eligible") || "Eligible" : t("none") || "No Categories"}
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4 space-y-3">
                            <p className="text-xs text-muted-foreground">
                              {theoryExamInfo?.hasCategories
                                ? (t("provisionalPermitActiveDesc") || "This citizen has valid provisional permit authorization to sit for practical examinations.")
                                : (t("noProvisionalCategoriesDesc") || "No provisional category restrictions on file for this ID.")}
                            </p>
                            <div className="pt-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase">{t("registeredCategories") || "Allowed Categories"}</span>
                              <p className="font-bold text-sm mt-0.5">
                                {categoriesCount > 0 ? `${categoriesCount} Category(ies) Authorized` : "None"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Allowed Categories Grid */}
                      <Card className="border shadow-xs">
                        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">{t("allowedCategories") || "Authorized Driving Categories"}</h3>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {categoriesCount} {categoriesCount === 1 ? t("category") || "Category" : t("categories") || "Categories"}
                          </Badge>
                        </div>
                        <CardContent className="p-4">
                          {(dlInfo?.categoriesAllowed && dlInfo.categoriesAllowed.length > 0) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {dlInfo.categoriesAllowed.map((cat, idx) => {
                                const name = cat.categoryName || cat.category || "Cat";
                                return (
                                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                                      {name}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <p className="font-bold text-sm">{name}</p>
                                        {cat.status && (
                                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                            {cat.status}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cat.description || "Authorized Driving Class"}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (theoryExamInfo?.categoriesAllowed && theoryExamInfo.categoriesAllowed.length > 0) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {theoryExamInfo.categoriesAllowed.map((cat, idx) => {
                                const name = cat.categoryName || "Cat";
                                return (
                                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                                      {name}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <p className="font-bold text-sm">{name}</p>
                                        {cat.status && (
                                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                            {cat.status}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cat.description || "Provisional Class Authorization"}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="py-8 text-center text-muted-foreground">
                              <Car className="h-8 w-8 opacity-30 mx-auto mb-2" />
                              <p className="text-sm font-medium">{t("noDrivingCategoriesFound") || "No driving license categories registered for this ID."}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* ================= TAB 3: EXAM RESULTS & CODES ================= */}
                    <TabsContent value="exam_results" className="m-0 space-y-5">
                      {/* Summary Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Card className="p-3 border shadow-xs">
                          <p className="text-xs text-muted-foreground uppercase">{t("totalExams") || "Total Exams"}</p>
                          <p className="text-2xl font-bold mt-1">{totalExams}</p>
                        </Card>
                        <Card className="p-3 border shadow-xs">
                          <p className="text-xs text-muted-foreground uppercase">{t("theoryExams") || "Theory Codes"}</p>
                          <p className="text-2xl font-bold mt-1 text-primary">{examCodes.theory.length}</p>
                        </Card>
                        <Card className="p-3 border shadow-xs">
                          <p className="text-xs text-muted-foreground uppercase">{t("practicalExams") || "Practical Codes"}</p>
                          <p className="text-2xl font-bold mt-1 text-emerald-500">{examCodes.practical.length}</p>
                        </Card>
                        <Card className="p-3 border shadow-xs">
                          <p className="text-xs text-muted-foreground uppercase">{t("passedExams") || "Passed"}</p>
                          <p className="text-2xl font-bold mt-1 text-emerald-600">
                            {Object.values(examResults).filter((r) => r.passed).length}
                          </p>
                        </Card>
                      </div>

                      {/* Theory Exams List */}
                      <Card className="border shadow-xs">
                        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">{t("theoryExamResults") || "Theory Exam Registrations"}</h3>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {examCodes.theory.length}
                          </Badge>
                        </div>
                        <CardContent className="p-4 space-y-3">
                          {examCodes.theory.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">{t("noTheoryExams") || "No theory exam codes found."}</p>
                          ) : (
                            examCodes.theory.map((code) => {
                              const result = examResults[code];
                              return (
                                <ExamResultCard key={code} code={code} result={result} />
                              );
                            })
                          )}
                        </CardContent>
                      </Card>

                      {/* Practical Exams List */}
                      <Card className="border shadow-xs">
                        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-emerald-500" />
                            <h3 className="font-semibold text-sm">{t("practicalExamResults") || "Practical Exam Registrations"}</h3>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {examCodes.practical.length}
                          </Badge>
                        </div>
                        <CardContent className="p-4 space-y-3">
                          {examCodes.practical.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">{t("noPracticalExams") || "No practical exam codes found."}</p>
                          ) : (
                            examCodes.practical.map((code) => {
                              const result = examResults[code];
                              return (
                                <ExamResultCard key={code} code={code} result={result} />
                              );
                            })
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </>
                )}
              </div>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Lightbox Zoom Dialog for Photo / Signature */}
      {zoomedImage && (
        <Dialog open={Boolean(zoomedImage)} onOpenChange={(open) => !open && setZoomedImage(null)}>
          <DialogContent className="max-w-md p-4 bg-background dark:bg-zinc-950 border border-border shadow-2xl rounded-2xl">
            <DialogHeader className="pb-2 border-b">
              <DialogTitle className="text-base font-bold">{zoomedImage.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4 flex items-center justify-center">
              <img
                src={zoomedImage.src}
                alt={zoomedImage.title}
                className="max-h-[65vh] max-w-full rounded-lg object-contain bg-white dark:bg-zinc-900 border"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setZoomedImage(null)}>
                {t("close") || "Close"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function DataField({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`p-2.5 rounded-xl border ${highlight ? "bg-primary/5 border-primary/20" : "bg-muted/20"}`}>
      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-xs sm:text-sm font-semibold text-foreground mt-0.5 break-words ${mono ? "font-mono" : ""} ${highlight ? "text-primary font-bold" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function ExamResultCard({
  code,
  result,
}: {
  code: string;
  result?: ExamResultDetails;
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(`${t("copied") || "Copied"}: ${code}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const percentage = result?.totalMarks ? Math.round(((result.marksObtained || 0) / result.totalMarks) * 100) : 0;

  return (
    <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 border transition-colors group"
            title={t("clickToCopy") || "Click to copy code"}
          >
            <span>{code}</span>
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />}
          </button>
          {result?.examType && (
            <Badge variant="outline" className="text-[11px]">
              {result.examType}
            </Badge>
          )}
          {result?.licenseCategory && result.licenseCategory !== "N/A" && (
            <Badge variant="secondary" className="text-[11px]">
              Cat: {result.licenseCategory}
            </Badge>
          )}
        </div>

        {result && (
          <div className="flex items-center gap-2">
            {result.status === "PENDING_APPROVAL" || result.grade === "PENDING" ? (
              <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold">
                <Clock className="h-3 w-3" />
                {t("pendingApproval") || "Ategerezwa Kwemezwa (Pending)"}
              </Badge>
            ) : result.passed ? (
              <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                <CheckCircle className="h-3 w-3" />
                {result.grade || "PASS"}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-xs font-bold">
                <XCircle className="h-3 w-3" />
                {result.grade || "FAIL"}
              </Badge>
            )}
            {result.status !== "PENDING_APPROVAL" && result.grade !== "PENDING" && (
              <span className="text-xs font-bold">
                {result.marksObtained}/{result.totalMarks} ({percentage}%)
              </span>
            )}
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5 truncate">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{result.examDate || "N/A"}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{result.testCenter || "N/A"}</span>
            </div>
          </div>
          {result.status !== "PENDING_APPROVAL" && result.grade !== "PENDING" && result.totalMarks > 0 && (
            <Progress value={percentage} className={`h-1.5 ${result.passed ? "bg-muted text-emerald-500" : "bg-muted text-red-500"}`} />
          )}
        </>
      )}
    </div>
  );
}
