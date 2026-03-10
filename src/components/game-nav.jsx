import Link from "next/link";

import LogoutButton from "@/components/logout-button";

const gameLinks = [
  { href: "/character", label: "Karaktar" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/activities", label: "Aktiviteter" },
  { href: "/shop", label: "Butik" },
  { href: "/inventory", label: "Inventory" },
  { href: "/log", label: "Logg" },
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
