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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { differenceInDays, format, isAfter, isSameDay, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, Clock, GraduationCap, MapPin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function LessonVisits() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const { data: visits, isLoading } = trpc.lessonVisits.list.useQuery();
  const createMutation = trpc.lessonVisits.create.useMutation({
    onSuccess: () => { utils.lessonVisits.list.invalidate(); toast.success("レッスンを追加しました"); setDialogOpen(false); },
    onError: () => toast.error("追加に失敗しました"),
  });
  const deleteMutation = trpc.lessonVisits.delete.useMutation({
    onSuccess: () => { utils.lessonVisits.list.invalidate(); toast.success("削除しました"); },
    onError: () => toast.error("削除に失敗しました"),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    instructorName: "",
    targetPart: "",
    visitDate: "",
    startTime: "",
    endTime: "",
    location: "",
    notes: "",
  });

  const today = new Date();
  const upcoming = visits?.filter(v => isAfter(parseISO(v.visitDate), today) || isSameDay(parseISO(v.visitDate), today)) ?? [];
  const past = visits?.filter(v => !isAfter(parseISO(v.visitDate), today) && !isSameDay(parseISO(v.visitDate), today)) ?? [];

  const handleSubmit = () => {
    if (!form.instructorName.trim() || !form.visitDate) { toast.error("講師名と日付を入力してください"); return; }
    createMutation.mutate(form);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2"><span>🎓</span> レッスン講師来訪ボード</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">外部講師の来訪予定を確認できます</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-xl font-bold shadow-md">
            <Plus className="w-4 h-4" />
            追加する
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Upcoming */}
          <div className="space-y-4">
            <h2 className="text-xs font-black text-violet-600 uppercase tracking-widest flex items-center gap-1">
              📅 今後の来訪予定
            </h2>
            {upcoming.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {upcoming.map(v => {
                  const daysUntil = differenceInDays(parseISO(v.visitDate), today);
                  const isToday = daysUntil === 0;
                  return (
                    <Card
                      key={v.id}
                      className={`border-0 shadow-md rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-lg overflow-hidden ${isToday ? "ring-2 ring-amber-400" : ""}`}
                    >
                      <CardContent className="p-0">
                        <div className={`h-2 ${isToday ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-violet-500 to-purple-600"}`} />
                        <div className="p-4 flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                                <span className="text-2xl">🎓</span>
                              </div>
                              <div>
                                <p className="font-black text-foreground">{v.instructorName} 先生</p>
                                {v.targetPart && (
                                  <p className="text-xs font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full inline-block mt-0.5">{v.targetPart}</p>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1 pl-0">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                <Calendar className="w-3 h-3" />
                                <span>{format(parseISO(v.visitDate), "yyyy年M月d日（E）", { locale: ja })}</span>
                                {isToday && (
                                  <span className="text-white font-bold bg-amber-500 px-2 py-0.5 rounded-full">🔥 今日！</span>
                                )}
                                {!isToday && daysUntil > 0 && (
                                  <span className="text-violet-600 font-bold">{daysUntil}日後</span>
                                )}
                              </div>
                              {v.startTime && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{v.startTime}{v.endTime ? ` 〜 ${v.endTime}` : ""}</span>
                                </div>
                              )}
                              {v.location && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  <span>{v.location}</span>
                                </div>
                              )}
                              {v.notes && (
                                <p className="text-xs text-muted-foreground mt-1 border-t pt-1">{v.notes}</p>
                              )}
                            </div>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate({ id: v.id })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-0 shadow-md rounded-2xl">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <div className="text-5xl mb-4 opacity-30">🎓</div>
                  <p className="font-medium">今後の来訪予定はありません</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                過去の来訪
              </h2>
              <div className="space-y-2">
                {past.slice(0, 5).map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card opacity-60">
                    <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{v.instructorName} 先生</span>
                      {v.targetPart && <span className="text-xs text-muted-foreground ml-2">{v.targetPart}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(v.visitDate), "M月d日", { locale: ja })}
                    </span>
                    {isAdmin && (
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: v.id })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">🎓 レッスン来訪を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>講師名</Label>
              <Input value={form.instructorName} onChange={e => setForm(f => ({ ...f, instructorName: e.target.value }))} placeholder="例：山田 太郎" />
            </div>
            <div className="space-y-1.5">
              <Label>担当パート</Label>
              <Input value={form.targetPart} onChange={e => setForm(f => ({ ...f, targetPart: e.target.value }))} placeholder="例：クラリネット、全体" />
            </div>
            <div className="space-y-1.5">
              <Label>来訪日</Label>
              <Input type="date" value={form.visitDate} onChange={e => setForm(f => ({ ...f, visitDate: e.target.value }))} />
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
              <Label>備考</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>追加する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
