export interface ClientUser {
  id: number | string;
  userEmail?: string;
  username?: string;
  avatarUrl?: string | null;

  githubOauthToken: string | null;

  githubLinked: boolean;

  gitsetKey: string;
}

function sanitize(u: any): ClientUser {
  const linked = !!u.githubOauthToken;
  return {
    id: u.id,
    userEmail: u.userEmail,
    username: u.username,
    avatarUrl: u.avatarUrl ?? null,
    githubOauthToken: linked ? 'linked' : null,
    githubLinked: linked,
    gitsetKey: u.gitsetKey,
  };
}

export function toClientUser(u: null | undefined): undefined;
export function toClientUser<T extends object>(u: T): ClientUser;
export function toClientUser(u: any): ClientUser | undefined;
export function toClientUser(u: any): ClientUser | undefined {
  return u ? sanitize(u) : undefined;
}
