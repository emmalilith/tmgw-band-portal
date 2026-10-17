import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Save, Shield, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ResponsibilityDraft = {
  isTeacher: boolean;
  isPresident: boolean;
  isSectionLeader: boolean;
};

export default function AdminUsers() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [partDrafts, setPartDrafts] = useState<Record<number, string>>({});
  const [responsibilityDrafts, setResponsibilityDrafts] = useState<Record<number, ResponsibilityDraft>>({});
  const canManage = Boolean(user?.isPresident || user?.isTeacher);

  const { data: members, isLoading } = trpc.users.list.useQuery(undefined, { enabled: canManage });
  const updatePartMutation = trpc.users.updatePart.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success("パートを更新しました"); },
    onError: (error) => toast.error(error.message || "パートの更新に失敗しました"),
  });
  const updateResponsibilitiesMutation = trpc.users.updateResponsibilities.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success("担当を更新しました"); },
    onError: (error) => toast.error(error.message || "担当の更新に失敗しました"),
  });
  const removeUserMutation = trpc.users.remove.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success("アカウントを削除しました"); },
    onError: (error) => toast.error(error.message || "削除に失敗しました"),
  });

  const getResponsibilities = (member: NonNullable<typeof members>[number]): ResponsibilityDraft =>
    responsibilityDrafts[member.id] ?? {
      isTeacher: member.isTeacher,
      isPresident: member.isPresident,
      isSectionLeader: member.isSectionLeader,
    };

  const setResponsibility = (member: NonNullable<typeof members>[number], key: keyof ResponsibilityDraft, value: boolean) => {
    setResponsibilityDrafts((drafts) => ({
      ...drafts,
      [member.id]: { ...getResponsibilities(member), [key]: value },
    }));
  };

  const removeAccount = (member: { id: number; name: string | null }) => {
    if (!window.confirm(`${member.name ?? "この部員"}のアカウントを削除しますか？\nこの操作を行うと、本人はログインできなくなります。`)) return;
    removeUserMutation.mutate({ userId: member.id });
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>このページは部長または顧問のみ利用できます</p>
        </div>
      </div>
    );
  }

  const responsibilityCards = [
    ["🎓", "顧問", "最終承認と全体の管理", "from-amber-50 to-orange-50", "text-amber-800"],
    ["🏅", "部長", "二次承認と運営の管理", "from-fuchsia-50 to-pink-50", "text-fuchsia-800"],
    ["⭐", "パートリーダー", "同じパートの一次承認", "from-blue-50 to-indigo-50", "text-blue-800"],
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black flex items-center gap-2"><span>👥</span> メンバー・担当管理</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">一人に顧問・部長・パートリーダーを組み合わせて設定できます。</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {responsibilityCards.map(([emoji, title, description, background, color]) => (
          <Card key={title} className={`border-0 shadow-md rounded-2xl bg-gradient-to-br ${background}`}>
            <CardContent className="p-4">
              <div className="text-2xl mb-2">{emoji}</div>
              <p className={`font-black text-sm mb-1 ${color}`}>{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : (
        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-black text-lg"><Users className="w-5 h-5 text-violet-600" />部員一覧 ({members?.length ?? 0}名)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {members?.map((member) => {
                const responsibilities = getResponsibilities(member);
                return (
                  <div key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-secondary/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><span className="text-sm font-medium text-primary">{member.name?.charAt(0).toUpperCase() ?? "?"}</span></div>
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-medium text-sm truncate">{member.name ?? "名前未設定"}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email ?? "-"}</p>
                      <p className="text-xs text-muted-foreground mt-1 hidden lg:block">{format(new Date(member.createdAt), "yyyy/M/d 登録", { locale: ja })}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-bold">
                      {([
                        ["isTeacher", "顧問"],
                        ["isPresident", "部長"],
                        ["isSectionLeader", "パートリーダー"],
                      ] as const).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                          <Checkbox checked={responsibilities[key]} onCheckedChange={(checked) => setResponsibility(member, key, checked === true)} />
                          {label}
                        </label>
                      ))}
                      <Button
                        variant="outline" size="sm" className="h-8 text-xs gap-1"
                        disabled={updateResponsibilitiesMutation.isPending}
                        onClick={() => updateResponsibilitiesMutation.mutate({ userId: member.id, ...responsibilities })}
                      ><Save className="w-3.5 h-3.5" />担当を保存</Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Input
                        className="h-8 w-28 text-xs" aria-label={`${member.name ?? "部員"}のパート`} placeholder="パート"
                        value={partDrafts[member.id] ?? member.part ?? ""}
                        onChange={(event) => setPartDrafts((drafts) => ({ ...drafts, [member.id]: event.target.value }))}
                        onKeyDown={(event) => { if (event.key === "Enter" && !updatePartMutation.isPending) updatePartMutation.mutate({ userId: member.id, part: partDrafts[member.id] ?? member.part ?? "" }); }}
                        disabled={updatePartMutation.isPending}
                      />
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={updatePartMutation.isPending} onClick={() => updatePartMutation.mutate({ userId: member.id, part: partDrafts[member.id] ?? member.part ?? "" })} title="パートを保存"><Save className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={member.id === user?.id || removeUserMutation.isPending} onClick={() => removeAccount(member)} title={member.id === user?.id ? "自分自身は削除できません" : "アカウントを削除"}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
