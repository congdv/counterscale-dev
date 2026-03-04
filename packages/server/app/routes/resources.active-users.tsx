import type { LoaderFunctionArgs } from "react-router";
import { getFiltersFromSearchParams, paramsFromUrl } from "~/lib/utils";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { Card } from "~/components/ui/card";
import { SearchFilters } from "~/lib/types";
import { requireAuth } from "~/lib/auth";

export async function loader({ context, request }: LoaderFunctionArgs) {
    await requireAuth(request, context.cloudflare.env);
    const { analyticsEngine } = context;
    const { interval, site } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";
    const filters = getFiltersFromSearchParams(url.searchParams);

    const activeUsers = await analyticsEngine.getActiveUsers(
        site,
        interval,
        tz,
        filters,
    );

    return { activeUsers };
}

export const ActiveUsersCard = ({
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

    const { activeUsers } = dataFetcher.data || {};
    const countFormatter = Intl.NumberFormat("en", { notation: "compact" });

    useEffect(() => {
        const params = {
            site: siteId,
            interval,
            timezone,
            ...filters,
        };

        dataFetcher.submit(params, {
            method: "get",
            action: `/resources/active-users`,
        });
        // NOTE: dataFetcher is intentionally omitted from the useEffect dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteId, interval, filters, timezone]);

    return (
        <Card>
            <div className="p-4 pl-6">
                <div className="text-md sm:text-lg">Active Users</div>
                <div className="text-4xl">
                    {activeUsers !== undefined
                        ? countFormatter.format(activeUsers)
                        : "-"}
                </div>
            </div>
        </Card>
    );
};
