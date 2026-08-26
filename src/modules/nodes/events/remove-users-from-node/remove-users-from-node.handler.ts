import { Logger } from '@nestjs/common';
import { IEventHandler, EventsHandler } from '@nestjs/cqrs';

import { RemoveUsersCommand as RemoveUsersFromNodeCommandSdk } from '@remnawave/node-contract';

import { buildClientEmail } from '@common/helpers/xray-config/client-email';

import { NodesQueuesService } from '@queue/_nodes';

import { NodesRepository } from '../../repositories/nodes.repository';
import { RemoveUsersFromNodeEvent } from './remove-users-from-node.event';

@EventsHandler(RemoveUsersFromNodeEvent)
export class RemoveUsersFromNodeHandler implements IEventHandler<RemoveUsersFromNodeEvent> {
    public readonly logger = new Logger(RemoveUsersFromNodeHandler.name);

    constructor(
        private readonly nodesRepository: NodesRepository,
        private readonly nodesQueuesService: NodesQueuesService,
    ) {}
    async handle(event: RemoveUsersFromNodeEvent) {
        try {
            const nodes = await this.nodesRepository.findConnectedNodes();

            if (nodes.length === 0 || event.users.length === 0) {
                return;
            }

            // Email is per-inbound (id@inboundUuid), so a single batch can
            // only target one inbound's emails at a time. We batch all users
            // per (node, inbound) pair instead of per node — still one call per
            // inbound rather than one call per user.
            const requests: Promise<unknown>[] = [];

            for (const node of nodes) {
                const inbounds =
                    node.activeInbounds.length > 0
                        ? node.activeInbounds
                        : [{ uuid: undefined }];

                for (const inbound of inbounds) {
                    const userData: RemoveUsersFromNodeCommandSdk.Request = {
                        users: event.users.map((user) => ({
                            userId: buildClientEmail(user.id, inbound.uuid),
                            hashUuid: user.vlessUuid,
                        })),
                    };

                    requests.push(
                        this.nodesQueuesService.removeUsersFromNode({
                            data: userData,
                            node: {
                                address: node.address,
                                port: node.port,
                                proxyUrl: node.proxyUrl,
                            },
                        }),
                    );
                }
            }

            await Promise.all(requests);

            return;
        } catch (error) {
            this.logger.error(`Error in Event RemoveUsersFromNodeHandler: ${error}`);
        }
    }
}
