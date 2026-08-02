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
} from "@/lib/live-exam/types";

interface UserInfoDetailDialogProps {
  user: UserWithStatus | null;
  onClose: () => void;
}

type InfoTab = "exams" | "permit" | "userinfo";

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
          const res = await fetch("/api/check-marks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ national_id: user.national_id }),
          });
          const data: CheckMarksResponse = await res.json();
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
          const res = await fetch("/api/dl-info?full=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ national_id: user.national_id }),
          });
          const data: DLInfoAPIResponse = await res.json();
          if (data.status === "success") {
            setDlInfo(data);
          } else {
            setError(data.message || t("fetchInfoError"));
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
      setFetchedTabs(new Set());
      setError(null);
      setActiveTab("exams");
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <IdCard className="h-5 w-5 text-primary" />
            {user.full_name || user.username || user.email}
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-mono">
            {user.national_id}
          </p>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6">
            <TabsList className="w-full justify-start rounded-xl h-auto flex-wrap p-1 gap-1">
              <TabsTrigger value="exams" className="gap-1.5 rounded-lg">
                <Car className="h-4 w-4" />
                <span>{t("exams")}</span>
              </TabsTrigger>
              <TabsTrigger value="permit" className="gap-1.5 rounded-lg">
                <FileText className="h-4 w-4" />
                <span>{t("permitInfo")}</span>
              </TabsTrigger>
              <TabsTrigger value="userinfo" className="gap-1.5 rounded-lg">
                <User className="h-4 w-4" />
                <span>{t("userInfo")}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 pb-6">
            {loading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                {t("fetchingInfo")}
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                {/* Exams Tab */}
                <TabsContent value="exams" className="mt-4 space-y-4">
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
                <TabsContent value="permit" className="mt-4 space-y-4">
                  {!dlInfo?.license ? (
                    <EmptyState message={t("noData")} />
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
                            value={dlInfo.license.licenseNumber}
                          />
                          <InfoRow
                            icon={<CheckCircle className="h-4 w-4" />}
                            label={t("licenseStatus")}
                            value={dlInfo.license.status}
                          />
                          <InfoRow
                            icon={<Car className="h-4 w-4" />}
                            label={t("vehicleClass")}
                            value={dlInfo.license.vehicleClass}
                          />
                          <InfoRow
                            icon={<Calendar className="h-4 w-4" />}
                            label={t("expiryDate")}
                            value={dlInfo.license.expiryDate}
                          />
                          <InfoRow
                            icon={<MapPin className="h-4 w-4" />}
                            label={t("placeOfIssue")}
                            value={dlInfo.license.placeOfIssue}
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
                              {dlInfo.categoryCount} {t("categoryCount")}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-5">
                          {dlInfo.categoriesAllowed &&
                          dlInfo.categoriesAllowed.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {dlInfo.categoriesAllowed.map((cat, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                                    {cat.category.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm">
                                      {cat.category.charAt(0).toUpperCase()}
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
                <TabsContent value="userinfo" className="mt-4 space-y-4">
                  {!dlInfo?.document ? (
                    <EmptyState message={t("noData")} />
                  ) : (
                    <>
                      {/* Photo & Signature */}
                      <div className="flex gap-4 flex-wrap">
                        {dlInfo.document.photo && (
                          <Card className="flex-1 min-w-[200px]">
                            <CardContent className="p-4 flex flex-col items-center gap-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                {t("photo")}
                              </p>
                              <img
                                src={`data:image/jpeg;base64,${dlInfo.document.photo}`}
                                alt={dlInfo.document.names}
                                className="rounded-lg border h-40 w-32 object-cover"
                              />
                            </CardContent>
                          </Card>
                        )}
                        {dlInfo.document.signature && (
                          <Card className="flex-1 min-w-[200px]">
                            <CardContent className="p-4 flex flex-col items-center gap-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                {t("signature")}
                              </p>
                              <img
                                src={`data:image/jpeg;base64,${dlInfo.document.signature}`}
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
                            value={dlInfo.document.documentNumber}
                          />
                          <InfoRow
                            icon={<User className="h-4 w-4" />}
                            label={t("fullName")}
                            value={dlInfo.document.names}
                          />
                          <InfoRow
                            icon={<Calendar className="h-4 w-4" />}
                            label={t("dateOfBirth")}
                            value={dlInfo.document.dateOfBirth}
                          />
                          <InfoRow
                            icon={<MapPin className="h-4 w-4" />}
                            label={t("placeOfBirth")}
                            value={dlInfo.document.placeOfBirth}
                          />
                          <InfoRow
                            icon={<User className="h-4 w-4" />}
                            label={t("civilStatus")}
                            value={dlInfo.document.civilStatus}
                          />
                          <InfoRow
                            icon={<MapPin className="h-4 w-4" />}
                            label={t("nationality")}
                            value={dlInfo.document.nationality}
                          />
                          <InfoRow
                            icon={<User className="h-4 w-4" />}
                            label={t("sex")}
                            value={dlInfo.document.sex}
                          />
                          <InfoRow
                            icon={<UsersIcon className="h-4 w-4" />}
                            label={t("fatherNames")}
                            value={dlInfo.document.fatherNames}
                          />
                          <InfoRow
                            icon={<UsersIcon className="h-4 w-4" />}
                            label={t("motherNames")}
                            value={dlInfo.document.motherNames}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("province")}
                            value={dlInfo.document.province}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("district")}
                            value={dlInfo.document.district}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("sector")}
                            value={dlInfo.document.sector}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("cell")}
                            value={dlInfo.document.cell}
                          />
                          <InfoRow
                            icon={<Home className="h-4 w-4" />}
                            label={t("village")}
                            value={dlInfo.document.village}
                          />
                          <InfoRow
                            icon={<Calendar className="h-4 w-4" />}
                            label={t("dateOfIssue")}
                            value={dlInfo.document.dateOfIssue}
                          />
                          <InfoRow
                            icon={<Calendar className="h-4 w-4" />}
                            label={t("dateOfExpiry")}
                            value={dlInfo.document.dateOfExpiry}
                          />
                          <InfoRow
                            icon={<MapPin className="h-4 w-4" />}
                            label={t("placeOfIssue")}
                            value={dlInfo.document.placeOfIssue}
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
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-medium break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
