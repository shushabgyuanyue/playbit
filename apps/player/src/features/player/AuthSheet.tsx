import { useEffect, useState } from "react";
import type { User } from "@playbit/shared";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";
import { Sheet } from "../../components/ui/Sheet";
import { PlayerApiError } from "../../services/playerApi";
import { usePlayer } from "./PlayerProvider";

export function AuthSheet({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: (user: User) => void }) {
  const { auth, notify } = usePlayer();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("login");
    setEmail("");
    setPassword("");
    setNickname("");
    setError("");
    setSubmitting(false);
  }, [open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      let currentUser: User;
      if (mode === "login") {
        currentUser = await auth.login({ email: email.trim(), password });
      } else {
        currentUser = await auth.register({ email: email.trim(), password, nickname: nickname.trim() });
      }
      notify(mode === "login" ? "已登录，权益会同步到这里" : "账户已创建，权益会同步到这里");
      onClose();
      onSuccess?.(currentUser);
    } catch (cause) {
      const apiError = cause instanceof PlayerApiError ? cause : null;
      setError(apiError?.status === 0 ? copy.auth.network : copy.auth.failed);
    } finally {
      setSubmitting(false);
    }
  }

  return <Sheet open={open} onClose={onClose} title={mode === "login" ? copy.auth.loginTitle : copy.auth.registerTitle} eyebrow="PLAYBIT ID" description={mode === "login" ? copy.auth.loginHint : copy.auth.registerHint}>
    <form className="auth-form sheet-form" onSubmit={submit}>
      {mode === "register" && <label><span>{copy.auth.nickname}</span><input value={nickname} onChange={event => setNickname(event.target.value)} placeholder={copy.auth.nicknamePlaceholder} maxLength={20} autoComplete="nickname" required /></label>}
      <label><span>{copy.auth.email}</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder={copy.auth.emailPlaceholder} autoComplete="email" required /></label>
      <label><span>{copy.auth.password}</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={copy.auth.passwordPlaceholder} minLength={8} maxLength={72} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>
      {error && <p className="auth-error" role="alert"><Icon name="alert" size={14} />{error}</p>}
      <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "正在处理…" : mode === "login" ? copy.auth.login : copy.auth.register}</button>
      <button className="text-button auth-switch" type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? copy.auth.switchToRegister : copy.auth.switchToLogin}</button>
    </form>
  </Sheet>;
}
