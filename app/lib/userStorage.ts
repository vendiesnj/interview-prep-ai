export function userScopedKey(baseKey: string, session: any) {
  const userId = session?.user?.id;
  const email = session?.user?.email;
  const scope = (userId || email || "anon").toString();
  return `${baseKey}::${scope}`;
}