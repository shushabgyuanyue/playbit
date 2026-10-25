import { useNavigate } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "./Icon";

export function PageBack({ fallback = "/" }: { fallback?: string }) {
  const navigate = useNavigate();

  function goBack() {
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  }

  return <button className="page-back" type="button" onClick={goBack} aria-label={copy.back}>
    <Icon name="arrow" size={16} />
    <span>{copy.back}</span>
  </button>;
}
