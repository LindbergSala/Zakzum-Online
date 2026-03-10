import { redirect } from "next/navigation";

import { getActiveSessionUser } from "@/lib/session";

export async function requirePageUser() {
  const user = await getActiveSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

