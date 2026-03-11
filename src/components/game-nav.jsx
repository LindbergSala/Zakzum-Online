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

export default function GameNav() {
  return (
    <>
      <p>
        {gameLinks.map((link, index) => (
          <span key={link.href}>
            <Link href={link.href}>{link.label}</Link>
            {index < gameLinks.length - 1 ? " | " : ""}
          </span>
        ))}
      </p>
      <p>
        <LogoutButton />
      </p>
    </>
  );
}
