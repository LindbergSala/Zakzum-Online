import Link from "next/link";

import LogoutButton from "@/components/logout-button";

const gameLinks = [
  { href: "/character", label: "Character" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/activities", label: "Activities" },
  { href: "/shop", label: "Shop" },
  { href: "/inventory", label: "Inventory" },
  { href: "/log", label: "Log" },
];

const showDebugLink = process.env.NODE_ENV !== "production";

export default function GameNav() {
  const navLinks = showDebugLink
    ? [...gameLinks, { href: "/debug", label: "Debug" }]
    : gameLinks;

  return (
    <>
      <p>
        {navLinks.map((link, index) => (
          <span key={link.href}>
            <Link href={link.href}>{link.label}</Link>
            {index < navLinks.length - 1 ? " | " : ""}
          </span>
        ))}
      </p>
      <p>
        <LogoutButton />
      </p>
    </>
  );
}
