import { Link } from "react-router-dom";
import { branding } from "@/config/branding";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="font-display font-medium text-foreground">{branding.name}</span>. All
          rights reserved.
        </p>
        <nav className="flex items-center gap-5">
          <Link to="/aboutus" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link to="/contactusb2b" className="transition-colors hover:text-foreground">
            Contact
          </Link>
          <Link to="/privacy-policy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
