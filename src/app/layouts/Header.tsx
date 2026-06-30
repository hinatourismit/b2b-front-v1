import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Wallet,
  Menu,
  ShoppingCart,
} from "lucide-react";
import { useCartStore } from "@/features/attractions/store/cart.store";
import { branding } from "@/config/branding";
import { enabledModules } from "@/config/modules";
import { useAgent } from "@/features/auth/api/auth.queries";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useBalance } from "@/features/wallet/api/wallet.queries";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

function BrandMark() {
  const [first, ...rest] = branding.name.split(" ");
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      {/* custom monogram: "H" pillars bridged by a gold journey-arc → destination dot */}
      <div className="relative flex size-9 items-center justify-center rounded-[11px] bg-[linear-gradient(140deg,#21527e_0%,#347bb7_100%)] shadow-[0_6px_16px_-6px_rgba(52,123,183,0.85)] ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-[1.04]">
        <div className="pointer-events-none absolute inset-px rounded-[10px] bg-[linear-gradient(180deg,rgba(255,255,255,0.2),transparent_55%)]" />
        <svg viewBox="0 0 24 24" fill="none" className="relative size-5">
          <path d="M7 5.5V18.5" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M17 5.5V18.5" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
          <path
            d="M7 13.6C10 9.4 14 9.4 17 12"
            stroke="var(--gold)"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <circle cx="17" cy="12" r="1.7" fill="var(--gold)" />
        </svg>
      </div>
      <div className="leading-none">
        <span className="block font-display text-[1.12rem] font-semibold tracking-tight">
          <span className="text-foreground">{first}</span>
          {rest.length > 0 && (
            <span className="font-medium text-muted-foreground"> {rest.join(" ")}</span>
          )}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-gold">
          <span className="h-px w-3.5 bg-gold/50" />
          B2B Portal
        </span>
      </div>
    </Link>
  );
}

function ModuleNav({ className }: { className?: string }) {
  const { flags } = useAgent();
  const modules = enabledModules(flags);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {modules.map(([key, m]) => (
        <NavLink key={key} to={m.home} end={m.home === "/"} className={linkClass}>
          <m.icon className="size-4" />
          {m.label}
        </NavLink>
      ))}
      <NavLink to="/attraction/order" className={linkClass}>
        <ClipboardList className="size-4" />
        Orders
      </NavLink>
    </nav>
  );
}

function CartButton() {
  const count = useCartStore((s) => s.items.length);
  if (count === 0) return null;
  return (
    <Link
      to="/attractions/payment"
      className="relative flex size-9 items-center justify-center rounded-full transition-colors hover:bg-accent"
      aria-label={`Cart, ${count} items`}
    >
      <ShoppingCart className="size-4.5" />
      <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-gold-foreground">
        {count}
      </span>
    </Link>
  );
}

function WalletChip() {
  const { data, isLoading } = useBalance();

  return (
    <Link
      to="/wallet"
      className="hidden items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 transition-colors hover:bg-gold/20 sm:flex"
    >
      <Wallet className="size-4 text-gold-foreground" />
      {isLoading ? (
        <Skeleton className="h-4 w-16" />
      ) : (
        <span className="text-sm font-semibold tabular-nums text-gold-foreground">
          {formatPrice(data?.balance)}
        </span>
      )}
    </Link>
  );
}

function AgentMenu() {
  const { agent, isReseller } = useAgent();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const initials = (agent?.name ?? agent?.companyName ?? "A")
    .split(" ")
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-accent">
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate font-semibold">{agent?.name ?? agent?.companyName}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {agent?.email} · #{agent?.agentCode}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/dashboard")}>
          <LayoutDashboard className="size-4" /> Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/wallet")}>
          <Wallet className="size-4" /> Wallet
        </DropdownMenuItem>
        {isReseller && (
          <DropdownMenuItem onClick={() => navigate("/resellers")}>
            <Users className="size-4" /> Sub-agents
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="size-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav() {
  const { flags } = useAgent();
  const modules = enabledModules(flags);
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {modules.map(([key, m]) => (
          <DropdownMenuItem key={key} onClick={() => navigate(m.home)}>
            <m.icon className="size-4" /> {m.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={() => navigate("/attraction/order")}>
          <ClipboardList className="size-4" /> Orders
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <MobileNav />
          <BrandMark />
        </div>
        <ModuleNav className="hidden md:flex" />
        <div className="flex items-center gap-2.5">
          <CartButton />
          <WalletChip />
          <AgentMenu />
        </div>
      </div>
    </header>
  );
}
