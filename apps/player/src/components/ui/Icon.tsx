import { ArrowRight, Award, Bell, Bookmark, CalendarCheck, Check, ChevronDown, ChevronUp, Clock3, FileSignature, FileText, Folder, Gamepad2, Gem, Gift, Grid2X2, House, LockKeyhole, Menu, MessageSquare, Mic, Moon, Pencil, Play, Plus, RotateCcw, Send, Share2, ShieldCheck, Sparkles, Square, Store, TriangleAlert, Trophy, UserRound, Users, Utensils, Volume2, X, type LucideIcon } from "lucide-react";

const icons = { alert: TriangleAlert, arrow: ArrowRight, bell: Bell, bookmark: Bookmark, date: CalendarCheck, check: Check, chevronDown: ChevronDown, chevronUp: ChevronUp, clock: Clock3, utensils: Utensils, store: Store, plus: Plus, sign: FileSignature, file: FileText, folder: Folder, game: Gamepad2, gift: Gift, grid: Grid2X2, home: House, menu: Menu, hello: MessageSquare, mic: Mic, moon: Moon, edit: Pencil, play: Play, restart: RotateCcw, lock: LockKeyhole, send: Send, share: Share2, shield: ShieldCheck, spark: Sparkles, stop: Square, trophy: Trophy, user: UserRound, friends: Users, volume: Volume2, close: X, seal: Award, bet: Gem } satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof icons;
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const Component = icons[name];
  return <Component size={size} strokeWidth={2} aria-hidden="true" />;
}
