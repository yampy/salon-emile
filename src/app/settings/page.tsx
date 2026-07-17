/**
 * Settings screen — the three model slots (tutor / grader / light) resolved
 * from the DB, plus token-usage accounting per role and model.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db/client";
import { getModelSetting, MODEL_SETTING_KEYS } from "@/db/settings";
import { resolveProvider } from "@/llm";
import { describeAuthSource } from "@/llm/auth";
import { summarizeUsage } from "@/server/usage";
import { updateModelSettings } from "./actions";

export const dynamic = "force-dynamic";

const SLOT_LABELS: Record<(typeof MODEL_SETTING_KEYS)[number], string> = {
  tutorModel: "tutor(対話)",
  graderModel: "grader(採点)",
  lightModel: "light(軽量採点・変形問題)",
};

export default async function SettingsPage() {
  const db = getDb();
  const usage = summarizeUsage(db);
  const provider = resolveProvider();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          現在のLLMプロバイダ: <span className="text-primary">{provider}</span>
          (環境変数 LLM_PROVIDER で切替。mock はAPIキー不要)
        </p>
        {provider === "anthropic" && (
          <p className="mt-1 text-sm text-muted-foreground" data-testid="auth-source">
            認証方式: <span className="text-primary">{describeAuthSource()}</span>
            (APIキー / OAuthトークン / ant プロファイルの順で解決)
          </p>
        )}
        {provider === "claude-code" && (
          <p className="mt-1 text-sm text-muted-foreground" data-testid="auth-source">
            認証方式: <span className="text-primary">Claude Code のログイン(サブスクリプション)</span>
            — 利用量は Pro/Max プランの上限から消費されます
          </p>
        )}
      </div>

      <section className="max-w-xl rounded-md border border-border bg-card p-4">
        <h2 className="mb-3 text-lg">モデル</h2>
        <form action={updateModelSettings} className="flex flex-col gap-3">
          {MODEL_SETTING_KEYS.map((key) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{SLOT_LABELS[key]}</span>
              <Input
                name={key}
                defaultValue={getModelSetting(db, key)}
                data-testid={`setting-${key}`}
                className="bg-background"
              />
            </label>
          ))}
          <Button type="submit" className="self-start" data-testid="settings-save">
            保存
          </Button>
        </form>
      </section>

      <section className="max-w-xl">
        <h2 className="mb-2 text-lg">トークン使用量</h2>
        {usage.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="usage-empty">
            まだLLM呼び出しはありません。
          </p>
        ) : (
          <table className="w-full border-collapse text-sm" data-testid="usage-table">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1 pr-2 font-normal">ロール</th>
                <th className="py-1 pr-2 font-normal">モデル</th>
                <th className="py-1 pr-2 text-right font-normal">呼び出し</th>
                <th className="py-1 pr-2 text-right font-normal">入力トークン</th>
                <th className="py-1 text-right font-normal">出力トークン</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((row) => (
                <tr key={`${row.role}-${row.model}`} className="border-b border-border/60">
                  <td className="py-1.5 pr-2">{row.role}</td>
                  <td className="py-1.5 pr-2 text-xs">{row.model}</td>
                  <td className="py-1.5 pr-2 text-right">{row.calls}</td>
                  <td className="py-1.5 pr-2 text-right">{row.inputTokens}</td>
                  <td className="py-1.5 text-right">{row.outputTokens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
