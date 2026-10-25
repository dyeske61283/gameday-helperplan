import { describe, expect, it } from "vitest";
import { openFeedToken, sealFeedToken } from "./calendar-feeds";

const secret = "test-secret-with-at-least-32-characters";
const payload = {
  planId: "f530083d-8c74-4f10-931a-dd877ee7b52c",
  scope: "member-duties" as const,
  memberId: "member-123",
  planKey: "abcdefghijklmnopqrstuv",
  expiresAt: 2_000,
};

describe("calendar feed tokens", () => {
  it("encrypts scope and the wrapped plan key for server-only use", async () => {
    const token = await sealFeedToken(payload, secret);

    expect(token).not.toContain(payload.planId);
    expect(token).not.toContain(payload.planKey);
    await expect(openFeedToken(token, secret, 1_000)).resolves.toEqual(payload);
  });

  it("rejects malformed, tampered, and expired tokens", async () => {
    const token = await sealFeedToken(payload, secret);

    await expect(openFeedToken("not-a-token", secret, 1_000)).resolves.toBeNull();
    await expect(openFeedToken(`${token.slice(0, -1)}A`, secret, 1_000)).resolves.toBeNull();
    await expect(openFeedToken(token, secret, 2_000)).resolves.toBeNull();
  });

  it("rejects invalid scopes and a member scope without a member ID", async () => {
    await expect(sealFeedToken({ ...payload, scope: "all" } as never, secret)).rejects.toThrow();
    await expect(sealFeedToken({ ...payload, memberId: undefined }, secret)).rejects.toThrow();
  });
});
