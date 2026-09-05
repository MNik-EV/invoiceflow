import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  canViewRequest,
  isFinanceAdmin,
  requireRole,
} from "@/modules/identity/domain/permissions";

const identity = (role: Role, userId = "user-a") => ({
  userId,
  role,
  name: "Test",
  username: "test",
  sessionId: "session",
  provider: "local",
});

describe("permissions", () => {
  it("limits ordinary users to their own requests", () => {
    expect(canViewRequest(identity(Role.USER), "user-a")).toBe(true);
    expect(canViewRequest(identity(Role.USER), "user-b")).toBe(false);
  });

  it("allows both administrative roles to view all invoice requests", () => {
    expect(isFinanceAdmin(Role.FINANCE_ADMIN)).toBe(true);
    expect(canViewRequest(identity(Role.FINANCE_ADMIN), "user-b")).toBe(true);
    expect(canViewRequest(identity(Role.SUPER_ADMIN), "user-b")).toBe(true);
  });

  it("denies a role not in the allow-list", () => {
    expect(() =>
      requireRole(identity(Role.USER), [Role.SUPER_ADMIN]),
    ).toThrow();
  });
});
