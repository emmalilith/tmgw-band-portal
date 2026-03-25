import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Bell, Edit2, Pin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const categoryConfig = {
  info: { label: "お知らせ", color: "bg-blue-50 text-blue-700 border-blue-200" },
  warning: { label: "注意", color: "bg-amber-50 text-amber-700 border-amber-200" },
  important: { label: "重要", color: "bg-red-50 text-red-700 border-red-200" },
};

type FormData = {
  title: string;
  content: string;
  category: "info" | "warning" | "important";
  pinned: boolean;
};

export default function Announcements() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const canManage = user?.role === "admin" || user?.role === "section_leader";

  const { data: announcements, isLoading } = trpc.announcements.list.useQuery();
  const createMutation = trpc.announcements.create.useMutation({
    onSuccess: () => { utils.announcements.list.invalidate(); toast.success("連絡事項を投稿しました"); setDialogOpen(false); },
    onError: () => toast.error("投稿に失敗しました"),
  });
  const updateMutation = trpc.announcements.update.useMutation({
    onSuccess: () => { utils.announcements.list.invalidate(); toast.success("更新しました"); setDialogOpen(false); },
    onError: () => toast.error("更新に失敗しました"),
  });
  const deleteMutation = trpc.announcements.delete.useMutation({
    onSuccess: () => { utils.announcements.list.invalidate(); toast.success("削除しました"); },
    onError: () => toast.error("削除に失敗しました"),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>({ title: "", content: "", category: "info", pinned: false });

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: "", content: "", category: "info", pinned: false });
    setDialogOpen(true);
  };

  const openEdit = (a: NonNullable<typeof announcements>[0]) => {
    setEditingId(a.id);
    setForm({ title: a.title, content: a.content, category: a.category, pinned: a.pinned });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error("タイトルと内容を入力してください"); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const pinned = announcements?.filter(a => a.pinned) ?? [];
  const regular = announcements?.filter(a => !a.pinned) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-light">連絡事項掲示板</h1>
          <p className="text-sm text-muted-foreground mt-1">部員への重要なお知らせを確認できます</p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            投稿する
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Pinned */}
          {pinned.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Pin className="w-3 h-3" /> ピン留め
              </h2>
              {pinned.map(a => (
                <AnnouncementCard key={a.id} a={a} canManage={canManage} onEdit={openEdit} onDelete={id => deleteMutation.mutate({ id })} />
              ))}
            </div>
          )}

          {/* Regular */}
          {regular.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && (
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  すべての連絡事項
                </h2>
              )}
              {regular.map(a => (
                <AnnouncementCard key={a.id} a={a} canManage={canManage} onEdit={openEdit} onDelete={id => deleteMutation.mutate({ id })} />
              ))}
            </div>
          )}

          {announcements?.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>連絡事項はありません</p>
            </div>
          )}
        </>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif font-medium">
              {editingId ? "連絡事項を編集" : "連絡事項を投稿"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>タイトル</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="タイトルを入力" />
            </div>
            <div className="space-y-1.5">
              <Label>内容</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="内容を入力" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>カテゴリ</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as FormData["category"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">お知らせ</SelectItem>
                    <SelectItem value="warning">注意</SelectItem>
                    <SelectItem value="important">重要</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>ピン留め</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={form.pinned} onCheckedChange={v => setForm(f => ({ ...f, pinned: v }))} />
                  <span className="text-sm text-muted-foreground">{form.pinned ? "ON" : "OFF"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "更新する" : "投稿する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementCard({
  a,
  canManage,
  onEdit,
  onDelete,
}: {
  a: { id: number; title: string; content: string; category: "info" | "warning" | "important"; pinned: boolean; createdAt: Date };
  canManage: boolean;
  onEdit: (a: any) => void;
  onDelete: (id: number) => void;
}) {
  const cfg = categoryConfig[a.category];
  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {a.pinned && <span className="text-amber-500 text-xs">📌</span>}
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cfg.color}`}>{cfg.label}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(a.createdAt), "yyyy年M月d日", { locale: ja })}
              </span>
            </div>
            <h3 className="font-medium text-foreground">{a.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">{a.content}</p>
          </div>
          {canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(a)}>
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(a.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
