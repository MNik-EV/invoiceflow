import type { Role, User } from "@prisma/client";

export interface AuthenticatedIdentity {
  userId: string;
  name: string;
  username: string;
  role: Role;
  sessionId: string;
  provider: string;
}

export interface AuthenticationResult {
  user: Pick<User, "id" | "name" | "username" | "role">;
}

export interface IdentityProvider {
  readonly name: string;
  authenticate(input: {
    username: string;
    password: string;
  }): Promise<AuthenticationResult>;
}
