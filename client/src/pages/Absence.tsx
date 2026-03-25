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
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { BookOpen, CheckCircle2, Clock, Plus, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AbsenceStatus = "pending" | "section_approved" | "teacher_approved" | "rejected";

const statusConfig: Record<AbsenceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "申請中",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  section_approved: {
    label: "パートリーダー承認済",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  teacher_approved: {
    label: "承認完了",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "却下",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

export default function Absence() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: myRequests, isLoading } = trpc.absence.myRequests.useQuery();
  const createMutation = trpc.absence.create.useMutation({
    onSuccess: () => { utils.absence.myRequests.invalidate(); toast.success("申請を提出しました"); setDialogOpen(false); },
    onError: () => toast.error("申請に失敗しました"),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    requestType: "absence" as "absence" | "late",
    targetDate: "",
    arrivalTime: "",
    reason: "",
  });

  const handleSubmit = () => {
    if (!form.targetDate || !form.reason.trim()) { toast.error("日付と理由を入力してください"); return; }
    createMutation.mutate({
      requestType: form.requestType,
      targetDate: form.targetDate,
      arrivalTime: form.requestType === "late" ? form.arrivalTime : undefined,
      reason: form.reason,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-light">遅刻・欠席申請</h1>
          <p className="text-sm text-muted-foreground mt-1">申請はパートリーダー・先生の承認が必要です</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          申請する
        </Button>
      </div>

      {/* Approval flow explanation */}
      <Card className="border shadow-sm bg-secondary/30">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">承認フロー</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-xs font-bold text-amber-700">1</div>
              <span>申請提出</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">2</div>
              <span>パートリーダー確認</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700">3</div>
              <span>先生の最終承認</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My requests */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : myRequests && myRequests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">申請履歴</h2>
          {myRequests.map(r => {
            const status = r.status as AbsenceStatus;
            const cfg = statusConfig[status];
            return (
              <Card key={r.id} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${cfg.color}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${r.requestType === "absence" ? "bg-red-50 text-red-700 border-red-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
                          {r.requestType === "absence" ? "欠席" : "遅刻"}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {format(parseISO(r.targetDate), "yyyy年M月d日（E）", { locale: ja })}
                        {r.requestType === "late" && r.arrivalTime && (
                          <span className="text-muted-foreground font-normal ml-2">到着予定: {r.arrivalTime}</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{r.reason}</p>

                      {/* Approval trail */}
                      <div className="mt-3 space-y-1.5 border-t pt-2">
                        {r.sectionLeaderApprovedAt && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3 h-3 text-blue-500" />
                            <span>パートリーダー確認: {format(new Date(r.sectionLeaderApprovedAt), "M月d日 HH:mm")}</span>
                            {r.sectionLeaderComment && <span className="text-foreground">「{r.sectionLeaderComment}」</span>}
                          </div>
                        )}
                        {r.teacherApprovedAt && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>先生承認: {format(new Date(r.teacherApprovedAt), "M月d日 HH:mm")}</span>
                            {r.teacherComment && <span className="text-foreground">「{r.teacherComment}」</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(r.createdAt), "M/d")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border shadow-sm">
          <CardContent className="py-16 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>申請履歴はありません</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif font-medium">遅刻・欠席申請</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>申請種別</Label>
              <Select value={form.requestType} onValueChange={v => setForm(f => ({ ...f, requestType: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="absence">欠席</SelectItem>
                  <SelectItem value="late">遅刻</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>対象日</Label>
              <Input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
            </div>
            {form.requestType === "late" && (
              <div className="space-y-1.5">
                <Label>到着予定時刻</Label>
                <Input type="time" value={form.arrivalTime} onChange={e => setForm(f => ({ ...f, arrivalTime: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>理由</Label>
              <Textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="欠席・遅刻の理由を入力してください"
                rows={3}
              />
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              申請後、パートリーダーと先生の承認が必要です。承認されるまでお待ちください。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>申請する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
