import { getIdTokenResult } from "firebase/auth";

import { auth } from "@/lib/firebaseClient";

export async function getUserClaims(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await getIdTokenResult(user, forceRefresh);
  return token.claims as Record<string, unknown> | null;
}
