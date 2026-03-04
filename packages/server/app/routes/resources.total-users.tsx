import type { LoaderFunctionArgs } from "react-router";
import { paramsFromUrl } from "~/lib/utils";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { Card } from "~/components/ui/card";
import { requireAuth } from "~/lib/auth";

export async function loader({ context, request }: LoaderFunctionArgs) {
    await requireAuth(request, context.cloudflare.env);
    const { analyticsEngine } = context;
    const { site } = paramsFromUrl(request.url);

    const totalUsers = await analyticsEngine.getLatestEventPropValue(
        site,
        "total_user",
    );

    return { totalUsers };
}

export const TotalUsersCard = ({ siteId }: { siteId: string }) => {
    const dataFetcher = useFetcher<typeof loader>();

    const { totalUsers } = dataFetcher.data || {};

    useEffect(() => {
        dataFetcher.submit(
            { site: siteId },
            {
                method: "get",
                action: `/resources/total-users`,
            },
        );
        // NOTE: dataFetcher is intentionally omitted from the useEffect dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteId]);

    return (
        <Card>
            <div className="p-4 pl-6">
                <div className="text-md sm:text-lg">Total Users</div>
                <div className="text-4xl">
                    {totalUsers ? totalUsers : "-"}
                </div>
            </div>
        </Card>
    );
};
