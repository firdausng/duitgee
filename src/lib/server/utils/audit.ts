export interface AuditContext {
	userId: string;
	timestamp?: Date;
}

export interface CreateAuditFields {
	createdBy: string;
	createdAt: string;
}

export interface UpdateAuditFields {
	updatedBy: string;
	updatedAt: string;
}

export interface DeleteAuditFields {
	deletedBy: string;
	deletedAt: string;
}

/**
 * Generate audit fields for record creation
 * Microservice-compatible: Uses userId as string without FK constraints
 * Timestamps are stored in UTC format (ISO 8601 with Z suffix)
 */
export function createAuditFields(context: AuditContext): CreateAuditFields {
	const timestamp = context.timestamp || new Date();
	return {
		createdBy: context.userId,
		createdAt: timestamp.toISOString()
	};
}

/**
 * Generate audit fields for record updates
 * Microservice-compatible: Uses userId as string without FK constraints
 * Timestamps are stored in UTC format (ISO 8601 with Z suffix)
 */
export function updateAuditFields(context: AuditContext): UpdateAuditFields {
	const timestamp = context.timestamp || new Date();
	return {
		updatedBy: context.userId,
		updatedAt: timestamp.toISOString()
	};
}

/**
 * Generate audit fields for record deletion (soft delete)
 * Microservice-compatible: Uses userId as string without FK constraints
 * Timestamps are stored in UTC format (ISO 8601 with Z suffix)
 */
export function deleteAuditFields(context: AuditContext): DeleteAuditFields {
	const timestamp = context.timestamp || new Date();
	return {
		deletedBy: context.userId,
		deletedAt: timestamp.toISOString()
	};
}

/**
 * Merge create and update audit fields for initial record creation
 */
export function initialAuditFields(context: AuditContext): CreateAuditFields & UpdateAuditFields {
	return {
		...createAuditFields(context),
		...updateAuditFields(context)
	};
}