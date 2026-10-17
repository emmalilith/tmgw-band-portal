import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isToday,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock, LogOut, Plus, ShieldCheck, UserX, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
type AttendanceType = "absence" | "late" | "early_leave" | "unexcused";

const typeConfig: Record<AttendanceType, { label: string; color: string; icon: typeof UserX }> = {
  absence: { label: "欠席", color: "bg-red-50 text-red-700 border-red-200", icon: UserX },
  unexcused: { label: "無断欠席", color: "bg-rose-100 text-rose-800 border-rose-200", icon: AlertTriangle },
  late: { label: "遅刻", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  early_leave: { label: "早退", color: "bg-sky-50 text-sky-700 border-sky-200", icon: LogOut },
};

function CountTile({ label, value, className }: { label: string; value: number; className: string }) {
  return <div className={`rounded-2xl p-4 ${className}`}><p className="text-xs font-black tracking-wide uppercase opacity-70">{label}</p><p className="text-3xl font-black mt-1">{value}</p></div>;
}

export default function AdminAttendance() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    requesterId: "",
    requestType: "absence" as AttendanceType,
    targetDate: format(new Date(), "yyyy-MM-dd"),
    arrivalTime: "",
    leaveTime: "",
    reason: "",
  });

  const canManage = Boolean(user?.isPresident || user?.isTeacher);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const { data: members = [] } = trpc.users.list.useQuery(undefined, { enabled: canManage });
  const { data: availability = [], isLoading } = trpc.attendance.availabilityByMonth.useQuery({ year, month }, { enabled: canManage });

  const createManual = trpc.absence.createManual.useMutation({
    onSuccess: () => {
      utils.attendance.availabilityByMonth.invalidate();
      utils.attendance.all.invalidate();
      utils.absence.all.invalidate();
      utils.absence.myRequests.invalidate();
      toast.success("出欠記録を追加しました");
      setDialogOpen(false);
      setForm((current) => ({ ...current, requesterId: "", arrivalTime: "", leaveTime: "", reason: "" }));
    },
    onError: (error) => toast.error(error.message || "出欠記録の追加に失敗しました"),
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);
  const availabilityMap = useMemo(() => new Map(availability.map((entry) => [entry.date, entry])), [availability]);
  const selected = availabilityMap.get(selectedDate);
  const selectedRecords = selected?.records ?? [];
  const selectedGroups = (["absence", "unexcused", "late", "early_leave"] as const).map((type) => ({
    type,
    records: selectedRecords.filter((record) => record.requestType === type),
  }));

  const totals = useMemo(() => availability.reduce((sum, day) => ({
    absence: sum.absence + day.absenceCount,
    unexcused: sum.unexcused + day.unexcusedCount,
    late: sum.late + day.lateCount,
    earlyLeave: sum.earlyLeave + day.earlyLeaveCount,
  }), { absence: 0, unexcused: 0, late: 0, earlyLeave: 0 }), [availability]);

  const openManualEntry = (date = selectedDate) => {
    setForm({ requesterId: "", requestType: "absence", targetDate: date, arrivalTime: "", leaveTime: "", reason: "" });
    setDialogOpen(true);
  };

  const submitManualRecord = () => {
    if (!form.requesterId) return toast.error("部員を選択してください");
    if (!form.targetDate || !form.reason.trim()) return toast.error("日付と理由・メモを入力してください");
    if (form.requestType === "late" && !form.arrivalTime) return toast.error("到着予定時刻を入力してください");
    if (form.requestType === "early_leave" && !form.leaveTime) return toast.error("退出予定時刻を入力してください");
    createManual.mutate({
      requesterId: Number(form.requesterId),
      requestType: form.requestType,
      targetDate: form.targetDate,
      arrivalTime: form.requestType === "late" ? form.arrivalTime : undefined,
      leaveTime: form.requestType === "early_leave" ? form.leaveTime : undefined,
      reason: form.reason.trim(),
    });
  };

  if (!canManage) {
    return <div className="min-h-[60vh] flex items-center justify-center text-center"><div><ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" /><h1 className="font-black text-xl">出欠管理は部長・顧問専用です</h1><p className="text-sm text-muted-foreground mt-2">部員の出欠状況を手動記録・確認できます。</p></div></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-600 p-6 md:p-8 text-white shadow-xl overflow-hidden relative">
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><div className="flex items-center gap-2 text-white/75 text-sm font-bold"><ShieldCheck className="w-4 h-4" /> MANAGEMENT ONLY</div><h1 className="text-3xl font-black mt-2">月間出欠・空き状況</h1><p className="text-sm text-white/80 mt-2">日ごとの不在人数を確認して、合奏日を計画できます。</p></div>
          <Button onClick={() => openManualEntry()} className="bg-white text-violet-700 hover:bg-white/90 font-black"><Plus className="w-4 h-4 mr-2" />出欠記録を手動入力</Button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CountTile label="欠席" value={totals.absence} className="bg-red-50 text-red-700" />
        <CountTile label="無断欠席" value={totals.unexcused} className="bg-rose-100 text-rose-800" />
        <CountTile label="遅刻" value={totals.late} className="bg-amber-50 text-amber-700" />
        <CountTile label="早退" value={totals.earlyLeave} className="bg-sky-50 text-sky-700" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3"><div className="flex items-center justify-between"><Button variant="outline" size="icon" onClick={() => setCurrentDate((date) => subMonths(date, 1))}><ChevronLeft className="w-4 h-4" /></Button><CardTitle className="font-black text-lg">{format(currentDate, "yyyy年M月", { locale: ja })}</CardTitle><Button variant="outline" size="icon" onClick={() => setCurrentDate((date) => addMonths(date, 1))}><ChevronRight className="w-4 h-4" /></Button></div><p className="text-xs text-muted-foreground">申請済み・確定済みを含む、不在・遅刻・早退予定の部員数です。</p></CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-7 mb-1">{WEEKDAYS.map((day, index) => <div key={day} className={`text-center text-xs font-black py-2 ${index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : "text-muted-foreground"}`}>{day}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">{Array.from({ length: startPad }).map((_, index) => <div key={`pad-${index}`} className="min-h-18" />)}{days.map((day) => {
              const date = format(day, "yyyy-MM-dd"); const summary = availabilityMap.get(date); const selectedCell = date === selectedDate; const count = summary?.unavailableCount ?? 0;
              return <button key={date} onClick={() => setSelectedDate(date)} className={`min-h-18 rounded-xl p-1.5 text-left transition-all border ${selectedCell ? "border-violet-500 bg-violet-600 text-white shadow-md" : count > 2 ? "border-rose-200 bg-rose-50 hover:bg-rose-100" : count > 0 ? "border-amber-200 bg-amber-50 hover:bg-amber-100" : "border-transparent hover:bg-violet-50"}`}><span className={`block text-xs font-black ${!selectedCell && isToday(day) ? "text-violet-700" : ""}`}>{format(day, "d")}</span>{count > 0 && <span className={`mt-1 inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-black ${selectedCell ? "bg-white/20 text-white" : count > 2 ? "bg-rose-500 text-white" : "bg-amber-500 text-white"}`}>{count}名</span>}</button>})}</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><div><CardTitle className="font-black flex items-center gap-2"><CalendarDays className="w-5 h-5 text-violet-600" />{format(parseISO(selectedDate), "M月d日（E）", { locale: ja })}</CardTitle><p className="text-xs text-muted-foreground mt-1">申請・確定を含む不在予定 {selected?.unavailableCount ?? 0}名</p></div><Button variant="outline" size="sm" onClick={() => openManualEntry(selectedDate)}><Plus className="w-3.5 h-3.5 mr-1" />記録</Button></div></CardHeader>
          <CardContent className="space-y-3">{isLoading ? <div className="py-10 text-center text-sm text-muted-foreground">読み込み中...</div> : selectedRecords.length === 0 ? <div className="py-10 text-center"><Users className="w-10 h-10 mx-auto mb-3 text-emerald-500" /><p className="font-bold">記録なし</p><p className="text-xs text-muted-foreground mt-1">全員出席予定です。</p></div> : selectedGroups.map(({ type, records }) => {
            if (records.length === 0) return null;
            const cfg = typeConfig[type]; const Icon = cfg.icon;
            return <section key={type} className="space-y-1.5"><div className="flex items-center gap-2"><Icon className="w-4 h-4" /><p className="text-sm font-black">{cfg.label}</p><span className="text-xs rounded-full bg-muted px-2 py-0.5 font-bold">{records.length}名</span></div>{records.map((record) => <div key={record.id} className={`rounded-xl border p-3 ${cfg.color}`}><div className="flex gap-2"><Icon className="w-4 h-4 mt-0.5 shrink-0" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="font-black text-sm">{record.requesterName ?? "名前未設定"}</p>{record.requesterPart && <span className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded-full">{record.requesterPart}</span>}<span className="text-[10px] bg-white/70 px-1.5 py-0.5 rounded-full">{record.isManualRecord ? "手動記録" : record.status === "teacher_approved" ? "確定" : "申請中"}</span></div>{record.requestType === "late" && record.arrivalTime && <p className="text-xs mt-1">到着予定: {record.arrivalTime}</p>}{record.requestType === "early_leave" && record.leaveTime && <p className="text-xs mt-1">退出予定: {record.leaveTime}</p>}<p className="text-xs mt-1 opacity-80 break-words">{record.reason}</p></div></div></div>)}</section>;
          })}</CardContent>
        </Card>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>📝 出欠記録を手動入力</DialogTitle></DialogHeader><div className="space-y-4 py-2"><p className="text-sm text-muted-foreground">申請を経ずに、運営が確認した記録をすぐに反映します。</p><div className="space-y-1.5"><Label>部員</Label><Select value={form.requesterId || undefined} onValueChange={(value) => setForm((current) => ({ ...current, requesterId: value }))}><SelectTrigger><SelectValue placeholder="部員を選択" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name ?? "名前未設定"}{member.part ? `（${member.part}）` : ""}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>日付</Label><Input type="date" value={form.targetDate} onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))} /></div><div className="space-y-1.5"><Label>種別</Label><Select value={form.requestType} onValueChange={(value) => setForm((current) => ({ ...current, requestType: value as AttendanceType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="absence">🚫 欠席</SelectItem><SelectItem value="unexcused">⚠️ 無断欠席</SelectItem><SelectItem value="late">⏰ 遅刻</SelectItem><SelectItem value="early_leave">🚪 早退</SelectItem></SelectContent></Select></div></div>{form.requestType === "late" && <div className="space-y-1.5"><Label>到着予定時刻</Label><Input type="time" value={form.arrivalTime} onChange={(event) => setForm((current) => ({ ...current, arrivalTime: event.target.value }))} /></div>}{form.requestType === "early_leave" && <div className="space-y-1.5"><Label>退出予定時刻</Label><Input type="time" value={form.leaveTime} onChange={(event) => setForm((current) => ({ ...current, leaveTime: event.target.value }))} /></div>}<div className="space-y-1.5"><Label>理由・メモ</Label><Textarea value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder={form.requestType === "unexcused" ? "例：連絡なし" : "確認した内容を入力"} rows={3} /></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">手動記録は、承認フローを通さず確定記録として保存されます。</div></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button><Button onClick={submitManualRecord} disabled={createManual.isPending}>記録を保存</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
