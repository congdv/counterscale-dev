import { Mock, describe, expect, test, vi } from "vitest";
import type { AnalyticsEngineDataset } from "@cloudflare/workers-types";

describe("POST /api/event route", () => {
    test("rejects requests without Authorization header", async () => {
        const request = new Request("http://localhost/api/event", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                siteId: "test-site",
                userId: "user123",
                eventName: "purchase",
            }),
        });

        const context = {
            cloudflare: {
                env: {
                    COLLECTOR_API_KEY: "test-key",
                    WEB_COUNTER_AE: {
                        writeDataPoint: vi.fn(),
                    } as AnalyticsEngineDataset,
                },
                cf: { country: "US" },
            },
        };

        // Import and call the action function
        const { action } = await import(
            "~/routes/api.event"
        );

        const response = await action({ request, context } as any);

        expect(response.status).toBe(401);
        const json = await response.json();
        expect(json.error).toContain("Missing API key");
    });

    test("rejects requests with invalid API key", async () => {
        const request = new Request("http://localhost/api/event", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer invalid-key",
            },
            body: JSON.stringify({
                siteId: "test-site",
                userId: "user123",
                eventName: "purchase",
            }),
        });

        const context = {
            cloudflare: {
                env: {
                    COLLECTOR_API_KEY: "test-key",
                    WEB_COUNTER_AE: {
                        writeDataPoint: vi.fn(),
                    } as AnalyticsEngineDataset,
                },
                cf: { country: "US" },
            },
        };

        const { action } = await import(
            "~/routes/api.event"
        );

        const response = await action({ request, context } as any);

        expect(response.status).toBe(401);
        const json = await response.json();
        expect(json.error).toContain("Invalid API key");
    });

    test("rejects requests missing required fields", async () => {
        const request = new Request("http://localhost/api/event", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer test-key",
            },
            body: JSON.stringify({
                siteId: "test-site",
                // missing userId and eventName
            }),
        });

        const context = {
            cloudflare: {
                env: {
                    COLLECTOR_API_KEY: "test-key",
                    WEB_COUNTER_AE: {
                        writeDataPoint: vi.fn(),
                    } as AnalyticsEngineDataset,
                },
                cf: { country: "US" },
            },
        };

        const { action } = await import(
            "~/routes/api.event"
        );

        const response = await action({ request, context } as any);

        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.error).toContain("Missing required fields");
    });

    test("accepts valid event with correct API key", async () => {
        const writeDataPointMock = vi.fn();
        const request = new Request("http://localhost/api/event", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer test-key",
            },
            body: JSON.stringify({
                siteId: "test-site",
                userId: "user123",
                eventName: "purchase",
                prop1: "premium",
                prop2: "usd",
                prop3: "100",
            }),
        });

        const context = {
            cloudflare: {
                env: {
                    COLLECTOR_API_KEY: "test-key",
                    WEB_COUNTER_AE: {
                        writeDataPoint: writeDataPointMock,
                    } as AnalyticsEngineDataset,
                },
                cf: { country: "US" },
            },
        };

        const { action } = await import(
            "~/routes/api.event"
        );

        const response = await action({ request, context } as any);

        expect(response.status).toBe(200);
        expect(writeDataPointMock).toHaveBeenCalled();

        const json = await response.json();
        expect(json.ok).toBe(true);
    });

    test("rejects non-POST requests", async () => {
        const request = new Request("http://localhost/api/event", {
            method: "GET",
        });

        const context = {
            cloudflare: {
                env: {
                    COLLECTOR_API_KEY: "test-key",
                    WEB_COUNTER_AE: {
                        writeDataPoint: vi.fn(),
                    } as AnalyticsEngineDataset,
                },
                cf: { country: "US" },
            },
        };

        const { action } = await import(
            "~/routes/api.event"
        );

        const response = await action({ request, context } as any);

        expect(response.status).toBe(405);
    });
});
