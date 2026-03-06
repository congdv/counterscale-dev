import type { LoaderFunctionArgs } from "react-router";
import {
    paramsFromUrl,
    getIntervalType,
    getDateTimeRange,
} from "~/lib/utils";
import { useEffect, useMemo } from "react";
import { useFetcher } from "react-router";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { requireAuth } from "~/lib/auth";

export async function loader({ context, request }: LoaderFunctionArgs) {
    await requireAuth(request, context.cloudflare.env);

    const { analyticsEngine } = context;
    const { interval, site } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";

    const intervalType = getIntervalType(interval);
    const { startDate, endDate } = getDateTimeRange(interval, tz);

    const rawData = await analyticsEngine.getTotalUsersGroupedByInterval(
        site,
        intervalType,
        startDate,
        endDate,
        tz,
    );

    const chartData = rawData.map(([date, totalUsers]: [string, number]) => ({
        date,
        totalUsers,
    }));

    return { chartData, intervalType };
}

function dateStringToLocalDateObj(dateString: string): Date {
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date;
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;

    const date = dateStringToLocalDateObj(label);
    const formattedDate = date.toLocaleString("en-us", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZoneName: "short",
    });

    return (
        <Card className="p-2 shadow-lg leading-normal">
            <div className="font-semibold">{formattedDate}</div>
            <div className="before:content-['•'] before:text-blue-500 before:font-bold">
                {" "}
                {`${payload[0].value.toLocaleString()} total users`}
            </div>
        </Card>
    );
}

export const TotalUsersTimeSeriesCard = ({
    siteId,
    interval,
    timezone,
}: {
    siteId: string;
    interval: string;
    timezone: string;
}) => {
    const dataFetcher = useFetcher<typeof loader>();
    const { chartData, intervalType } = dataFetcher.data || {};

    useEffect(() => {
        dataFetcher.submit(
            { site: siteId, interval, timezone },
            {
                method: "get",
                action: `/resources/total-users-timeseries`,
            },
        );
        // NOTE: dataFetcher is intentionally omitted from the useEffect dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteId, interval, timezone]);

    function xAxisDateFormatter(date: string): string {
        const dateObj = dateStringToLocalDateObj(date);
        switch (intervalType) {
            case "DAY":
                return dateObj.toLocaleDateString("en-us", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                });
            case "HOUR":
                return dateObj.toLocaleTimeString("en-us", {
                    hour: "numeric",
                    minute: "numeric",
                });
            default:
                return date;
        }
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const xAxisTicks = useMemo(
        () => (chartData ?? []).slice(1, -1).map((entry: { date: string; totalUsers: number }) => entry.date),
        [chartData],
    );

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-md sm:text-lg font-medium">
                    Total Users Over Time
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-64">
                    {chartData && chartData.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={chartData}
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickMargin={8}
                                    ticks={xAxisTicks}
                                    tickFormatter={xAxisDateFormatter}
                                    tick={{ fill: "grey", fontSize: 12 }}
                                />
                                <YAxis
                                    tick={{ fill: "grey", fontSize: 12 }}
                                    tickFormatter={(v) =>
                                        v >= 1000
                                            ? `${(v / 1000).toFixed(1)}k`
                                            : String(v)
                                    }
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="totalUsers"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
