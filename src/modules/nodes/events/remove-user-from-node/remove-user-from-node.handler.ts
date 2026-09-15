import { Logger } from '@nestjs/common';
import { IEventHandler, EventsHandler } from '@nestjs/cqrs';

import { RemoveUserCommand as RemoveUserFromNodeCommandSdk } from '@remnawave/node-contract';

import { INodeConnectionOpts } from '@common/axios';
import { buildClientEmail } from '@common/helpers/xray-config/client-email';

import { NodesQueuesService } from '@queue/_nodes';

import { NodesRepository } from '../../repositories/nodes.repository';
import { RemoveUserFromNodeEvent } from './remove-user-from-node.event';

@EventsHandler(RemoveUserFromNodeEvent)
export class RemoveUserFromNodeHandler implements IEventHandler<RemoveUserFromNodeEvent> {
    public readonly logger = new Logger(RemoveUserFromNodeHandler.name);

    constructor(
        private readonly nodesRepository: NodesRepository,
        private readonly nodesQueuesService: NodesQueuesService,
    ) {}
    async handle(event: RemoveUserFromNodeEvent) {
        try {
            const nodes = await this.nodesRepository.findConnectedNodes();

            if (nodes.length === 0) {
                return;
            }

            // Email is per-inbound (id@inboundUuid). We don't know which
            // of a node's inbounds the user was actually added to, so for every
            // inbound the node currently serves we try removing the user's
            // corresponding per-inbound email — no-ops where the user was never
            // a member of that inbound.
            const requests: {
                data: RemoveUserFromNodeCommandSdk.Request;
                node: INodeConnectionOpts;
            }[] = [];

            for (const node of nodes) {
                const inbounds =
                    node.activeInbounds.length > 0 ? node.activeInbounds : [{ uuid: undefined }];

                for (const inbound of inbounds) {
                    requests.push({
                        data: {
                            username: buildClientEmail(event.id, inbound.uuid),
                            hashData: {
                                vlessUuid: event.vlessUuid,
                            },
                        },
                        node: { address: node.address, port: node.port, proxyUrl: node.proxyUrl },
                    });
                }

                requests.push({
                    data: {
                        username: event.id.toString(),
                        hashData: {
                            vlessUuid: event.vlessUuid,
                        },
                    },
                    node: { address: node.address, port: node.port, proxyUrl: node.proxyUrl },
                });
            }

            await this.nodesQueuesService.removeUserFromNodeBulk(requests);

            return;
        } catch (error) {
            this.logger.error(`Error in Event RemoveUserFromNodeHandler: ${error}`);
        }
    }
}
