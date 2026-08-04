"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
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

type InfoTab = "exams" | "permit" | "userinfo";

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
  const [activeTab, setActiveTab] = useState<InfoTab>("exams");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [examResults, setExamResults] = useState<Record<string, ExamResultDetails>>({});
  const [examCodes, setExamCodes] = useState<{ practical: string[]; theory: string[] }>({
    practical: [],
    theory: [],
  });
  const [dlInfo, setDlInfo] = useState<DLInfoAPIResponse | null>(null);
  const [theoryExamInfo, setTheoryExamInfo] = useState<TheoryExamDLInfoAPIResponse | null>(null);
  const [fetchedTabs, setFetchedTabs] = useState<Set<InfoTab>>(new Set());

  const open = Boolean(user);

  const fetchData = useCallback(
    async (tab: InfoTab) => {
      if (!user?.national_id) return;
      if (fetchedTabs.has(tab)) return;

      setLoading(true);
      setError(null);

      try {
        if (tab === "exams") {
          const cacheKey = ADMIN_EXAM_CACHE + user.national_id;
          const cached = getCache<CheckMarksResponse>(cacheKey);
          if (cached) {
            if (cached.status === "success") {
              setExamResults(cached.results || {});
              setExamCodes({
                practical: cached.practical_codes || [],
                theory: cached.theory_codes || [],
              });
            } else {
              setError(cached.message || t("fetchInfoError"));
            }
            setFetchedTabs((prev) => new Set(prev).add(tab));
            return;
          }

          const res = await fetch("/api/check-marks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ national_id: user.national_id }),
          });
          const data: CheckMarksResponse = await res.json();
          setCache(cacheKey, data);
          if (data.status === "success") {
            setExamResults(data.results || {});
            setExamCodes({
              practical: data.practical_codes || [],
              theory: data.theory_codes || [],
            });
          } else {
            setError(data.message || t("fetchInfoError"));
          }
        } else {
          const dlCacheKey = ADMIN_DL_CACHE + user.national_id;
          const theoryCacheKey = ADMIN_THEORY_CACHE + user.national_id;
          const cachedDl = getCache<DLInfoAPIResponse>(dlCacheKey);
          const cachedTheory = getCache<TheoryExamDLInfoAPIResponse>(theoryCacheKey);

          if (cachedDl) {
            setDlInfo(cachedDl);
            setFetchedTabs((prev) => new Set(prev).add(tab));
            return;
          }
          if (cachedTheory) {
            setTheoryExamInfo(cachedTheory);
            setFetchedTabs((prev) => new Set(prev).add(tab));
            return;
          }

          const res = await fetch("/api/dl-info?full=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ national_id: user.national_id }),
          });
          const data: DLInfoAPIResponse = await res.json();
          if (data.status === "success") {
            setDlInfo(data);
            setCache(dlCacheKey, data);
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
            } else {
              setError(data.message || t("fetchInfoError"));
            }
          }
        }
        setFetchedTabs((prev) => new Set(prev).add(tab));
      } catch {
        setError(t("fetchInfoError"));
      } finally {
        setLoading(false);
      }
    },
    [user, fetchedTabs, t]
  );

  const handleTabChange = (tab: string) => {
    const infoTab = tab as InfoTab;
    setActiveTab(infoTab);
    setError(null);
    fetchData(infoTab);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setExamResults({});
      setExamCodes({ practical: [], theory: [] });
      setDlInfo(null);
      setTheoryExamInfo(null);
      setFetchedTabs(new Set());
      setError(null);
      setActiveTab("exams");
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-xl">
            <IdCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="truncate">{user.full_name || user.username || user.email}</span>
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono">
            {user.national_id}
          </p>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-4 sm:px-6">
            <TabsList className="w-full justify-start rounded-xl h-auto flex-wrap p-1 gap-1">
              <TabsTrigger value="exams" className="gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm">
                <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{t("exams")}</span>
              </TabsTrigger>
              <TabsTrigger value="permit" className="gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{t("permitInfo")}</span>
              </TabsTrigger>
              <TabsTrigger value="userinfo" className="gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{t("userInfo")}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-4 sm:px-6 pb-4 sm:pb-6">
            {loading && (
              <div className="flex items-center justify-center py-12 sm:py-16 text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mr-2" />
                {t("fetchingInfo")}
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground">
                <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 mb-2 text-destructive" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                {/* Exams Tab */}
                <TabsContent value="exams" className="mt-4 space-y-3 sm:space-y-4">
                  {examCodes.practical.length === 0 &&
                  examCodes.theory.length === 0 ? (
                    <EmptyState message={t("liveExamNoCodes")} />
                  ) : (
                    <>
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
                    </>
                  )}
                </TabsContent>

                {/* Permit Info Tab */}
                <TabsContent value="permit" className="mt-4 space-y-3 sm:space-y-4">
                  {!dlInfo?.license && !theoryExamInfo ? (
                    <EmptyState message={t("noData")} />
                  ) : !dlInfo?.license && theoryExamInfo ? (
                    <>
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
                          <Card>
                            <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 border-b">
                              <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-primary" />
                                <h3 className="font-bold text-base">
                                  {t("allowedCategories")}
                                </h3>
                              </div>
                            </div>
                            <CardContent className="p-5">
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
                            </CardContent>
                          </Card>
                        )}
                    </>
                  ) : (
                    <>
                      <Card className="overflow-hidden">
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 border-b">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <h3 className="font-bold text-base">
                              {t("permitInfo")}
                            </h3>
                          </div>
                        </div>
                        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        </CardContent>
                      </Card>

                      {/* Allowed Categories */}
                      <Card>
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-primary" />
                              <h3 className="font-bold text-base">
                                {t("allowedCategories")}
                              </h3>
                            </div>
                            <Badge variant="default" className="text-sm">
                              {dlInfo?.categoryCount} {t("categoryCount")}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-5">
                          {dlInfo?.categoriesAllowed &&
                          dlInfo.categoriesAllowed.length > 0 ? (
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
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              {t("noData")}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>

                {/* User Info Tab */}
                <TabsContent value="userinfo" className="mt-4 space-y-3 sm:space-y-4">
                  {!dlInfo?.document && !theoryExamInfo?.document ? (
                    <EmptyState message={t("noData")} />
                  ) : !dlInfo?.document && theoryExamInfo?.document ? (
                    <>
                      {/* Photo & Signature */}
                      <div className="flex gap-4 flex-wrap">
                        {theoryExamInfo.document.photo && (
                          <Card className="flex-1 min-w-[200px]">
                            <CardContent className="p-4 flex flex-col items-center gap-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                {t("photo")}
                              </p>
                              <img
                                src={`data:image/jpeg;base64,${theoryExamInfo.document.photo}`}
                                alt={`${theoryExamInfo.document.firstName} ${theoryExamInfo.document.lastName}`}
                                className="rounded-lg border h-40 w-32 object-cover"
                              />
                            </CardContent>
                          </Card>
                        )}
                        {theoryExamInfo.document.signature && (
                          <Card className="flex-1 min-w-[200px]">
                            <CardContent className="p-4 flex flex-col items-center gap-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                {t("signature")}
                              </p>
                              <img
                                src={`data:image/jpeg;base64,${theoryExamInfo.document.signature}`}
                                alt="Signature"
                                className="rounded-lg border h-40 w-32 object-contain bg-white"
                              />
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Document Details */}
                      <Card>
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 border-b">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            <h3 className="font-bold text-base">
                              {t("userInfo")}
                            </h3>
                          </div>
                        </div>
                        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <InfoRow
                            icon={<FileText className="h-4 w-4" />}
                            label={t("documentNumber")}
                            value={theoryExamInfo.document.documentNumber}
                          />
                          <InfoRow
                            icon={<User className="h-4 w-4" />}
                            label={t("fullName")}
                            value={`${theoryExamInfo.document.firstName} ${theoryExamInfo.document.lastName}`}
                          />
                          <InfoRow
                            icon={<Calendar className="h-4 w-4" />}
                            label={t("dateOfBirth")}
                            value={theoryExamInfo.document.dateOfBirth}
                          />
                          <InfoRow
                            icon={<MapPin className="h-4 w-4" />}
                            label={t("placeOfBirth")}
                            value={theoryExamInfo.document.placeOfBirth}
                          />
                          <InfoRow
                            icon={<User className="h-4 w-4" />}
                            label={t("civilStatus")}
                            value={theoryExamInfo.document.civilStatus}
                          />
                          <InfoRow
                            icon={<MapPin className="h-4 w-4" />}
                            label={t("nationality")}
                            value={theoryExamInfo.document.nationality}
                          />
                          <InfoRow
                            icon={<User className="h-4 w-4" />}
                            label={t("sex")}
                            value={theoryExamInfo.document.sex}
                          />
                          <InfoRow
                            icon={<UsersIcon className="h-4 w-4" />}
                            label={t("fatherNames")}
                            value={theoryExamInfo.document.fatherNames}
                          />
                          <InfoRow
                            icon={<UsersIcon className="h-4 w-4" />}
                            label={t("motherNames")}
                            value={theoryExamInfo.document.motherNames}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("province")}
                            value={theoryExamInfo.document.province}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("district")}
                            value={theoryExamInfo.document.district}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("sector")}
                            value={theoryExamInfo.document.sector}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("cell")}
                            value={theoryExamInfo.document.cell}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("village")}
                            value={theoryExamInfo.document.village}
                          />
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <>
                      {/* Photo & Signature */}
                      <div className="flex gap-4 flex-wrap">
                        {dlInfo?.document?.photo && (
                          <Card className="flex-1 min-w-[200px]">
                            <CardContent className="p-4 flex flex-col items-center gap-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                {t("photo")}
                              </p>
                              <img
                                src={`data:image/jpeg;base64,${dlInfo.document.photo}`}
                                alt={dlInfo?.document?.names}
                                className="rounded-lg border h-40 w-32 object-cover"
                              />
                            </CardContent>
                          </Card>
                        )}
                        {dlInfo?.document?.signature && (
                          <Card className="flex-1 min-w-[200px]">
                            <CardContent className="p-4 flex flex-col items-center gap-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                {t("signature")}
                              </p>
                              <img
                                src={`data:image/jpeg;base64,${dlInfo?.document?.signature}`}
                                alt="Signature"
                                className="rounded-lg border h-40 w-32 object-contain bg-white"
                              />
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Document Details */}
                      <Card>
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 border-b">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            <h3 className="font-bold text-base">
                              {t("userInfo")}
                            </h3>
                          </div>
                        </div>
                        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <InfoRow
                            icon={<FileText className="h-4 w-4" />}
                            label={t("documentNumber")}
                            value={dlInfo?.document?.documentNumber}
                          />
                          <InfoRow
                            icon={<User className="h-4 w-4" />}
                            label={t("fullName")}
                            value={dlInfo?.document?.names}
                          />
                          <InfoRow
                            icon={<Calendar className="h-4 w-4" />}
                            label={t("dateOfBirth")}
                            value={dlInfo?.document?.dateOfBirth}
                          />
                          <InfoRow
                            icon={<MapPin className="h-4 w-4" />}
                            label={t("placeOfBirth")}
                            value={dlInfo?.document?.placeOfBirth}
                          />
                          <InfoRow
                            icon={<User className="h-4 w-4" />}
                            label={t("civilStatus")}
                            value={dlInfo?.document?.civilStatus}
                          />
                          <InfoRow
                            icon={<MapPin className="h-4 w-4" />}
                            label={t("nationality")}
                            value={dlInfo?.document?.nationality}
                          />
                          <InfoRow
                            icon={<User className="h-4 w-4" />}
                            label={t("sex")}
                            value={dlInfo?.document?.sex}
                          />
                          <InfoRow
                            icon={<UsersIcon className="h-4 w-4" />}
                            label={t("fatherNames")}
                            value={dlInfo?.document?.fatherNames}
                          />
                          <InfoRow
                            icon={<UsersIcon className="h-4 w-4" />}
                            label={t("motherNames")}
                            value={dlInfo?.document?.motherNames}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("province")}
                            value={dlInfo?.document?.province}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("district")}
                            value={dlInfo?.document?.district}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("sector")}
                            value={dlInfo?.document?.sector}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("cell")}
                            value={dlInfo?.document?.cell}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("village")}
                            value={dlInfo?.document?.village}
                          />
                          <InfoRow
                            icon={<Calendar className="h-4 w-4" />}
                            label={t("dateOfIssue")}
                            value={dlInfo?.document?.dateOfIssue}
                          />
                          <InfoRow
                            icon={<Calendar className="h-4 w-4" />}
                            label={t("dateOfExpiry")}
                            value={dlInfo?.document?.dateOfExpiry}
                          />
                          <InfoRow
                            icon={<MapPin className="h-4 w-4" />}
                            label={t("placeOfIssue")}
                            value={dlInfo?.document?.placeOfIssue}
                          />
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
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
    <Card>
      <div className="px-5 py-3 border-b bg-muted/30">
        <h3 className="font-bold text-sm flex items-center gap-2">
          {title}
          <Badge variant="secondary" className="text-xs">
            {codes.length}
          </Badge>
        </h3>
      </div>
      <CardContent className="p-4 space-y-2">
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
      </CardContent>
    </Card>
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground">
      <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
