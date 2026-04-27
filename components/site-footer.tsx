import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border neumorphic py-8 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-6">
        <p className="text-sm text-muted-foreground">
          Built with Next.js and Supabase
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link
            href="/"
            className="hover:text-foreground transition-colors"
          >
            Home
          </Link>
          <Link
            href="/auth/login"
            className="hover:text-foreground transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/sign-up"
            className="hover:text-foreground transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </footer>
  );
}
