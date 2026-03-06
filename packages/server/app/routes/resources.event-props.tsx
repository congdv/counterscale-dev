import { useFetcher } from "react-router";

import type { LoaderFunctionArgs } from "react-router";

import { paramsFromUrl } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";
import { requireAuth } from "~/lib/auth";

export async function loader({ context, request }: LoaderFunctionArgs) {
    await requireAuth(request, context.cloudflare.env);
    const { analyticsEngine } = context;

    const { interval, site } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";

    return {
        countsByProperty: await analyticsEngine.getCountByCustomProp1(
            site,
            interval,
            tz,
        ),
        page: 1,
    };
}

export const EventPropsCard = ({
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
    return (
        <PaginatedTableCard
            siteId={siteId}
            interval={interval}
            columnHeaders={["Event Property", "Count", "Unique Users"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/event-props"
            filters={filters}
            timezone={timezone}
        />
    );
};
