import { useEffect, useRef } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { OverlayContainer } from "../components/ui/Sheet";
import { PlayerProvider, usePlayer } from "../features/player/PlayerProvider";
import { usePageMemory } from "../services/pageMemory";
import { BenefitsPage } from "../pages/BenefitsPage";
import { PlayPage } from "../pages/PlayPage";
import { ProfilePage } from "../pages/ProfilePage";
import { PromisePage } from "../pages/PromisePage";
import { AgreementDetailPage } from "../pages/AgreementDetailPage";
import { AgreementSharePage } from "../pages/AgreementSharePage";
import { AgreementListPage } from "../pages/AgreementListPage";
import { CouponClaimPage } from "../pages/CouponClaimPage";
import { AnnouncementsPage, NotificationsPage } from "../pages/ProfileInfoPages";

function Shell() {
  const location = useLocation(); const navigate = useNavigate(); const { toast } = usePlayer();
  const { memory, remember } = usePageMemory();
  const overlay = useRef<HTMLElement>(null);
  const isHome = location.pathname === "/" || location.pathname === "/promise";
  const isAgreement = location.pathname.startsWith("/agreements/");
  const rememberedHome = memory.homePath;
  const playTarget = location.pathname === "/benefits" && (location.state?.returnTo === "/" || location.state?.returnTo === "/promise")
    ? location.state.returnTo
    : rememberedHome;
  const mode = (location.pathname === "/promise" || (!isHome && rememberedHome === "/promise")) ? "promise" : "game";
  const benefitsEntryProps = isHome ? { state: { returnTo: location.pathname } } : {};
  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "/promise") remember({ homePath: location.pathname });
  }, [location.pathname, remember]);
  function toggleMode() {
    const next = mode === "game" ? "/promise" : "/";
    remember({ homePath: next });
    navigate(next);
  }
  return <main className="app-shell"><section className={`phone${location.pathname === "/" ? " phone-play" : ""}`} ref={overlay}>
    <OverlayContainer.Provider value={overlay.current}>
      <header className="topbar">
        <Link className="brand-word" to={location.pathname === "/benefits" ? playTarget : isHome ? location.pathname : rememberedHome}>{copy.brand}<span>.</span></Link>
        {isHome && <div className="top-actions"><button className={`top-action mode-flip flip-${mode}`} onClick={toggleMode} aria-label={mode === "game" ? copy.nav.toPromise : copy.nav.toPlay}><Icon name={mode === "game" ? "game" : "seal"} size={20} /></button></div>}
      </header>
      <div className={`page-view page-transition${isAgreement ? " page-view-detail" : ""}`} key={location.pathname}>
        <Routes>
          <Route path="/" element={<PlayPage />} /><Route path="/promise" element={<PromisePage />} />
          <Route path="/share/:shareCode" element={<AgreementSharePage />} /><Route path="/benefits" element={<BenefitsPage />} />
          <Route path="/claim/:token" element={<CouponClaimPage />} /><Route path="/me" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} /><Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/agreements" element={<AgreementListPage />} /><Route path="/agreements/:agreementId" element={<AgreementDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <nav className="bottom-nav" aria-label={copy.nav.label}>
        <Link className={`nav-item ${location.pathname === "/benefits" ? "active" : ""}`} to="/benefits" {...benefitsEntryProps}><Icon name="gift" /><span>{copy.nav.benefits}</span></Link>
        <Link className={`nav-item play ${isHome ? "active" : ""}`} to={playTarget}><span className="play-logo">P</span><span>{copy.nav.play}</span></Link>
        <Link className={`nav-item ${location.pathname === "/me" || location.pathname === "/agreements" || location.pathname.startsWith("/agreements/") || location.pathname === "/notifications" || location.pathname === "/announcements" ? "active" : ""}`} to="/me"><Icon name="user" /><span>{copy.nav.me}</span></Link>
      </nav>
      {toast && <div className="toast" role="status"><Icon name="check" size={17} />{toast}</div>}
    </OverlayContainer.Provider>
  </section></main>;
}

export function App() { return <PlayerProvider><Shell /></PlayerProvider>; }
