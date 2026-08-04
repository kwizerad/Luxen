"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
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
  Mail,
  Hash,
  Clock,
  Cake,
  Shield,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import type { UserWithStatus } from "./types";
import type {
  DLInfoAPIResponse,
  ExamResultDetails,
  CheckMarksResponse,
  TheoryExamDLInfoAPIResponse,
} from "@/lib/live-exam/types";

interface UserInfoDetailDialogProps {
  user: UserWithStatus | null;
  onClose: () => void;
}

const ADMIN_EXAM_CACHE = "luxen:admin:exam:";
const ADMIN_DL_CACHE = "luxen:admin:dl:";
const ADMIN_THEORY_CACHE = "luxen:admin:theory:";
const CACHE_TTL = 10 * 60 * 1000;

function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed._ts && Date.now() - parsed._ts > CACHE_TTL) return null;
    return parsed.data as T;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ _ts: Date.now(), data }));
  } catch {
    // silently skip
  }
}

export function UserInfoDetailDialog({
  user,
  onClose,
}: UserInfoDetailDialogProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const [examResults, setExamResults] = useState<Record<string, ExamResultDetails>>({});
  const [examCodes, setExamCodes] = useState<{ practical: string[]; theory: string[] }>({
    practical: [],
    theory: [],
  });
  const [dlInfo, setDlInfo] = useState<DLInfoAPIResponse | null>(null);
  const [theoryExamInfo, setTheoryExamInfo] = useState<TheoryExamDLInfoAPIResponse | null>(null);
  const [fetched, setFetched] = useState(false);

  const open = Boolean(user);

  const fetchAllData = useCallback(async () => {
    if (!user?.national_id || fetched) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch exam codes
      const examCacheKey = ADMIN_EXAM_CACHE + user.national_id;
      const cachedExam = getCache<CheckMarksResponse>(examCacheKey);
      if (cachedExam) {
        if (cachedExam.status === "success") {
          setExamResults(cachedExam.results || {});
          setExamCodes({
            practical: cachedExam.practical_codes || [],
            theory: cachedExam.theory_codes || [],
          });
        }
      } else {
        const examRes = await fetch("/api/check-marks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ national_id: user.national_id }),
        });
        const examData: CheckMarksResponse = await examRes.json();
        setCache(examCacheKey, examData);
        if (examData.status === "success") {
          setExamResults(examData.results || {});
          setExamCodes({
            practical: examData.practical_codes || [],
            theory: examData.theory_codes || [],
          });
        }
      }

      // Fetch DL / permit info
      const dlCacheKey = ADMIN_DL_CACHE + user.national_id;
      const theoryCacheKey = ADMIN_THEORY_CACHE + user.national_id;
      const cachedDl = getCache<DLInfoAPIResponse>(dlCacheKey);
      const cachedTheory = getCache<TheoryExamDLInfoAPIResponse>(theoryCacheKey);

      if (cachedDl) {
        setDlInfo(cachedDl);
      } else if (cachedTheory) {
        setTheoryExamInfo(cachedTheory);
      } else {
        const dlRes = await fetch("/api/dl-info?full=true", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ national_id: user.national_id }),
        });
        const dlData: DLInfoAPIResponse = await dlRes.json();
        if (dlData.status === "success") {
          setDlInfo(dlData);
          setCache(dlCacheKey, dlData);
        } else {
          // Fallback: try theory-exam DL info API
          const theoryRes = await fetch("/api/theory-exam-dl-info?full=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ national_id: user.national_id }),
          });
          const theoryData: TheoryExamDLInfoAPIResponse = await theoryRes.json();
          if (theoryData.status === "success") {
            setTheoryExamInfo(theoryData);
            setCache(theoryCacheKey, theoryData);
          }
        }
      }

      setFetched(true);
    } catch {
      setError(t("fetchInfoError"));
    } finally {
      setLoading(false);
    }
  }, [user, fetched, t]);

  useEffect(() => {
    if (open && user?.national_id) {
      fetchAllData();
    }
  }, [open, user, fetchAllData]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setExamResults({});
      setExamCodes({ practical: [], theory: [] });
      setDlInfo(null);
      setTheoryExamInfo(null);
      setFetched(false);
      setError(null);
    }
  };

  const handleSaveAsPng = async () => {
    if (!exportRef.current || !user) return;
    setExporting(true);
    try {
      const fileName = `user-${(user.full_name || user.username || user.national_id || "info").replace(/[^a-zA-Z0-9]/g, "-")}.png`;
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#060608",
        style: {
          transform: "none",
        },
      });
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      toast.success(t("imageSavedSuccess"));
    } catch {
      toast.error(t("imageSaveError"));
    } finally {
      setExporting(false);
    }
  };

  if (!user) return null;

  const getInitials = () => {
    const name = user.full_name || user.username || user.email || "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date?: string | null) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleString();
    } catch {
      return "—";
    }
  };

  const hasExamData = examCodes.practical.length > 0 || examCodes.theory.length > 0;
  const hasPermitData = !!dlInfo?.license || !!theoryExamInfo;
  const hasUserData = !!dlInfo?.document || !!theoryExamInfo?.document;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        {/* Header with title and Save button */}
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex-row items-center justify-between">
          <div className="flex-1 min-w-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-xl">
              <IdCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <span className="truncate">{t("userDocument")}</span>
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
              {user.national_id}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveAsPng}
            disabled={exporting || loading}
            className="flex-shrink-0"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            {exporting ? t("exportingImage") : t("saveAsPng")}
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div ref={exportRef} className="px-4 sm:px-6 pb-6 space-y-4 sm:space-y-5">
            {/* User Profile Header — matching UserProfileDrawer style */}
            <div className="flex items-start gap-3 sm:gap-4 p-4 rounded-xl border bg-muted/30">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
                <AvatarImage src={user.avatar_url} alt={user.full_name || user.email} />
                <AvatarFallback className="text-xl sm:text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold truncate">
                  {user.full_name || user.username || t("unknown")}
                </h2>
                {user.email && (
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
                <div className="flex gap-1.5 sm:gap-2 mt-2 flex-wrap">
                  {user.national_id && (
                    <Badge variant="outline" className="gap-1 text-xs font-mono">
                      <Hash className="h-3 w-3" />
                      {user.national_id}
                    </Badge>
                  )}
                  {user.role && (
                    <Badge variant={user.role === "Admin" ? "default" : "secondary"} className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role === "Admin" ? t("admin") : t("student")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Information Section — matching UserProfileDrawer InfoItem style */}
            <SectionCard title={t("personalInformation")} icon={<User className="h-5 w-5 text-primary" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoItem icon={<Hash className="h-4 w-4" />} label={t("userId")} value={user.id} mono />
                <InfoItem icon={<User className="h-4 w-4" />} label={t("username")} value={user.username} />
                <InfoItem icon={<Mail className="h-4 w-4" />} label={t("email")} value={user.email} />
                <InfoItem icon={<Calendar className="h-4 w-4" />} label={t("joined")} value={formatDate(user.created_at)} />
                <InfoItem icon={<Clock className="h-4 w-4" />} label={t("lastLogin")} value={formatDate(user.last_seen)} />
                <InfoItem icon={<Cake className="h-4 w-4" />} label={t("dateOfBirth")} value={user.birthdate} />
                <InfoItem icon={<MapPin className="h-4 w-4" />} label={t("nationality")} value={user.nationality} />
                <InfoItem icon={<User className="h-4 w-4" />} label={t("gender")} value={user.gender} />
                <InfoItem icon={<Shield className="h-4 w-4" />} label={t("role")} value={user.role} />
              </div>
            </SectionCard>

            {loading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {t("fetchingInfo")}
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="h-7 w-7 mb-2 text-destructive" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                {/* Exam Codes Section */}
                <SectionCard title={t("exams")} icon={<Car className="h-5 w-5 text-primary" />}>
                  {hasExamData ? (
                    <div className="space-y-4">
                      <ExamCodesSection
                        title={t("liveExamTheoryCodes")}
                        codes={examCodes.theory}
                        results={examResults}
                      />
                      <ExamCodesSection
                        title={t("liveExamPracticalCodes")}
                        codes={examCodes.practical}
                        results={examResults}
                      />
                    </div>
                  ) : (
                    <EmptyState message={t("liveExamNoCodes")} />
                  )}
                </SectionCard>

                {/* Permit Info Section */}
                <SectionCard title={t("permitInfo")} icon={<FileText className="h-5 w-5 text-primary" />}>
                  {hasPermitData ? (
                    !dlInfo?.license && theoryExamInfo ? (
                      <div className="space-y-4">
                        <div
                          className={`flex items-center gap-3 rounded-lg border p-4 ${
                            theoryExamInfo.hasCategories
                              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                              : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                          }`}
                        >
                          {theoryExamInfo.hasCategories ? (
                            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                          )}
                          <div>
                            <p className="text-sm font-bold">
                              {theoryExamInfo.hasCategories
                                ? t("liveExamHasCategories")
                                : t("liveExamNoCategory")}
                            </p>
                            {!theoryExamInfo.hasCategories && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {t("liveExamNoCategoryHint")}
                              </p>
                            )}
                          </div>
                        </div>

                        {theoryExamInfo.hasCategories &&
                          theoryExamInfo.categoriesAllowed &&
                          theoryExamInfo.categoriesAllowed.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Award className="h-4 w-4 text-primary" />
                                {t("allowedCategories")}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {theoryExamInfo.categoriesAllowed.map((cat, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                                  >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                                      {cat.categoryName?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-sm">
                                        {cat.categoryName}
                                      </p>
                                      {cat.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {cat.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <InfoRow
                            icon={<FileText className="h-4 w-4" />}
                            label={t("licenseNumber")}
                            value={dlInfo?.license?.licenseNumber}
                          />
                          <InfoRow
                            icon={<CheckCircle className="h-4 w-4" />}
                            label={t("licenseStatus")}
                            value={dlInfo?.license?.status}
                          />
                          <InfoRow
                            icon={<Car className="h-4 w-4" />}
                            label={t("vehicleClass")}
                            value={dlInfo?.license?.vehicleClass}
                          />
                          <InfoRow
                            icon={<Calendar className="h-4 w-4" />}
                            label={t("expiryDate")}
                            value={dlInfo?.license?.expiryDate}
                          />
                          <InfoRow
                            icon={<MapPin className="h-4 w-4" />}
                            label={t("placeOfIssue")}
                            value={dlInfo?.license?.placeOfIssue}
                          />
                        </div>

                        {dlInfo?.categoriesAllowed && dlInfo.categoriesAllowed.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Award className="h-4 w-4 text-primary" />
                              {t("allowedCategories")}
                              <Badge variant="default" className="text-xs">
                                {dlInfo.categoryCount} {t("categoryCount")}
                              </Badge>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {dlInfo.categoriesAllowed.map((cat, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                                    {cat.category?.charAt(0).toUpperCase() || "?"}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm">
                                      {cat.category}
                                    </p>
                                    {cat.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {cat.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <EmptyState message={t("noData")} />
                  )}
                </SectionCard>

                {/* User Info / Document Section */}
                <SectionCard title={t("userInfo")} icon={<User className="h-5 w-5 text-primary" />}>
                  {hasUserData ? (
                    <>
                      {/* Photo & Signature */}
                      <div className="flex gap-4 flex-wrap mb-4">
                        {dlInfo?.document?.photo && (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              {t("photo")}
                            </p>
                            <img
                              src={`data:image/jpeg;base64,${dlInfo.document.photo}`}
                              alt={dlInfo?.document?.names}
                              className="rounded-lg border h-40 w-32 object-cover"
                            />
                          </div>
                        )}
                        {theoryExamInfo?.document?.photo && !dlInfo?.document?.photo && (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              {t("photo")}
                            </p>
                            <img
                              src={`data:image/jpeg;base64,${theoryExamInfo.document.photo}`}
                              alt={`${theoryExamInfo.document.firstName} ${theoryExamInfo.document.lastName}`}
                              className="rounded-lg border h-40 w-32 object-cover"
                            />
                          </div>
                        )}
                        {dlInfo?.document?.signature && (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              {t("signature")}
                            </p>
                            <img
                              src={`data:image/jpeg;base64,${dlInfo?.document?.signature}`}
                              alt="Signature"
                              className="rounded-lg border h-40 w-32 object-contain bg-white"
                            />
                          </div>
                        )}
                        {theoryExamInfo?.document?.signature && !dlInfo?.document?.signature && (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              {t("signature")}
                            </p>
                            <img
                              src={`data:image/jpeg;base64,${theoryExamInfo.document.signature}`}
                              alt="Signature"
                              className="rounded-lg border h-40 w-32 object-contain bg-white"
                            />
                          </div>
                        )}
                      </div>

                      {/* Document Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {dlInfo?.document ? (
                          <>
                            <InfoRow icon={<FileText className="h-4 w-4" />} label={t("documentNumber")} value={dlInfo.document.documentNumber} />
                            <InfoRow icon={<User className="h-4 w-4" />} label={t("fullName")} value={dlInfo.document.names} />
                            <InfoRow icon={<Calendar className="h-4 w-4" />} label={t("dateOfBirth")} value={dlInfo.document.dateOfBirth} />
                            <InfoRow icon={<MapPin className="h-4 w-4" />} label={t("placeOfBirth")} value={dlInfo.document.placeOfBirth} />
                            <InfoRow icon={<User className="h-4 w-4" />} label={t("civilStatus")} value={dlInfo.document.civilStatus} />
                            <InfoRow icon={<MapPin className="h-4 w-4" />} label={t("nationality")} value={dlInfo.document.nationality} />
                            <InfoRow icon={<User className="h-4 w-4" />} label={t("sex")} value={dlInfo.document.sex} />
                            <InfoRow icon={<UsersIcon className="h-4 w-4" />} label={t("fatherNames")} value={dlInfo.document.fatherNames} />
                            <InfoRow icon={<UsersIcon className="h-4 w-4" />} label={t("motherNames")} value={dlInfo.document.motherNames} />
                            <InfoRow icon={<Home className="h-4 w-4" />} label={t("province")} value={dlInfo.document.province} />
                            <InfoRow icon={<Home className="h-4 w-4" />} label={t("district")} value={dlInfo.document.district} />
                            <InfoRow icon={<Home className="h-4 w-4" />} label={t("sector")} value={dlInfo.document.sector} />
                            <InfoRow icon={<Home className="h-4 w-4" />} label={t("cell")} value={dlInfo.document.cell} />
                            <InfoRow icon={<Home className="h-4 w-4" />} label={t("village")} value={dlInfo.document.village} />
                            <InfoRow icon={<Calendar className="h-4 w-4" />} label={t("dateOfIssue")} value={dlInfo.document.dateOfIssue} />
                            <InfoRow icon={<Calendar className="h-4 w-4" />} label={t("dateOfExpiry")} value={dlInfo.document.dateOfExpiry} />
                            <InfoRow icon={<MapPin className="h-4 w-4" />} label={t("placeOfIssue")} value={dlInfo.document.placeOfIssue} />
                          </>
                        ) : theoryExamInfo?.document ? (
                          <>
                            <InfoRow icon={<FileText className="h-4 w-4" />} label={t("documentNumber")} value={theoryExamInfo.document.documentNumber} />
                            <InfoRow icon={<User className="h-4 w-4" />} label={t("fullName")} value={`${theoryExamInfo.document.firstName} ${theoryExamInfo.document.lastName}`} />
                            <InfoRow icon={<Calendar className="h-4 w-4" />} label={t("dateOfBirth")} value={theoryExamInfo.document.dateOfBirth} />
                            <InfoRow icon={<MapPin className="h-4 w-4" />} label={t("placeOfBirth")} value={theoryExamInfo.document.placeOfBirth} />
                            <InfoRow icon={<User className="h-4 w-4" />} label={t("civilStatus")} value={theoryExamInfo.document.civilStatus} />
                            <InfoRow icon={<MapPin className="h-4 w-4" />} label={t("nationality")} value={theoryExamInfo.document.nationality} />
                            <InfoRow icon={<User className="h-4 w-4" />} label={t("sex")} value={theoryExamInfo.document.sex} />
                            <InfoRow icon={<UsersIcon className="h-4 w-4" />} label={t("fatherNames")} value={theoryExamInfo.document.fatherNames} />
                            <InfoRow icon={<UsersIcon className="h-4 w-4" />} label={t("motherNames")} value={theoryExamInfo.document.motherNames} />
                            <InfoRow icon={<Home className="h-4 w-4" />} label={t("province")} value={theoryExamInfo.document.province} />
                            <InfoRow icon={<Home className="h-4 w-4" />} label={t("district")} value={theoryExamInfo.document.district} />
                            <InfoRow icon={<Home className="h-4 w-4" />} label={t("sector")} value={theoryExamInfo.document.sector} />
                            <InfoRow icon={<Home className="h-4 w-4" />} label={t("cell")} value={theoryExamInfo.document.cell} />
                            <InfoRow icon={<Home className="h-4 w-4" />} label={t("village")} value={theoryExamInfo.document.village} />
                          </>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <EmptyState message={t("noData")} />
                  )}
                </SectionCard>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 border-b">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold text-base">{title}</h3>
        </div>
      </div>
      <CardContent className="p-5">
        {children}
      </CardContent>
    </Card>
  );
}

function ExamCodesSection({
  title,
  codes,
  results,
}: {
  title: string;
  codes: string[];
  results: Record<string, ExamResultDetails>;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        {title}
        <Badge variant="secondary" className="text-xs">
          {codes.length}
        </Badge>
      </h4>
      <div className="space-y-2">
        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            No codes
          </p>
        ) : (
          codes.map((code) => {
            const result = results[code];
            return (
              <div
                key={code}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium">{code}</span>
                </div>
                {result && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {result.examType}
                    </Badge>
                    {result.passed ? (
                      <Badge
                        variant="outline"
                        className="gap-1 text-green-600 border-green-600/20 text-xs"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {result.grade}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 text-red-600 border-red-600/20 text-xs"
                      >
                        <XCircle className="h-3 w-3" />
                        {result.grade}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {result.marksObtained}/{result.totalMarks}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-muted/20">
      <div className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xs sm:text-sm font-medium break-words mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-muted/30">
      <div className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-xs sm:text-sm font-medium break-words mt-0.5 ${mono ? "font-mono" : ""}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <AlertCircle className="h-7 w-7 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
