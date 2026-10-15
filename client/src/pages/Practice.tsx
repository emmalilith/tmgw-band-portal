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
import { format, addDays, subDays, parseISO, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, MapPin, Music, Music2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const practiceTypeConfig = {
  ensemble: {
    label: "合奏",
    color: "border-l-violet-500 bg-violet-50",
    badge: "bg-violet-100 text-violet-800 border-violet-200",
    cardBg: "from-violet-50 to-purple-50",
    icon: "🎼",
  },
  individual: {
    label: "個人練習",
    color: "border-l-emerald-500 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cardBg: "from-emerald-50 to-teal-50",
    icon: "🎵",
  },
  section: {
    label: "パート練習",
    color: "border-l-pink-500 bg-pink-50",
    badge: "bg-pink-100 text-pink-800 border-pink-200",
    cardBg: "from-pink-50 to-rose-50",
    icon: "🎶",
  },
};

export default function Practice() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "section_leader";
  const utils = trpc.useUtils();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    practiceDate: format(new Date(), "yyyy-MM-dd"),
    practiceType: "ensemble" as keyof typeof practiceTypeConfig,
    repertoire: "",
    startTime: "",
    endTime: "",
    location: "",
    notes: "",
  });

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: practices, isLoading } = trpc.practice.byDate.useQuery({ date: dateStr });

  const createMutation = trpc.practice.create.useMutation({
    onSuccess: () => { utils.practice.byDate.invalidate(); utils.practice.today.invalidate(); utils.ensembleAttendance.invalidate(); toast.success("練習予定を追加しました"); setDialogOpen(false); },
    onError: () => toast.error("追加に失敗しました"),
  });
  const deleteMutation = trpc.practice.delete.useMutation({
    onSuccess: () => { utils.practice.byDate.invalidate(); utils.practice.today.invalidate(); utils.ensembleAttendance.invalidate(); toast.success("削除しました"); },
    onError: () => toast.error("削除に失敗しました"),
  });
  const updateMutation = trpc.practice.update.useMutation({
    onSuccess: () => {
      utils.practice.byDate.invalidate();
      utils.practice.today.invalidate();
      utils.ensembleAttendance.invalidate();
      toast.success("練習予定を更新しました");
      setDialogOpen(false);
      setEditingId(null);
    },
    onError: (error) => toast.error(error.message || "更新に失敗しました"),
  });

  const isToday = isSameDay(selectedDate, new Date());

  const openCreate = () => {
    setEditingId(null);
    setForm({
      practiceDate: dateStr,
      practiceType: "ensemble",
      repertoire: "",
      startTime: "",
      endTime: "",
      location: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (practice: NonNullable<typeof practices>[number]) => {
    setEditingId(practice.id);
    setForm({
      practiceDate: practice.practiceDate,
      practiceType: practice.practiceType as keyof typeof practiceTypeConfig,
      repertoire: practice.repertoire ?? "",
      startTime: practice.startTime ?? "",
      endTime: practice.endTime ?? "",
      location: practice.location ?? "",
      notes: practice.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) updateMutation.mutate({ id: editingId, ...form });
    else createMutation.mutate(form);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2"><span>🎼</span> 本日の練習予定</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">合奏・個人・パート練習の管理</p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            追加する
          </Button>
        )}
      </div>

      {/* Date navigator */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => subDays(d, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="font-black text-xl">
            {format(selectedDate, "M月d日（E）", { locale: ja })}
          </p>
          {isToday && <p className="text-xs font-black text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">今日</p>}
        </div>
        <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => addDays(d, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Practice list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-28 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : practices && practices.length > 0 ? (
        <div className="space-y-4">
          {practices.map(p => {
            const cfg = practiceTypeConfig[p.practiceType];
            return (
              <Card key={p.id} className={`border-0 shadow-md rounded-2xl border-l-4 overflow-hidden bg-gradient-to-r ${cfg.cardBg} ${cfg.color}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-2xl">{cfg.icon}</span>
                        <span className={`text-xs px-3 py-1 rounded-full border font-bold ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        {p.startTime && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {p.startTime}{p.endTime ? ` 〜 ${p.endTime}` : ""}
                          </span>
                        )}
                        {p.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {p.location}
                          </span>
                        )}
                      </div>

                      {p.practiceType === "ensemble" && p.repertoire && (
                        <div className="mt-3 bg-white/60 rounded-xl p-3">
                          <p className="text-xs font-black text-violet-600 uppercase tracking-wider mb-1">🎵 演奏曲目</p>
                          <p className="text-sm font-bold text-foreground whitespace-pre-wrap">{p.repertoire}</p>
                        </div>
                      )}

                      {p.notes && (
                        <p className="text-sm text-muted-foreground mt-2 border-t pt-2">{p.notes}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)} title="練習予定を編集"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: p.id })} title="練習予定を削除"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="py-16 text-center text-muted-foreground">
            <div className="text-5xl mb-4 opacity-30">🎼</div>
            <p className="font-medium">この日の練習予定はありません</p>
            {canManage && (
              <button onClick={openCreate} className="text-sm text-primary hover:underline mt-2 block mx-auto">
                練習予定を追加する
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">🎼 {editingId ? "練習予定を編集" : "練習予定を追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>日付</Label>
              <Input type="date" value={form.practiceDate} onChange={e => setForm(f => ({ ...f, practiceDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>練習種別</Label>
              <Select value={form.practiceType} onValueChange={v => setForm(f => ({ ...f, practiceType: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ensemble">合奏</SelectItem>
                  <SelectItem value="individual">個人練習</SelectItem>
                  <SelectItem value="section">パート練習</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.practiceType === "ensemble" && (
              <div className="space-y-1.5">
                <Label>演奏曲目</Label>
                <Textarea
                  value={form.repertoire}
                  onChange={e => setForm(f => ({ ...f, repertoire: e.target.value }))}
                  placeholder="例：マーチ「○○」、交響曲第○番"
                  rows={3}
                />
              </div>
            )}
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
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{editingId ? "更新する" : "追加する"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
