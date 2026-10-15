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
  CalendarDays,
  ClipboardList,
  Music2,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function StatTile({ label, count, className }: { label: string; count: number; className: string }) {
  return (
    <div className={`rounded-2xl p-4 ${className}`}>
      <p className="text-xs font-black tracking-wide uppercase opacity-70">{label}</p>
      <p className="text-3xl font-black mt-1">{count}</p>
    </div>
  );
}

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    scheduleDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    type: "practice" as "practice" | "event" | "lesson" | "concert" | "holiday",
  });
  const { data: attendance, isLoading: attendanceLoading } = trpc.attendance.all.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const { data: todayPractice } = trpc.practice.today.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const createSchedule = trpc.schedules.create.useMutation({
    onSuccess: () => {
      utils.schedules.byMonth.invalidate();
      utils.schedules.byWeek.invalidate();
      toast.success("月間予定を追加しました。週間スケジュールにも反映されます。");
      setScheduleDialogOpen(false);
      setScheduleForm((form) => ({ ...form, title: "", description: "", startTime: "", endTime: "", location: "" }));
    },
    onError: (error) => toast.error(error.message || "予定の追加に失敗しました"),
  });

  const submitSchedule = () => {
    if (!scheduleForm.title.trim()) {
      toast.error("予定のタイトルを入力してください");
      return;
    }
    createSchedule.mutate(scheduleForm);
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center">
        <div>
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h1 className="font-black text-xl">運営ダッシュボードはorganizer専用です</h1>
          <p className="text-sm text-muted-foreground mt-2">部員は自分の出欠回数をダッシュボードで確認できます。</p>
        </div>
      </div>
    );
  }

  const totals = (attendance ?? []).reduce(
    (sum, member) => ({
      absence: sum.absence + member.absenceCount,
      late: sum.late + member.lateCount,
      earlyLeave: sum.earlyLeave + member.earlyLeaveCount,
    }),
    { absence: 0, late: 0, earlyLeave: 0 }
  );
  const membersWithRecords = (attendance ?? []).filter((member) => member.totalCount > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-600 p-6 md:p-8 text-white shadow-xl overflow-hidden relative">
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white/75 text-sm font-bold">
              <ShieldCheck className="w-4 h-4" /> ORGANIZER SPACE
            </div>
            <h1 className="text-3xl font-black mt-2">運営ダッシュボード</h1>
            <p className="text-sm text-white/80 mt-2">予定・練習内容・出欠状況をここから管理できます。</p>
          </div>
          <Button
            onClick={() => setLocation("/admin/users")}
            className="bg-white text-violet-700 hover:bg-white/90 font-black"
          >
            <Users className="w-4 h-4 mr-2" /> メンバー・organizer管理
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-violet-600 text-white p-3"><CalendarDays className="w-6 h-6" /></div>
            <div><p className="font-black">月間予定を入力</p><p className="text-sm text-muted-foreground">入力すると週間表示へ自動反映</p></div>
          </CardContent>
          <CardContent className="pt-0 px-5 pb-5 flex gap-2"><Button className="flex-1" onClick={() => setScheduleDialogOpen(true)}>予定を入力</Button><Button variant="outline" onClick={() => setLocation("/schedule/monthly")}>カレンダー</Button></CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-600 text-white p-3"><Music2 className="w-6 h-6" /></div>
            <div><p className="font-black">本日の練習</p><p className="text-sm text-muted-foreground">曲目・時間・場所を手動更新</p></div>
          </CardContent>
          <CardContent className="pt-0 px-5 pb-5"><Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setLocation("/practice")}>練習予定を更新</Button></CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-amber-500 text-white p-3"><ClipboardList className="w-6 h-6" /></div>
            <div><p className="font-black">合奏出欠ボード</p><p className="text-sm text-muted-foreground">承認済みの申請を合奏日別に確認</p></div>
          </CardContent>
          <CardContent className="pt-0 px-5 pb-5"><Button className="w-full bg-amber-500 hover:bg-amber-600" onClick={() => setLocation("/ensemble-attendance")}>合奏出欠を開く</Button></CardContent>
        </Card>
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2"><UserRoundCheck className="w-5 h-5 text-violet-600" /> 部員の出欠集計</h2>
            <p className="text-sm text-muted-foreground">先生の最終承認済みの欠席・遅刻・早退のみを集計します。</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/admin/approvals")}>申請を承認</Button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatTile label="欠席" count={totals.absence} className="bg-red-50 text-red-700" />
          <StatTile label="遅刻" count={totals.late} className="bg-amber-50 text-amber-700" />
          <StatTile label="早退" count={totals.earlyLeave} className="bg-sky-50 text-sky-700" />
        </div>

        <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-3"><CardTitle className="text-base font-black">部員別の記録</CardTitle></CardHeader>
          <CardContent className="p-0">
            {attendanceLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">読み込み中...</div>
            ) : membersWithRecords.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">承認済みの出欠記録はまだありません。</div>
            ) : (
              <div className="divide-y">
                {membersWithRecords.map((member) => (
                  <div key={member.userId} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-violet-50/40">
                    <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 font-black flex items-center justify-center">
                      {member.name?.slice(0, 1) ?? "?"}
                    </div>
                    <div className="mr-auto min-w-32"><p className="font-bold text-sm">{member.name ?? "名前未設定"}</p><p className="text-xs text-muted-foreground">{member.part ?? "パート未設定"}</p></div>
                    <div className="flex gap-2 text-xs font-bold">
                      <span className="rounded-full bg-red-50 text-red-700 px-2.5 py-1">欠席 {member.absenceCount}</span>
                      <span className="rounded-full bg-amber-50 text-amber-700 px-2.5 py-1">遅刻 {member.lateCount}</span>
                      <span className="rounded-full bg-sky-50 text-sky-700 px-2.5 py-1">早退 {member.earlyLeaveCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {todayPractice && todayPractice.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">今日の練習は未登録です。上の「練習予定を更新」から追加できます。</p>
      )}

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>📅 月間予定を入力</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">ここで追加した予定は、月間・週間スケジュールへ自動表示されます。</p>
            <div className="space-y-1.5"><Label>予定名</Label><Input value={scheduleForm.title} onChange={(event) => setScheduleForm((form) => ({ ...form, title: event.target.value }))} placeholder="例：合奏練習" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>日付</Label><Input type="date" value={scheduleForm.scheduleDate} onChange={(event) => setScheduleForm((form) => ({ ...form, scheduleDate: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>種類</Label><Select value={scheduleForm.type} onValueChange={(value) => setScheduleForm((form) => ({ ...form, type: value as typeof scheduleForm.type }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="practice">🎵 練習</SelectItem><SelectItem value="event">🎉 イベント</SelectItem><SelectItem value="lesson">🎓 レッスン</SelectItem><SelectItem value="concert">🎺 演奏会</SelectItem><SelectItem value="holiday">🌴 休日</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>開始時刻</Label><Input type="time" value={scheduleForm.startTime} onChange={(event) => setScheduleForm((form) => ({ ...form, startTime: event.target.value }))} /></div><div className="space-y-1.5"><Label>終了時刻</Label><Input type="time" value={scheduleForm.endTime} onChange={(event) => setScheduleForm((form) => ({ ...form, endTime: event.target.value }))} /></div></div>
            <div className="space-y-1.5"><Label>場所</Label><Input value={scheduleForm.location} onChange={(event) => setScheduleForm((form) => ({ ...form, location: event.target.value }))} placeholder="例：音楽室" /></div>
            <div className="space-y-1.5"><Label>メモ</Label><Textarea value={scheduleForm.description} onChange={(event) => setScheduleForm((form) => ({ ...form, description: event.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>キャンセル</Button><Button onClick={submitSchedule} disabled={createSchedule.isPending}>月間予定に追加</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
