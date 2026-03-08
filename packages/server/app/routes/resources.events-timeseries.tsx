import type { LoaderFunctionArgs } from "react-router";
import {
    getFiltersFromSearchParams,
    paramsFromUrl,
    getIntervalType,
    getDateTimeRange,
} from "~/lib/utils";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { Card, CardContent } from "~/components/ui/card";
import EventsTimeSeriesChart from "~/components/EventsTimeSeriesChart";
import { SearchFilters } from "~/lib/types";
import { requireAuth } from "~/lib/auth";

export async function loader({ context, request }: LoaderFunctionArgs) {
    await requireAuth(request, context.cloudflare.env);

    const { analyticsEngine } = context;
    const { interval, site } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";
    const filters = getFiltersFromSearchParams(url.searchParams);

    const intervalType = getIntervalType(interval);
    const { startDate, endDate } = getDateTimeRange(interval, tz);

    const eventsGroupedByInterval = await analyticsEngine.getEventsGroupedByInterval(
        site,
        intervalType,
        startDate,
        endDate,
        tz,
        filters,
    );

    // Collect all event names across all buckets
    const eventNamesSet = new Set<string>();
    eventsGroupedByInterval.forEach(([, counts]: [string, Record<string, number>]) => {
        Object.keys(counts).forEach((name) => eventNamesSet.add(name));
    });
    const eventNames = [...eventNamesSet].sort();

    // Build chartData: each row is { date, [eventName]: count, ... }
    const chartData = eventsGroupedByInterval.map(
        ([date, counts]: [string, Record<string, number>]) => ({
            date,
            ...Object.fromEntries(
                eventNames.map((name) => [name, counts[name] ?? 0]),
            ),
        }),
    );

    return {
        chartData,
        eventNames,
        intervalType,
    };
}

export const EventsTimeSeriesCard = ({
    siteId,
    interval,
    filters,
    timezone,
}: {
    siteId: string;
    interval: string;
    filters: SearchFilters;
    timezone: string;
}) => {
    const dataFetcher = useFetcher<typeof loader>();
    const { chartData, eventNames, intervalType } = dataFetcher.data || {};

    useEffect(() => {
        const params = {
            site: siteId,
            interval,
            timezone,
            ...filters,
        };

        dataFetcher.submit(params, {
            method: "get",
            action: `/resources/events-timeseries`,
        });
        // NOTE: dataFetcher is intentionally omitted from the useEffect dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteId, interval, filters, timezone]);

    return (
        <Card>
            <CardContent>
                <div className="h-72 pt-6 -m-4 -mr-10 -ml-10 sm:-m-2 sm:-ml-6 sm:-mr-6">
                    {chartData && eventNames && (
                        <EventsTimeSeriesChart
                            data={chartData}
                            eventNames={eventNames}
                            intervalType={intervalType}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
