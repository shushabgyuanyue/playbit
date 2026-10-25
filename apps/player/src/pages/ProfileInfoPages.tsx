import { useEffect, useRef } from "react";
import { playerCopy as copy, profileInfoLabels } from "@playbit/content/player";
import { Icon } from "../components/ui/Icon";
import { PageBack } from "../components/ui/PageBack";
import { usePageMemory } from "../services/pageMemory";

type ProfileInfoKind = "notifications" | "announcements";

export function ProfileInfoPage({ kind }: { kind: ProfileInfoKind }) {
  const { memory, remember } = usePageMemory();
  const section = useRef<HTMLElement>(null);
  const scrollKey = kind;
  const initialScrollTop = useRef(memory.scrollTop[scrollKey] ?? 0);
  const isNotifications = kind === "notifications";
  const content: { eyebrow: string; title: string; intro: string; items: ReadonlyArray<{ title: string; body: string; meta?: string }>; footer?: string } = isNotifications
    ? { eyebrow: profileInfoLabels.notificationsEyebrow, title: copy.profile.notificationTitle, intro: copy.profile.notificationIntro, items: copy.profile.notificationItems }
    : { eyebrow: profileInfoLabels.announcementsEyebrow, title: copy.profile.announcementTitle, intro: copy.profile.announcementIntro, items: copy.profile.announcementItems.map(item => ({ ...item, meta: profileInfoLabels.announcementMeta })), footer: copy.profile.announcementFooter };

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    element.scrollTop = initialScrollTop.current;
    const saveScroll = () => remember({ scrollTop: { [scrollKey]: element.scrollTop } });
    element.addEventListener("scroll", saveScroll, { passive: true });
    return () => { saveScroll(); element.removeEventListener("scroll", saveScroll); };
  }, [remember, scrollKey]);

  return <section className="profile-info-page" ref={section}>
    <PageBack fallback="/me" />
    <header className="profile-info-page-heading">
      <div>
        <small>{content.eyebrow}</small>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
      </div>
      <span className={`profile-info-page-icon ${isNotifications ? "is-coral" : "is-violet"}`}><Icon name={isNotifications ? "bell" : "file"} size={19} /></span>
    </header>
    <div className={`profile-info-list ${isNotifications ? "is-notifications" : "is-announcements"}`}>
      {content.items.map((item, index) => <article className="profile-info-item" key={item.title}>
        <span className="profile-info-item-mark">{String(index + 1).padStart(2, "0")}</span>
        <div>
          <small>{item.meta}</small>
          <h2>{item.title}</h2>
          <p>{item.body}</p>
        </div>
      </article>)}
    </div>
    {"footer" in content && <p className="profile-info-page-footer">{content.footer}</p>}
  </section>;
}

export function NotificationsPage() {
  return <ProfileInfoPage kind="notifications" />;
}

export function AnnouncementsPage() {
  return <ProfileInfoPage kind="announcements" />;
}
