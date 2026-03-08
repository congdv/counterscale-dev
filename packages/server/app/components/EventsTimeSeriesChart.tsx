import {
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ComposedChart,
    Legend,
} from "recharts";

import { useMemo } from "react";

import { Card } from "./ui/card";

// Distinct color palette for per-event series
const SERIES_COLORS = [
    { stroke: "#F46A3D", fill: "#F99C35" },
    { stroke: "#3B82F6", fill: "#93C5FD" },
    { stroke: "#10B981", fill: "#6EE7B7" },
    { stroke: "#8B5CF6", fill: "#C4B5FD" },
    { stroke: "#EF4444", fill: "#FCA5A5" },
    { stroke: "#F59E0B", fill: "#FCD34D" },
    { stroke: "#14B8A6", fill: "#5EEAD4" },
    { stroke: "#EC4899", fill: "#F9A8D4" },
];

interface EventsTimeSeriesChartProps {
    data: Array<Record<string, string | number>>;
    eventNames: string[];
    intervalType?: string;
}

function dateStringToLocalDateObj(dateString: string): Date {
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date;
}

function CustomTooltip(props: any) {
    const { active, payload, label } = props;

    if (!active || !payload || !payload.length) return null;

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
            {payload.map((entry: any) => (
                <div key={entry.dataKey} style={{ color: entry.stroke }}>
                    <span className="font-bold">• </span>
                    {`${entry.dataKey}: ${entry.value}`}
                </div>
            ))}
        </Card>
    );
}

export default function EventsTimeSeriesChart({
    data,
    eventNames,
    intervalType,
}: EventsTimeSeriesChartProps) {
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
                throw new Error("Invalid interval type");
        }
    }

    const yAxisCountTicks = useMemo(() => {
        const MAX_TICKS_TO_SHOW = 4;

        const maxValue =
            data.length > 0 && eventNames.length > 0
                ? Math.max(
                    ...data.flatMap((row) =>
                        eventNames.map((name) => Number(row[name]) || 0),
                    ),
                )
                : 0;

        if (maxValue === 0) return [1, 2, 3, 4];

        const magnitude = Math.floor(Math.log10(maxValue));
        const roundTo = Math.pow(10, Math.max(0, magnitude - 1));

        const numTicks = Math.min(MAX_TICKS_TO_SHOW, maxValue);
        const ticks = [];

        let increment = Math.floor(maxValue / numTicks);
        increment = Math.ceil(increment / roundTo) * roundTo;

        for (let i = 1; i <= numTicks + 1; i++) {
            ticks.push(i * increment);
        }

        return ticks;
    }, [data, eventNames]);

    const xAxisTicks = useMemo(
        () => data.slice(1, -1).map((entry) => entry.date as string),
        [data],
    );

    if (data.length === 0 || eventNames.length === 0) {
        return null;
    }

    return (
        <ResponsiveContainer width="100%" height="100%" minWidth={100}>
            <ComposedChart
                width={500}
                height={400}
                data={data}
                margin={{
                    top: 10,
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
                    tick={{ fill: "grey", fontSize: 14 }}
                />
                <YAxis
                    yAxisId="count"
                    domain={[0, Math.max(...yAxisCountTicks)]}
                    tickLine={false}
                    tickMargin={5}
                    ticks={yAxisCountTicks}
                    tick={{ fill: "grey", fontSize: 14 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {eventNames.map((name, i) => {
                    const color = SERIES_COLORS[i % SERIES_COLORS.length];
                    return (
                        <Area
                            key={name}
                            yAxisId="count"
                            dataKey={name}
                            stroke={color.stroke}
                            strokeWidth={2}
                            fill={color.fill}
                            fillOpacity={0.4}
                        />
                    );
                })}
            </ComposedChart>
        </ResponsiveContainer>
    );
}
