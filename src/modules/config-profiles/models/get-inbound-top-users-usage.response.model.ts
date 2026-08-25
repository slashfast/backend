import { colorFromId } from '@kastov/uuid-color';

import {
    IGetUniversalTopUser,
    IGetUniversalTopUserConverted,
} from '@modules/nodes-user-usage-history/interfaces';

export class GetInboundTopUsersUsageResponseModel {
    public readonly inboundUuid: string;
    public readonly onlineByNode: { nodeUuid: string; count: number }[];
    public readonly topUsers: IGetUniversalTopUserConverted[];

    constructor(data: {
        inboundUuid: string;
        onlineByNode: { nodeUuid: string; count: number }[];
        topUsers: IGetUniversalTopUser[];
    }) {
        this.inboundUuid = data.inboundUuid;
        this.onlineByNode = data.onlineByNode;
        this.topUsers = data.topUsers.map((item) => ({
            color: colorFromId(item.userId),
            userId: Number(item.userId),
            username: item.username,
            total: Number(item.total),
        }));
    }
}
