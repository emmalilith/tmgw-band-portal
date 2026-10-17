import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { type ImportedSchedule, parseScheduleImageText } from "@/lib/scheduleImageImport";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ImageUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const typeConfig = {
  practice: { label: "🎵 練習", color: "bg-violet-500", dot: "bg-violet-500" },
  event: { label: "🎉 イベント", color: "bg-pink-500", dot: "bg-pink-500" },
  lesson: { label: "🎓 レッスン", color: "bg-amber-500", dot: "bg-amber-500" },
  concert: { label: "🎺 演奏会", color: "bg-red-500", dot: "bg-red-500" },
  holiday: { label: "🌴 休日", color: "bg-slate-400", dot: "bg-slate-400" },
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function MonthlySchedule() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "section_leader";
  const utils = trpc.useUtils();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imageImportOpen, setImageImportOpen] = useState(false);
  const [importMonth, setImportMonth] = useState(format(new Date(), "yyyy-MM"));
  const [importRows, setImportRows] = useState<ImportedSchedule[]>([]);
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrRawText, setOcrRawText] = useState("");
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduleDate: "",
    startTime: "",
    endTime: "",
    location: "",
    type: "practice" as keyof typeof typeConfig,
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: schedules } = trpc.schedules.byMonth.useQuery({ year, month });

  const createMutation = trpc.schedules.create.useMutation({
    onSuccess: () => { utils.schedules.byMonth.invalidate(); toast.success("スケジュールを追加しました"); setDialogOpen(false); },
    onError: () => toast.error("追加に失敗しました"),
  });
  const deleteMutation = trpc.schedules.delete.useMutation({
    onSuccess: () => { utils.schedules.byMonth.invalidate(); toast.success("削除しました"); },
    onError: () => toast.error("削除に失敗しました"),
  });
  const updateMutation = trpc.schedules.update.useMutation({
    onSuccess: () => {
      utils.schedules.byMonth.invalidate();
      utils.schedules.byWeek.invalidate();
      toast.success("スケジュールを更新しました");
      setDialogOpen(false);
      setEditingId(null);
    },
    onError: (error) => toast.error(error.message || "更新に失敗しました"),
  });
  const importMutation = trpc.schedules.importReviewed.useMutation({
    onSuccess: (_result, variables) => {
      utils.schedules.byMonth.invalidate();
      utils.schedules.byWeek.invalidate();
      toast.success(`${variables.entries.length}件の予定を月間・週間スケジュールへ追加しました`);
      setImageImportOpen(false);
      setImportRows([]);
      setOcrStatus("");
      setOcrRawText("");
    },
    onError: (error) => toast.error(error.message || "画像からの予定追加に失敗しました"),
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const getSchedulesForDay = (day: Date) =>
    schedules?.filter(s => isSameDay(parseISO(s.scheduleDate), day)) ?? [];

  const openCreate = (day: Date) => {
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      scheduleDate: format(day, "yyyy-MM-dd"),
      startTime: "",
      endTime: "",
      location: "",
      type: "practice",
    });
    setDialogOpen(true);
  };

  const openEdit = (schedule: NonNullable<typeof schedules>[number]) => {
    setEditingId(schedule.id);
    setForm({
      title: schedule.title,
      description: schedule.description ?? "",
      scheduleDate: schedule.scheduleDate,
      startTime: schedule.startTime ?? "",
      endTime: schedule.endTime ?? "",
      location: schedule.location ?? "",
      type: schedule.type as keyof typeof typeConfig,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("タイトルを入力してください"); return; }
    if (editingId) updateMutation.mutate({ id: editingId, ...form });
    else createMutation.mutate(form);
  };

  const readScheduleImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("PNG・JPGなどの画像ファイルを選択してください");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("画像は12MB以下にしてください");
      return;
    }

    setIsReadingImage(true);
    setOcrStatus("文字を読み取る準備をしています…（初回のみ少し時間がかかります）");
    try {
      const { createWorker } = await import("tesseract.js");
      const makeWorker = (language: "jpn" | "eng") => createWorker(language, 1, {
        // Use an explicit per-language CDN directory rather than relying on a combined
        // language path; this is more dependable in hosted browser workers.
        langPath: `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${language}/4.0.0_best_int`,
        logger: (message) => {
          if (message.status === "recognizing text") {
            setOcrStatus(`文字を読み取っています… ${Math.round(message.progress * 100)}%`);
          }
        },
      });
      let worker = await makeWorker("jpn");
      await worker.setParameters({ preserve_interword_spaces: "1" });
      let result = await worker.recognize(file);
      await worker.terminate();

      // Some mobile screenshots fail to load Japanese training data in-browser.
      // Fall back to English/numeral recognition so dates and times can still be reviewed.
      if (!result.data.text.trim()) {
        setOcrStatus("日本語の読み取り結果が空のため、日付・時刻用の再読み取りをしています…");
        worker = await makeWorker("eng");
        await worker.setParameters({ preserve_interword_spaces: "1" });
        result = await worker.recognize(file);
        await worker.terminate();
      }

      const fallback = /^\d{4}-\d{2}$/.test(importMonth)
        ? parseISO(`${importMonth}-01`)
        : new Date();
      const rows = parseScheduleImageText(result.data.text, fallback.getFullYear(), fallback.getMonth() + 1);
      setImportRows(rows);
      setOcrRawText(result.data.text.trim());
      setOcrStatus(rows.length > 0
        ? `${rows.length}件の候補を抽出しました。保存前に必ず内容を確認・修正してください。`
        : "日付を含む予定を読み取れませんでした。より鮮明な画像を選ぶか、月を確認して再試行してください。"
      );
    } catch (error) {
      console.error("[Schedule image import] OCR failed", error);
      setOcrStatus("");
      toast.error("画像の読み取りに失敗しました。画像を撮り直して再試行してください。");
    } finally {
      setIsReadingImage(false);
    }
  };

  const updateImportedRow = (id: string, patch: Partial<ImportedSchedule>) => {
    setImportRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addManualImportRow = () => {
    const fallback = /^\d{4}-\d{2}$/.test(importMonth) ? importMonth : format(new Date(), "yyyy-MM");
    setImportRows((rows) => [
      ...rows,
      {
        id: `manual-${Date.now()}`,
        title: "",
        scheduleDate: `${fallback}-01`,
        startTime: "",
        endTime: "",
        location: "",
        description: "画像を確認して手入力",
        type: "practice",
      },
    ]);
  };

  const saveImportedRows = () => {
    const validRows = importRows
      .map(({ id: _id, ...row }) => ({ ...row, title: row.title.trim(), scheduleDate: row.scheduleDate.trim() }))
      .filter((row) => row.title && /^\d{4}-\d{2}-\d{2}$/.test(row.scheduleDate));
    if (validRows.length === 0) {
      toast.error("保存する予定を1件以上入力してください");
      return;
    }
    importMutation.mutate({ entries: validRows });
  };

  const selectedSchedules = selectedDay ? getSchedulesForDay(selectedDay) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2"><span>📅</span> 月間スケジュール</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">月ごとの練習・イベント予定</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "admin" && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setImageImportOpen(true)}>
              <ImageUp className="w-4 h-4" /> <span className="hidden sm:inline">画像から取り込む</span>
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-black text-lg w-32 text-center">
            {format(currentDate, "yyyy年M月", { locale: ja })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card className="border-0 shadow-md bg-white rounded-2xl">
            <CardContent className="p-4">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map((d, i) => (
                  <div
                    key={d}
                    className={`text-center text-xs font-black py-2 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"}`}
                  >
                    {d}
                  </div>
                ))}
              </div>
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startPad }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {days.map(day => {
                  const daySchedules = getSchedulesForDay(day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const dow = getDay(day);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                      className={`min-h-[72px] p-1.5 rounded-xl text-left transition-all border-2 ${
                        isSelected
                          ? "border-violet-400 bg-violet-50"
                          : "border-transparent hover:border-violet-200 hover:bg-violet-50/50"
                      }`}
                    >
                      <span
                        className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                          isToday(day)
                            ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md"
                            : dow === 0
                            ? "text-red-500"
                            : dow === 6
                            ? "text-blue-500"
                            : "text-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="space-y-0.5">
                        {daySchedules.slice(0, 2).map(s => (
                          <div
                            key={s.id}
                            className={`text-xs text-white rounded px-1 py-0.5 truncate ${typeConfig[s.type].color}`}
                          >
                            {s.title}
                          </div>
                        ))}
                        {daySchedules.length > 2 && (
                          <div className="text-xs text-muted-foreground">+{daySchedules.length - 2}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(typeConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 shadow-sm border">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-xs font-bold text-muted-foreground">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day detail */}
        <div className="lg:col-span-1">
          {selectedDay ? (
            <Card className="border-0 shadow-md bg-white rounded-2xl sticky top-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-black text-base">
                    {format(selectedDay, "M月d日（E）", { locale: ja })}
                  </CardTitle>
                  {canManage && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openCreate(selectedDay)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedSchedules.length > 0 ? (
                  selectedSchedules.map(s => (
                    <div key={s.id} className="p-3 rounded-xl border-l-4 border-l-violet-400 bg-violet-50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs text-white rounded-full px-2 py-0.5 inline-block mb-1 font-bold ${typeConfig[s.type].color}`}>
                            {typeConfig[s.type].label}
                          </div>
                          <p className="text-sm font-bold truncate">{s.title}</p>
                          {s.startTime && (
                            <p className="text-xs text-muted-foreground">{s.startTime}{s.endTime ? ` 〜 ${s.endTime}` : ""}</p>
                          )}
                          {s.location && <p className="text-xs text-muted-foreground">{s.location}</p>}
                        </div>
                        {canManage && (
                          <div className="flex shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(s)} title="予定を編集">
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: s.id })} title="予定を削除">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">予定なし</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-md bg-white rounded-2xl">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <div className="text-4xl mb-3 opacity-40">📅</div>
                <p className="font-medium">日付を選択すると<br />詳細が表示されます</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={imageImportOpen} onOpenChange={(open) => { setImageImportOpen(open); if (!open && !isReadingImage) setOcrStatus(""); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">🖼️ 予定表の画像から取り込む</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              画像内の日付・時間・予定名を読み取り、月間スケジュールと週間スケジュールへ追加する候補を作ります。
              <strong className="text-foreground">保存前に必ず各行を確認・修正してください。</strong>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>予定表の対象月</Label>
                <Input type="month" value={importMonth} onChange={(event) => setImportMonth(event.target.value)} disabled={isReadingImage} />
              </div>
              <div className="space-y-1.5">
                <Label>画像ファイル（PNG / JPG）</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={isReadingImage}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void readScheduleImage(file);
                    event.currentTarget.value = "";
                  }}
                />
              </div>
            </div>

            {isReadingImage && (
              <div className="flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-800 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" /> {ocrStatus}
              </div>
            )}
            {!isReadingImage && ocrStatus && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 space-y-2">
                <p>{ocrStatus}</p>
                {importRows.length === 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={addManualImportRow}>画像を見ながら手入力する</Button>
                )}
              </div>
            )}
            {!isReadingImage && ocrRawText && (
              <details className="rounded-xl border bg-muted/30 p-3 text-xs">
                <summary className="cursor-pointer font-bold">読み取った文字を確認する</summary>
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-sans text-muted-foreground">{ocrRawText}</pre>
              </details>
            )}

            {importRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-sm">取り込み候補（{importRows.length}件）</h3>
                  <Button type="button" size="sm" variant="outline" onClick={() => setImportRows([])} disabled={isReadingImage || importMutation.isPending}>候補をクリア</Button>
                </div>
                <div className="space-y-3">
                  {importRows.map((row, index) => (
                    <div key={row.id} className="rounded-xl border bg-violet-50/40 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-violet-700">予定 {index + 1}</span>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setImportRows((rows) => rows.filter((candidate) => candidate.id !== row.id))} title="この候補を削除">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1"><Label className="text-xs">予定名</Label><Input value={row.title} onChange={(event) => updateImportedRow(row.id, { title: event.target.value })} /></div>
                        <div className="space-y-1"><Label className="text-xs">日付</Label><Input type="date" value={row.scheduleDate} onChange={(event) => updateImportedRow(row.id, { scheduleDate: event.target.value })} /></div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1"><Label className="text-xs">開始</Label><Input type="time" value={row.startTime} onChange={(event) => updateImportedRow(row.id, { startTime: event.target.value })} /></div>
                        <div className="space-y-1"><Label className="text-xs">終了</Label><Input type="time" value={row.endTime} onChange={(event) => updateImportedRow(row.id, { endTime: event.target.value })} /></div>
                        <div className="space-y-1"><Label className="text-xs">種類</Label><Select value={row.type} onValueChange={(value) => updateImportedRow(row.id, { type: value as ImportedSchedule["type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeConfig).map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}</SelectContent></Select></div>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">場所（任意）</Label><Input value={row.location} onChange={(event) => updateImportedRow(row.id, { location: event.target.value })} placeholder="例：音楽室" /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageImportOpen(false)} disabled={isReadingImage || importMutation.isPending}>キャンセル</Button>
            <Button onClick={saveImportedRows} disabled={isReadingImage || importMutation.isPending || importRows.length === 0}>
              {importMutation.isPending ? "追加中..." : `確認済みの${importRows.length}件を追加`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">🗓️ {editingId ? "スケジュールを編集" : "スケジュールを追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>タイトル</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例：合奏練習" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>種別</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>日付</Label>
                <Input type="date" value={form.scheduleDate} onChange={e => setForm(f => ({ ...f, scheduleDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>開始時刻</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>終了時刻</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>場所</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="例：音楽室" />
            </div>
            <div className="space-y-1.5">
              <Label>メモ</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{editingId ? "更新する" : "追加する"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
