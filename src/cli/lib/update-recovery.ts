import { FileMutationRecovery } from './file-mutation-recovery.js';

export class UpdateRecovery extends FileMutationRecovery {
	constructor(projectRoot: string, backupRoot: string) {
		super(projectRoot, { backupRoot, operation: 'update' });
	}
}
