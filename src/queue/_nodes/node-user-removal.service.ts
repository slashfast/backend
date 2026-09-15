import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AxiosService } from '@common/axios';
import { buildClientEmail, parseClientEmail } from '@common/helpers/xray-config/client-email';
import { ok } from '@common/types';

import { GetAllNodesQuery } from '@modules/nodes/queries/get-all-nodes';

import { IRemoveUsersFromNodePayload } from './interfaces';

@Injectable()
export class NodeUserRemovalService {
    constructor(
        private readonly axios: AxiosService,
        private readonly queryBus: QueryBus,
    ) {}

    public async removeUsers(payload: IRemoveUsersFromNodePayload) {
        const { data, node } = payload;
        const inbounds = await this.getCleanupInbounds(payload);
        const users = Array.from(
            new Map(
                data.users.map((user) => {
                    const userId = parseClientEmail(user.userId).userId;
                    return [userId, { userId, hashUuid: user.hashUuid }] as const;
                }),
            ).values(),
        );

        // Each batch targets one identity per user. Restore tags before every batch:
        // the node removes a tag when its last user hash disappears, even if other emails remain.
        for (const inboundUuid of [
            undefined,
            ...new Set(inbounds.map((inbound) => inbound.uuid)),
        ]) {
            const restored = await this.axios.addUsers(
                { affectedInboundTags: inbounds.map((inbound) => inbound.tag), users: [] },
                node,
            );
            if (!restored.isOk || !restored.response.success) {
                return restored;
            }

            const result = await this.axios.deleteUsers(
                {
                    users: users.map((user) => ({
                        userId: buildClientEmail(BigInt(user.userId), inboundUuid),
                        hashUuid: user.hashUuid,
                    })),
                },
                node,
            );
            if (!result.isOk) {
                return result;
            }
            // success:false also means no matching email; later identity batches still need cleanup.
        }

        return ok({ success: true, error: null });
    }

    private async getCleanupInbounds(payload: IRemoveUsersFromNodePayload) {
        if (payload.cleanupInbounds) {
            return payload.cleanupInbounds;
        }

        const nodes = await this.queryBus.execute(new GetAllNodesQuery());
        if (!nodes.isOk) {
            throw new Error('Failed to resolve inbounds for a queued user removal');
        }

        const node = nodes.response.find(
            (candidate) =>
                candidate.address === payload.node.address && candidate.port === payload.node.port,
        );
        if (!node) {
            throw new Error('Node for a queued user removal no longer exists');
        }

        return node.activeInbounds;
    }
}
