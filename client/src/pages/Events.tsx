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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { differenceInDays, format, isAfter } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, MapPin, Music2, Plus, Star, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const typeConfig = {
  concert: { label: "演奏会", icon: Music2, color: "from-blue-900 via-indigo-900 to-slate-900" },
  competition: { label: "コンクール", icon: Trophy, color: "from-amber-900 via-orange-900 to-slate-900" },
  other: { label: "その他", icon: Calendar, color: "from-slate-800 via-slate-900 to-slate-900" },
};

export default function Events() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const { data: events, isLoading } = trpc.events.list.useQuery();
  const createMutation = trpc.events.create.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); utils.events.featured.invalidate(); toast.success("イベントを追加しました"); setDialogOpen(false); },
    onError: () => toast.error("追加に失敗しました"),
  });
  const updateMutation = trpc.events.update.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); utils.events.featured.invalidate(); toast.success("更新しました"); },
    onError: () => toast.error("更新に失敗しました"),
  });
  const deleteMutation = trpc.events.delete.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); utils.events.featured.invalidate(); toast.success("削除しました"); },
    onError: () => toast.error("削除に失敗しました"),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    venue: "",
    type: "concert" as keyof typeof typeConfig,
    featured: false,
  });

  const now = new Date();
  const upcoming = events?.filter(e => isAfter(new Date(e.eventDate), now)) ?? [];
  const past = events?.filter(e => !isAfter(new Date(e.eventDate), now)) ?? [];

  const handleSubmit = () => {
    if (!form.title.trim() || !form.eventDate) { toast.error("タイトルと日時を入力してください"); return; }
    createMutation.mutate(form);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-light">演奏会カウントダウン</h1>
          <p className="text-sm text-muted-foreground mt-1">演奏会・コンクールまでの日数を確認</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            追加する
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-40 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Upcoming events - countdown cards */}
          {upcoming.length > 0 ? (
            <div className="space-y-4">
              {upcoming.map(e => {
                const daysLeft = differenceInDays(new Date(e.eventDate), now);
                const cfg = typeConfig[e.type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={e.id}
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.color} p-6 text-white shadow-xl`}
                  >
                    {/* Decorative circles */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                      <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full border border-white/30" />
                      <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full border border-white/20" />
                    </div>

                    <div className="relative flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="w-4 h-4 text-amber-400" />
                          <span className="text-xs text-amber-400 uppercase tracking-widest font-medium">{cfg.label}</span>
                          {e.featured && (
                            <span className="flex items-center gap-1 text-xs text-amber-300">
                              <Star className="w-3 h-3 fill-current" /> メイン
                            </span>
                          )}
                        </div>
                        <h2 className="font-serif text-2xl font-light text-white mb-2">{e.title}</h2>
                        {e.venue && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-300 mb-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {e.venue}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-sm text-slate-300">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(e.eventDate), "yyyy年M月d日（E）HH:mm", { locale: ja })}
                        </div>
                        {e.description && (
                          <p className="text-sm text-slate-400 mt-2">{e.description}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-end gap-1 justify-end">
                          <span className="font-serif text-7xl font-light text-amber-400 leading-none">{daysLeft}</span>
                          <span className="text-slate-300 mb-2 text-xl">日</span>
                        </div>
                        <p className="text-xs text-slate-500">まで</p>
                        {isAdmin && (
                          <div className="flex items-center gap-2 mt-3 justify-end">
                            <button
                              onClick={() => updateMutation.mutate({ id: e.id, featured: !e.featured })}
                              className={`text-xs px-2 py-1 rounded border transition-colors ${e.featured ? "border-amber-400/50 text-amber-400 bg-amber-400/10" : "border-white/20 text-white/60 hover:border-white/40"}`}
                            >
                              {e.featured ? "★ メイン" : "☆ メインに設定"}
                            </button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-red-400 hover:bg-red-400/10"
                              onClick={() => deleteMutation.mutate({ id: e.id })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="border shadow-sm">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Music2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>今後の演奏会・イベントはありません</p>
                {isAdmin && (
                  <button onClick={() => setDialogOpen(true)} className="text-sm text-primary hover:underline mt-2 block mx-auto">
                    イベントを追加する
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Past events */}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">過去のイベント</h2>
              <div className="space-y-2">
                {past.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card opacity-60">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{e.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(e.eventDate), "yyyy年M月d日", { locale: ja })}
                      </span>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: e.id })}
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
            <DialogTitle className="font-serif font-medium">イベントを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>タイトル</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例：第40回定期演奏会" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>種別</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concert">演奏会</SelectItem>
                    <SelectItem value="competition">コンクール</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>日時</Label>
                <Input type="datetime-local" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>会場</Label>
              <Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="例：市民ホール" />
            </div>
            <div className="space-y-1.5">
              <Label>説明</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.featured} onCheckedChange={v => setForm(f => ({ ...f, featured: v }))} />
              <Label>カウントダウンのメインに設定</Label>
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
