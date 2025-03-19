import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const [location] = useLocation();

  return (
    <nav className="flex space-x-4 mb-4">
      <Link href="/">
        <a className={cn(
          "px-3 py-2 rounded-lg hover:bg-accent",
          location === "/" ? "bg-accent" : "transparent"
        )}>
          Engineers
        </a>
      </Link>
      <Link href="/jobs">
        <a className={cn(
          "px-3 py-2 rounded-lg hover:bg-accent",
          location === "/jobs" ? "bg-accent" : "transparent"
        )}>
          Jobs
        </a>
      </Link>
      <Link href="/admin-calendar">
        <a className={cn(
          "px-3 py-2 rounded-lg hover:bg-accent",
          location === "/admin-calendar" ? "bg-accent" : "transparent"
        )}>
          Schedule
        </a>
      </Link>
      <Link href="/admin-users">
        <a className={cn(
          "px-3 py-2 rounded-lg hover:bg-accent",
          location === "/admin-users" ? "bg-accent" : "transparent"
        )}>
          Admin Users
        </a>
      </Link>
      <Link href="/admin-settings">
        <a className={cn(
          "px-3 py-2 rounded-lg hover:bg-accent",
          location === "/admin-settings" ? "bg-accent" : "transparent"
        )}>
          Settings
        </a>
      </Link>
    </nav>
  );
}