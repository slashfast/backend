import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ConfigProfileRepository } from '../../repositories/config-profile.repository';
import { CleanOldInboundUsageHistoryCommand } from './clean-old-inbound-usage-history.command';

@CommandHandler(CleanOldInboundUsageHistoryCommand)
export class CleanOldInboundUsageHistoryHandler implements ICommandHandler<CleanOldInboundUsageHistoryCommand> {
    public readonly logger = new Logger(CleanOldInboundUsageHistoryHandler.name);

    constructor(private readonly configProfileRepository: ConfigProfileRepository) {}

    async execute(): Promise<void> {
        try {
            await this.configProfileRepository.cleanOldInboundUsageRecords();
        } catch (error: unknown) {
            this.logger.error(`Error during inbound usage history cleanup: ${error}`);
        }
    }
}
