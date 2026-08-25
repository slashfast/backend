import { z } from 'zod';

import { BANDWIDTH_STATS_ROUTES, REST_API } from '../../../api';
import { getEndpointDetails } from '../../../constants';

export namespace GetInboundTopUsersUsageCommand {
    export const url = REST_API.BANDWIDTH_STATS.INBOUNDS.GET_TOP_USERS;
    export const TSQ_url = url(':uuid');

    export const endpointDetails = getEndpointDetails(
        BANDWIDTH_STATS_ROUTES.INBOUNDS.GET_TOP_USERS(':uuid'),
        'get',
        'Get top users by traffic on this inbound for a period',
        { scope: 'inbound-top-users-usage', kind: 'read' },
        'Returns the top users by total usage over the period on this inbound, ordered by traffic descending. Underlying usage data is flushed to the database roughly every 2 minutes. Also includes a live onlineByNode breakdown (~16s TTL), independent of the date range.',
    );

    export const RequestParamSchema = z.object({
        uuid: z.uuid().describe('Config profile inbound UUID'),
    });

    export const RequestQuerySchema = z.object({
        start: z.iso.date().describe('Start date (YYYY-MM-DD)'),
        end: z.iso.date().describe('End date (YYYY-MM-DD)'),
        topUsersLimit: z.coerce.number().min(1).default(100),
    });

    export const ResponseSchema = z.object({
        response: z.object({
            inboundUuid: z.uuid(),
            onlineByNode: z
                .array(
                    z.object({
                        nodeUuid: z.uuid(),
                        count: z.number(),
                    }),
                )
                .describe(
                    'Live online users count for this inbound, broken down by node (~16s TTL)',
                ),
            topUsers: z.array(
                z.object({
                    color: z.string(),
                    userId: z.number(),
                    username: z.string(),
                    total: z.number(),
                }),
            ),
        }),
    });

    export type RequestParam = z.infer<typeof RequestParamSchema>;
    export type RequestQuery = z.infer<typeof RequestQuerySchema>;
    export type Response = z.infer<typeof ResponseSchema>;
}
