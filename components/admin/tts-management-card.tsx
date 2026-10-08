"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Upload,
  Mic,
  Square,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  FileAudio,
  Radio,
  BookOpen,
  HelpCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { uploadCourseFile, validateFile } from "@/lib/course-storage";
import {
  getTTSConfigAction,
  saveTTSConfigAction,
  saveImportedTTSAudioAction,
  listImportedTTSAudiosAction,
  deleteImportedTTSAudioAction,
} from "@/app/Admin/actions/tts";
import { getExamQuestions } from "@/lib/supabase/queries";
import type { TTSConfig, ImportedTTSAudioRecord } from "@/lib/tts-config";
import { DEFAULT_TTS_CONFIG } from "@/lib/tts-config";
import { clearTTSDisabledForSession, markTTSDisabledForSession } from "@/components/course/question-tts-button";
import type { ExamQuestion } from "@/lib/database.types";

export function TTSManagementCard() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"toggles" | "import" | "library">("toggles");

  // TTS Settings
  const [config, setConfig] = useState<TTSConfig>(DEFAULT_TTS_CONFIG);

  // Audio Import State
  const [entityType, setEntityType] = useState<"question" | "topic" | "custom">("question");
  const [selectedLanguage, setSelectedLanguage] = useState<"Kinyarwanda" | "English" | "French">("Kinyarwanda");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [customEntityId, setCustomEntityId] = useState<string>("");
  const [customEntityTitle, setCustomEntityTitle] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioInputMode, setAudioInputMode] = useState<"upload" | "url" | "record">("upload");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importingAudio, setImportingAudio] = useState(false);

  // Audio preview
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Questions bank for selector
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [questionSearch, setQuestionSearch] = useState("");

  // Library of imported audios
  const [importedAudios, setImportedAudios] = useState<ImportedTTSAudioRecord[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryFilterLang, setLibraryFilterLang] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Playing row in table
  const [playingRowId, setPlayingRowId] = useState<string | null>(null);
  const tableAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load config & initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [configRes, questionsRes, audiosRes] = await Promise.all([
          getTTSConfigAction(),
          getExamQuestions(),
          listImportedTTSAudiosAction(),
        ]);

        if (configRes.success && configRes.data) {
          setConfig(configRes.data);
        }
        if (questionsRes?.questions) {
          setQuestions(questionsRes.questions);
        }
        if (audiosRes.success && audiosRes.data) {
          setImportedAudios(audiosRes.data);
        }
      } catch (err: any) {
        console.error("Error loading TTS admin data:", err);
        toast.error("Failed to load TTS settings: " + (err.message || String(err)));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Save Settings
  const handleSaveConfig = async () => {
    try {
      setSavingSettings(true);
      const res = await saveTTSConfigAction(config);
      if (res.success) {
        if (config.masterEnabled && (config.examsEnabled || config.learningEnabled)) {
          clearTTSDisabledForSession();
        } else if (!config.masterEnabled) {
          markTTSDisabledForSession();
        }
        toast.success("TTS settings updated successfully");
      } else {
        toast.error(res.error || "Failed to update TTS settings");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Audio File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setUploadingAudio(true);
      setUploadProgress(0);
      const res = await uploadCourseFile(file, `tts-imports/${selectedLanguage.toLowerCase()}`, (p) => {
        setUploadProgress(p);
      });
      setAudioUrl(res.publicUrl);
      toast.success("Audio uploaded successfully!");
    } catch (err: any) {
      toast.error("Failed to upload audio: " + (err.message || String(err)));
    } finally {
      setUploadingAudio(false);
      if (e.target) e.target.value = "";
    }
  };

  // Microphone Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `recorded-${Date.now()}.webm`, { type: "audio/webm" });
        
        try {
          setUploadingAudio(true);
          const res = await uploadCourseFile(audioFile, `tts-imports/recordings/${selectedLanguage.toLowerCase()}`);
          setAudioUrl(res.publicUrl);
          toast.success("Voice recording saved and uploaded!");
        } catch (uploadErr: any) {
          toast.error("Failed to upload voice recording: " + uploadErr.message);
        } finally {
          setUploadingAudio(false);
        }

        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      toast.error("Could not access microphone: " + (err.message || String(err)));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  // Preview Audio Toggle
  const togglePreviewAudio = () => {
    if (!audioUrl) return;
    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(audioUrl);
      audioPreviewRef.current.onended = () => setIsPreviewPlaying(false);
    } else {
      audioPreviewRef.current.src = audioUrl;
    }

    if (isPreviewPlaying) {
      audioPreviewRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      audioPreviewRef.current.play().then(() => setIsPreviewPlaying(true)).catch(() => setIsPreviewPlaying(false));
    }
  };

  // Save imported audio as TTS
  const handleSaveImportedAudio = async () => {
    if (!audioUrl) {
      toast.error("Please provide or upload an audio file first");
      return;
    }

    let targetEntityId = "";
    let targetEntityTitle = "";

    if (entityType === "question") {
      if (!selectedQuestionId) {
        toast.error("Please select a question from the question bank");
        return;
      }
      const q = questions.find((item) => item.id === selectedQuestionId);
      targetEntityId = selectedQuestionId;
      targetEntityTitle = q?.question || `Question #${selectedQuestionId.slice(0, 8)}`;
    } else if (entityType === "topic") {
      if (!customEntityId) {
        toast.error("Please enter a Topic ID or Topic Title");
        return;
      }
      targetEntityId = customEntityId;
      targetEntityTitle = customEntityTitle || customEntityId;
    } else {
      if (!customEntityId) {
        toast.error("Please enter an Entity ID");
        return;
      }
      targetEntityId = customEntityId;
      targetEntityTitle = customEntityTitle || customEntityId;
    }

    try {
      setImportingAudio(true);
      const res = await saveImportedTTSAudioAction({
        entityId: targetEntityId,
        entityTitle: targetEntityTitle,
        entityType,
        language: selectedLanguage,
        audioUrl,
        notes: `Imported via Admin Studio for ${selectedLanguage}`,
      });

      if (res.success) {
        toast.success(`Audio imported as official ${selectedLanguage} TTS for "${targetEntityTitle.slice(0, 35)}..."`);
        setImportedAudios((prev) => [res.data, ...prev.filter((item) => item.id !== res.data.id)]);
        // Reset form
        setAudioUrl("");
        if (audioPreviewRef.current) {
          audioPreviewRef.current.pause();
          setIsPreviewPlaying(false);
        }
        setActiveSubTab("library");
      } else {
        toast.error(res.error || "Failed to save imported audio");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save imported audio");
    } finally {
      setImportingAudio(false);
    }
  };

  // Delete from Library
  const handleDeleteImportedAudio = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await deleteImportedTTSAudioAction(id);
      if (res.success) {
        setImportedAudios((prev) => prev.filter((item) => item.id !== id));
        toast.success("Imported audio removed");
        if (playingRowId === id && tableAudioRef.current) {
          tableAudioRef.current.pause();
          setPlayingRowId(null);
        }
      } else {
        toast.error(res.error || "Failed to delete audio");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete audio");
    } finally {
      setDeletingId(null);
    }
  };

  // Play table row audio
  const handlePlayRow = (record: ImportedTTSAudioRecord) => {
    if (playingRowId === record.id) {
      if (tableAudioRef.current) tableAudioRef.current.pause();
      setPlayingRowId(null);
      return;
    }

    if (!tableAudioRef.current) {
      tableAudioRef.current = new Audio();
    }
    tableAudioRef.current.src = record.audioUrl;
    tableAudioRef.current.onended = () => setPlayingRowId(null);
    tableAudioRef.current.play().then(() => setPlayingRowId(record.id)).catch(() => setPlayingRowId(null));
  };

  const filteredQuestions = questions.filter((q) =>
    (q.question || "").toLowerCase().includes(questionSearch.toLowerCase())
  );

  const filteredLibrary = importedAudios.filter((item) => {
    if (libraryFilterLang === "all") return true;
    return item.language.toLowerCase() === libraryFilterLang.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Sub tabs navigation */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("toggles")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "toggles"
              ? "bg-[var(--admin-accent)] text-white shadow-sm"
              : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
          }`}
        >
          <Volume2 className="h-4 w-4" />
          Language TTS Toggles
        </button>

        <button
          onClick={() => setActiveSubTab("import")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "import"
              ? "bg-[var(--admin-accent)] text-white shadow-sm"
              : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
          }`}
        >
          <Upload className="h-4 w-4" />
          Import Audio as TTS
        </button>

        <button
          onClick={() => setActiveSubTab("library")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "library"
              ? "bg-[var(--admin-accent)] text-white shadow-sm"
              : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
          }`}
        >
          <FileAudio className="h-4 w-4" />
          Imported Audio Library ({importedAudios.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: LANGUAGE TTS TOGGLES */}
      {/* ========================================================================= */}
      {activeSubTab === "toggles" && (
        <div className="space-y-6">
          {/* Master & Language Switches */}
          <Card className="border border-[var(--admin-border)] rounded-2xl bg-[var(--admin-card-bg)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-[var(--admin-text)]">
                    <Volume2 className="h-5 w-5 text-indigo-400" />
                    Text-to-Speech (TTS) Language Controls
                  </CardTitle>
                  <CardDescription className="text-xs text-[var(--admin-muted)] mt-1">
                    Toggle TTS voice narration on or off for specific languages across the application.
                  </CardDescription>
                </div>
                <Badge
                  variant={config.masterEnabled ? "default" : "secondary"}
                  className={config.masterEnabled ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-zinc-500/15 text-zinc-400"}
                >
                  {config.masterEnabled ? "TTS Master Active" : "TTS Disabled Globally"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Master Switch */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
                <div className="space-y-0.5 pr-4">
                  <Label htmlFor="master-tts" className="text-sm font-bold text-[var(--admin-text)]">
                    Master TTS Audio Switch
                  </Label>
                  <p className="text-xs text-[var(--admin-muted)]">
                    Enables or disables voice synthesis and audio playback buttons across all pages.
                  </p>
                </div>
                <Switch
                  id="master-tts"
                  checked={config.masterEnabled}
                  onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, masterEnabled: checked }))}
                />
              </div>

              {/* Individual Languages */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)] mb-3">
                  Per-Language Controls
                </h4>

                <div className="space-y-3">
                  {/* Kinyarwanda */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
                    <div className="space-y-0.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🇷🇼</span>
                        <Label htmlFor="tts-kinyarwanda" className="text-sm font-bold text-[var(--admin-text)]">
                          Kinyarwanda TTS
                        </Label>
                        <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                          Prioritizes Human Recordings
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--admin-muted)]">
                        Enable or disable voice narration for Kinyarwanda driving exam questions and lessons. When enabled, imported human audio is played first, followed by tuned AI voice.
                      </p>
                    </div>
                    <Switch
                      id="tts-kinyarwanda"
                      disabled={!config.masterEnabled}
                      checked={config.kinyarwandaEnabled}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, kinyarwandaEnabled: checked }))
                      }
                    />
                  </div>

                  {/* English */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
                    <div className="space-y-0.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🇬🇧</span>
                        <Label htmlFor="tts-english" className="text-sm font-bold text-[var(--admin-text)]">
                          English TTS
                        </Label>
                      </div>
                      <p className="text-xs text-[var(--admin-muted)]">
                        Enable or disable English audio reading for lessons, questions, and traffic definitions.
                      </p>
                    </div>
                    <Switch
                      id="tts-english"
                      disabled={!config.masterEnabled}
                      checked={config.englishEnabled}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, englishEnabled: checked }))
                      }
                    />
                  </div>

                  {/* French */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
                    <div className="space-y-0.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🇫🇷</span>
                        <Label htmlFor="tts-french" className="text-sm font-bold text-[var(--admin-text)]">
                          French TTS (Français)
                        </Label>
                      </div>
                      <p className="text-xs text-[var(--admin-muted)]">
                        Enable or disable French audio reading for French curriculum questions and modules.
                      </p>
                    </div>
                    <Switch
                      id="tts-french"
                      disabled={!config.masterEnabled}
                      checked={config.frenchEnabled}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, frenchEnabled: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Scopes & Priorities */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)] mb-3">
                  Scope & Playback Strategy
                </h4>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
                    <div className="space-y-0.5 pr-2">
                      <Label htmlFor="tts-learning" className="text-xs font-bold text-[var(--admin-text)] flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                        Learning Content & Lessons
                      </Label>
                      <p className="text-[11px] text-[var(--admin-muted)]">
                        Allow audio narration inside course topics and study guides.
                      </p>
                    </div>
                    <Switch
                      id="tts-learning"
                      disabled={!config.masterEnabled}
                      checked={config.learningEnabled}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, learningEnabled: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
                    <div className="space-y-0.5 pr-2">
                      <Label htmlFor="tts-exams" className="text-xs font-bold text-[var(--admin-text)] flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
                        Exams & Practice Tests
                      </Label>
                      <p className="text-[11px] text-[var(--admin-muted)]">
                        Show play button beside exam questions and answer choices.
                      </p>
                    </div>
                    <Switch
                      id="tts-exams"
                      disabled={!config.masterEnabled}
                      checked={config.examsEnabled}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, examsEnabled: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                  <div className="space-y-0.5 pr-3">
                    <Label htmlFor="tts-prefer-imported" className="text-xs font-bold text-[var(--admin-text)] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      Prioritize Imported Audio Files
                    </Label>
                    <p className="text-[11px] text-[var(--admin-muted)]">
                      When an instructor imports or uploads a recorded audio track, always use that authentic audio file instead of synthesizing with AI.
                    </p>
                  </div>
                  <Switch
                    id="tts-prefer-imported"
                    checked={config.preferImportedAudio}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, preferImportedAudio: checked }))
                    }
                  />
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSaveConfig}
                  disabled={savingSettings}
                  className="bg-[var(--admin-accent)] hover:opacity-90 text-white font-bold px-6"
                >
                  {savingSettings ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving Settings...
                    </>
                  ) : (
                    "Save TTS Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: IMPORT AUDIO AS TTS STUDIO */}
      {/* ========================================================================= */}
      {activeSubTab === "import" && (
        <Card className="border border-[var(--admin-border)] rounded-2xl bg-[var(--admin-card-bg)]">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-[var(--admin-text)]">
              <Upload className="h-5 w-5 text-indigo-400" />
              Import Audio as TTS Narration
            </CardTitle>
            <CardDescription className="text-xs text-[var(--admin-muted)]">
              Attach a native human recording or high-definition audio clip to any exam question or topic. Students will hear this authentic audio whenever they click play.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Target Entity */}
            <div className="p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)] space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">1</span>
                Select What This Audio Is For
              </h4>

              <div className="grid sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEntityType("question")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    entityType === "question"
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                  }`}
                >
                  <HelpCircle className="h-4 w-4 mb-1 text-indigo-400" />
                  <div className="text-xs font-bold">Exam Question</div>
                  <div className="text-[10px] opacity-75">Attach to a question bank item</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEntityType("topic")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    entityType === "topic"
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                  }`}
                >
                  <BookOpen className="h-4 w-4 mb-1 text-indigo-400" />
                  <div className="text-xs font-bold">Course Topic / Note</div>
                  <div className="text-[10px] opacity-75">Attach to a curriculum lesson</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEntityType("custom")}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    entityType === "custom"
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                  }`}
                >
                  <Layers className="h-4 w-4 mb-1 text-indigo-400" />
                  <div className="text-xs font-bold">Custom Entity Key</div>
                  <div className="text-[10px] opacity-75">Attach via direct key / ID</div>
                </button>
              </div>

              {/* If Question is selected */}
              {entityType === "question" && (
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-[var(--admin-text)]">
                    Choose Question from Question Bank ({questions.length} total):
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="h-4 w-4 absolute left-3 top-3 text-[var(--admin-muted)]" />
                      <Input
                        placeholder="Search question text to find target..."
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        className="pl-9 text-xs bg-[var(--admin-card-bg)] border-[var(--admin-border)]"
                      />
                    </div>
                  </div>

                  <Select value={selectedQuestionId} onValueChange={setSelectedQuestionId}>
                    <SelectTrigger className="text-xs bg-[var(--admin-card-bg)] border-[var(--admin-border)]">
                      <SelectValue placeholder="Select a question to attach audio..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {filteredQuestions.slice(0, 50).map((q, idx) => (
                        <SelectItem key={q.id} value={q.id} className="text-xs">
                          {idx + 1}. {(q.question || "Untitled Question").slice(0, 80)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedQuestionId && (
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-[var(--admin-text)]">
                      <span className="font-bold text-indigo-400">Selected Question: </span>
                      {questions.find((q) => q.id === selectedQuestionId)?.question}
                    </div>
                  )}
                </div>
              )}

              {/* If Topic or Custom */}
              {entityType !== "question" && (
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-[var(--admin-text)]">Target Entity ID</Label>
                    <Input
                      placeholder="e.g. topic-road-signs-1 or lesson-12"
                      value={customEntityId}
                      onChange={(e) => setCustomEntityId(e.target.value)}
                      className="text-xs bg-[var(--admin-card-bg)] border-[var(--admin-border)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-[var(--admin-text)]">Title / Label</Label>
                    <Input
                      placeholder="e.g. Mandatory Road Signs Narration"
                      value={customEntityTitle}
                      onChange={(e) => setCustomEntityTitle(e.target.value)}
                      className="text-xs bg-[var(--admin-card-bg)] border-[var(--admin-border)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Target Language */}
            <div className="p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">2</span>
                Target Language for this Audio
              </h4>

              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { lang: "Kinyarwanda", flag: "🇷🇼", desc: "Native Rwandan driving narration" },
                  { lang: "English", flag: "🇬🇧", desc: "Official English audio track" },
                  { lang: "French", flag: "🇫🇷", desc: "Code de la route en français" },
                ].map((item) => (
                  <button
                    key={item.lang}
                    type="button"
                    onClick={() => setSelectedLanguage(item.lang as any)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedLanguage === item.lang
                        ? "border-indigo-500 bg-indigo-500/10 text-white"
                        : "border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <span>{item.flag}</span>
                      <span>{item.lang}</span>
                    </div>
                    <div className="text-[10px] mt-1 opacity-75">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Provide Audio File */}
            <div className="p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)] space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">3</span>
                Upload, Record, or Link Audio
              </h4>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAudioInputMode("upload")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    audioInputMode === "upload"
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                  }`}
                >
                  <Upload className="h-3 w-3 inline mr-1" /> Upload Audio File
                </button>

                <button
                  type="button"
                  onClick={() => setAudioInputMode("record")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    audioInputMode === "record"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                  }`}
                >
                  <Mic className="h-3 w-3 inline mr-1" /> Record Microphone
                </button>

                <button
                  type="button"
                  onClick={() => setAudioInputMode("url")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    audioInputMode === "url"
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                  }`}
                >
                  <Radio className="h-3 w-3 inline mr-1" /> Direct URL Link
                </button>
              </div>

              {/* Upload Mode */}
              {audioInputMode === "upload" && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-[var(--admin-border)] hover:border-indigo-500/50 rounded-xl p-6 text-center transition-colors">
                    <FileAudio className="h-8 w-8 mx-auto text-indigo-400 mb-2 opacity-80" />
                    <p className="text-xs font-bold text-[var(--admin-text)]">
                      Drop audio file here or click to browse
                    </p>
                    <p className="text-[11px] text-[var(--admin-muted)] mt-1">
                      Supports MP3, WAV, M4A, OGG, AAC (Max 50MB)
                    </p>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      disabled={uploadingAudio}
                      className="hidden"
                      id="tts-audio-file-input"
                    />
                    <label
                      htmlFor="tts-audio-file-input"
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--admin-accent)] hover:opacity-90 text-white cursor-pointer"
                    >
                      {uploadingAudio ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Uploading ({uploadProgress}%)...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" /> Choose Audio File
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Record Mode */}
              {audioInputMode === "record" && (
                <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center space-y-3">
                  <div className="text-xs text-[var(--admin-muted)]">
                    Record voiceover directly from your microphone in {selectedLanguage}:
                  </div>
                  <div className="text-xl font-mono font-bold text-rose-400">
                    {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")}
                  </div>

                  {!isRecording ? (
                    <Button
                      type="button"
                      onClick={startRecording}
                      disabled={uploadingAudio}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold gap-2"
                    >
                      <Mic className="h-4 w-4" /> Start Microphone Recording
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={stopRecording}
                      className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold gap-2 animate-pulse"
                    >
                      <Square className="h-4 w-4" /> Stop & Save Audio
                    </Button>
                  )}
                </div>
              )}

              {/* URL Mode */}
              {audioInputMode === "url" && (
                <div className="space-y-2">
                  <Label className="text-xs text-[var(--admin-muted)]">Hosted Audio URL</Label>
                  <Input
                    placeholder="https://example.com/audio/kinyarwanda-q1.mp3"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    className="text-xs bg-[var(--admin-card-bg)] border-[var(--admin-border)]"
                  />
                </div>
              )}

              {/* Audio Preview Card */}
              {audioUrl && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={togglePreviewAudio}
                      className="h-9 w-9 rounded-full bg-emerald-500 text-white border-0 hover:bg-emerald-600"
                    >
                      {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                    </Button>
                    <div>
                      <div className="text-xs font-bold text-[var(--admin-text)] flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        Audio Ready for Import ({selectedLanguage})
                      </div>
                      <div className="text-[11px] text-[var(--admin-muted)] truncate max-w-sm">
                        {audioUrl.slice(0, 50)}...
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAudioUrl("");
                      if (audioPreviewRef.current) {
                        audioPreviewRef.current.pause();
                        setIsPreviewPlaying(false);
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {/* Save & Bind as TTS Button */}
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={handleSaveImportedAudio}
                disabled={!audioUrl || importingAudio}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 gap-2"
              >
                {importingAudio ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Saving Audio as TTS...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Save as Official {selectedLanguage} TTS
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: IMPORTED AUDIO LIBRARY */}
      {/* ========================================================================= */}
      {activeSubTab === "library" && (
        <Card className="border border-[var(--admin-border)] rounded-2xl bg-[var(--admin-card-bg)]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-[var(--admin-text)]">
                  <FileAudio className="h-5 w-5 text-indigo-400" />
                  Imported TTS Audio Library
                </CardTitle>
                <CardDescription className="text-xs text-[var(--admin-muted)]">
                  All audio tracks currently overriding or serving as official voice narration in the system.
                </CardDescription>
              </div>

              {/* Filter by language */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--admin-muted)]">Filter:</span>
                <Select value={libraryFilterLang} onValueChange={setLibraryFilterLang}>
                  <SelectTrigger className="h-8 text-xs w-36 bg-[var(--admin-input-bg)] border-[var(--admin-border)]">
                    <SelectValue placeholder="All Languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="kinyarwanda">🇷🇼 Kinyarwanda</SelectItem>
                    <SelectItem value="english">🇬🇧 English</SelectItem>
                    <SelectItem value="french">🇫🇷 French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredLibrary.length === 0 ? (
              <div className="py-12 text-center border border-[var(--admin-border)] rounded-xl bg-[var(--admin-input-bg)]">
                <FileAudio className="h-10 w-10 mx-auto text-[var(--admin-muted)] opacity-50 mb-2" />
                <p className="text-sm font-semibold text-[var(--admin-text)]">No imported TTS tracks found</p>
                <p className="text-xs text-[var(--admin-muted)] mt-1">
                  Click on "Import Audio as TTS" to attach recordings for Kinyarwanda, English, or French.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSubTab("import")}
                  className="mt-4 text-xs font-bold"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Import First Audio Track
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--admin-border)] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[var(--admin-border)] hover:bg-transparent">
                      <TableHead className="text-xs font-bold">Target Entity</TableHead>
                      <TableHead className="text-xs font-bold">Language</TableHead>
                      <TableHead className="text-xs font-bold">Listen / Preview</TableHead>
                      <TableHead className="text-xs font-bold">Imported On</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLibrary.map((record) => {
                      const isPlaying = playingRowId === record.id;
                      return (
                        <TableRow key={record.id} className="border-b border-[var(--admin-border)]">
                          <TableCell className="py-3">
                            <div className="font-bold text-xs text-[var(--admin-text)] line-clamp-1">
                              {record.entityTitle}
                            </div>
                            <div className="text-[10px] text-[var(--admin-muted)] flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-[var(--admin-border)]">
                                {record.entityType}
                              </Badge>
                              <span>ID: {record.entityId.slice(0, 16)}...</span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                record.language.toLowerCase().includes("kinya")
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 text-[11px]"
                                  : record.language.toLowerCase().includes("fren")
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/30 text-[11px]"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px]"
                              }
                            >
                              {record.language.toLowerCase().includes("kinya")
                                ? "🇷🇼 Kinyarwanda"
                                : record.language.toLowerCase().includes("fren")
                                ? "🇫🇷 French"
                                : "🇬🇧 English"}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handlePlayRow(record)}
                              className={`h-8 gap-1.5 text-xs font-bold rounded-lg ${
                                isPlaying
                                  ? "bg-emerald-500 text-white border-emerald-500"
                                  : "border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                              }`}
                            >
                              {isPlaying ? (
                                <>
                                  <Pause className="h-3 w-3" /> Stop
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3 fill-current" /> Play Audio
                                </>
                              )}
                            </Button>
                          </TableCell>

                          <TableCell className="text-xs text-[var(--admin-muted)]">
                            {new Date(record.importedAt).toLocaleDateString()}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={deletingId === record.id}
                              onClick={() => handleDeleteImportedAudio(record.id)}
                              className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                              title="Delete imported audio"
                            >
                              {deletingId === record.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
