import { checkRateLimit } from "@/lib/ai/rateLimit";

const NOW = Date.UTC(2026, 0, 1, 12);

describe("checkRateLimit, in memory", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("allows 40 a minute per visitor, then asks them to slow down, then lets them back in", async () => {
    for (let i = 0; i < 40; i++) expect((await checkRateLimit("mem-a", { now: NOW + i })).ok).toBe(true);
    expect(await checkRateLimit("mem-a", { now: NOW + 100 })).toMatchObject({ ok: false, retryAfter: 30 });
    expect((await checkRateLimit("mem-b", { now: NOW + 100 })).ok).toBe(true); // others aren't affected
    expect((await checkRateLimit("mem-a", { now: NOW + 61_000 })).ok).toBe(true);
  });

  it("counts a request's cost, and doesn't spend allowance on refused requests", async () => {
    for (let i = 0; i < 19; i++) await checkRateLimit("mem-c", { cost: 2, now: NOW + i }); // 38 used
    expect((await checkRateLimit("mem-c", { cost: 2, now: NOW + 50 })).ok).toBe(true); // 40
    expect((await checkRateLimit("mem-c", { cost: 2, now: NOW + 51 })).ok).toBe(false); // would be 42
    // The refusal didn't use anything up: a cost-0 check still sees exactly 40.
    expect((await checkRateLimit("mem-c", { cost: 0, now: NOW + 52 })).ok).toBe(true);
  });
});

describe("checkRateLimit, with Upstash Redis", () => {
  const fetchMock = jest.fn();
  const realFetch = global.fetch;

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example/";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = realFetch;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  const reply = (minute: number, hour: number, day: number) =>
    ({
      ok: true,
      json: async () => [{ result: minute }, { result: 1 }, { result: hour }, { result: 1 }, { result: day }, { result: 1 }],
    }) as Response;

  it("counts in shared windows that expire on their own", async () => {
    fetchMock.mockResolvedValue(reply(1, 1, 1));
    expect((await checkRateLimit("1.2.3.4", { cost: 2, now: NOW })).ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://redis.example/pipeline");
    expect(init.headers.Authorization).toBe("Bearer test-token");
    const commands = JSON.parse(init.body);
    expect(commands[0]).toEqual(["INCRBY", `rh:m:1.2.3.4:${Math.floor(NOW / 60_000)}`, "2"]);
    expect(commands[1][0]).toBe("EXPIRE");
    expect(commands[4][1]).toBe("rh:d:2026-01-01");
  });

  it("refuses over the minute limit and over the daily cap", async () => {
    fetchMock.mockResolvedValueOnce(reply(41, 41, 41));
    expect(await checkRateLimit("1.2.3.4", { now: NOW })).toMatchObject({ ok: false, retryAfter: 30 });
    fetchMock.mockResolvedValueOnce(reply(1, 1, 3001));
    expect(await checkRateLimit("1.2.3.4", { now: NOW })).toMatchObject({ ok: false, retryAfter: 3600 });
  });

  it("lets requests through if Redis can't be reached, rather than taking the site down", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("network down"));
    expect((await checkRateLimit("1.2.3.4", { now: NOW })).ok).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
