import { Command } from '@nestjs/cqrs';

export class CleanOldInboundUsageHistoryCommand extends Command<void> {
    constructor() {
        super();
    }
}
