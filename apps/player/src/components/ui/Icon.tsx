import { ArrowRight, Bell, Bookmark, CalendarCheck, Check, FileSignature, FileText, Folder, Gamepad2, Gem, Gift, Grid2X2, House, Menu, MessageSquare, Moon, Send, ShieldCheck, Sparkles, Trophy, UserRound, Users, X, Award, type LucideIcon } from "lucide-react";

const icons = { arrow: ArrowRight, bell: Bell, bookmark: Bookmark, date: CalendarCheck, check: Check, sign: FileSignature, file: FileText, folder: Folder, game: Gamepad2, gift: Gift, grid: Grid2X2, home: House, menu: Menu, hello: MessageSquare, moon: Moon, send: Send, shield: ShieldCheck, spark: Sparkles, trophy: Trophy, user: UserRound, friends: Users, close: X, seal: Award, bet: Gem } satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof icons;
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const Component = icons[name];
  return <Component size={size} strokeWidth={1.8} aria-hidden="true" />;
}
