import type { ActionFunctionArgs } from "react-router";
import { writeDataPoint } from "~/analytics/collect";

interface EventPayload {
    siteId: string;
    userId: string;
    eventName: string;
    prop1?: string;
    prop2?: string;
    prop3?: string;
    country?: string;
}

export async function action({ request, context }: ActionFunctionArgs) {
    // Only allow POST requests
    if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    // Validate API key
    const authHeader = request.headers.get("Authorization");
    const expectedKey = context.cloudflare.env.COLLECTOR_API_KEY;

    if (!authHeader || !expectedKey) {
        return new Response(JSON.stringify({ error: "Missing API key" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Check if auth header matches "Bearer <key>"
    const parts = authHeader.split(" ");
    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer" ||
        parts[1] !== expectedKey
    ) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Parse JSON body
    let payload: EventPayload;
    try {
        payload = await request.json();
    } catch (err) {
        return new Response(
            JSON.stringify({ error: "Invalid JSON in request body" }),
            {
                status: 400,
                headers: { "Content-Type": "application/json" },
            },
        );
    }

    // Validate required fields
    if (!payload.siteId || !payload.userId || !payload.eventName) {
        return new Response(
            JSON.stringify({
                error: "Missing required fields: siteId, userId, eventName",
            }),
            {
                status: 400,
                headers: { "Content-Type": "application/json" },
            },
        );
    }

    // Get country from Cloudflare request properties if not provided
    const country =
        payload.country || (context.cloudflare.cf?.country as string) || "";

    // Prepare data point for Analytics Engine
    const dataPoint = {
        siteId: payload.siteId,
        userId: payload.userId,
        eventName: payload.eventName,
        customProp1: payload.prop1,
        customProp2: payload.prop2,
        customProp3: payload.prop3,
        country: country,
        // Browser pageviews leave these empty
        host: "",
        path: "",
        referrer: "",
        userAgent: "",
        browserName: "",
        browserVersion: "",
        deviceModel: "",
        deviceType: "backend",
        utmSource: "",
        utmMedium: "",
        utmCampaign: "",
        utmTerm: "",
        utmContent: "",
        // Standard doubles for events
        newVisitor: 0,
        newSession: 0,
        bounce: 0,
    };

    try {
        writeDataPoint(context.cloudflare.env.WEB_COUNTER_AE, dataPoint);
    } catch (err) {
        console.error("Failed to write event data point:", err);
        return new Response(
            JSON.stringify({ error: "Failed to record event" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}
