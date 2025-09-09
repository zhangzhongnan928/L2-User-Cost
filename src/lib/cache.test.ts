import { describe, it, expect, vi } from "vitest";
import { TimedCache } from "./cache";

describe("TimedCache", () => {
  it("returns cached within ttl", () => {
    const c = new TimedCache<number>(1000);
    c.set("a", 1);
    const v = c.get("a");
    expect(v?.value).toBe(1);
  });

  it("expires after ttl", () => {
    vi.useFakeTimers();
    const c = new TimedCache<number>(1000);
    c.set("a", 1);
    vi.advanceTimersByTime(1001);
    const v = c.get("a");
    expect(v).toBeUndefined();
    vi.useRealTimers();
  });
});

