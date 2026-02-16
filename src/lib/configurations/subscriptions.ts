export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionLimits {
	maxVaults: number;
}

export interface SubscriptionConfig {
	tier: SubscriptionTier;
	name: string;
	limits: SubscriptionLimits;
}

export const SUBSCRIPTION_CONFIGS: Record<SubscriptionTier, SubscriptionConfig> = {
	free: {
		tier: 'free',
		name: 'Free',
		limits: {
			maxVaults: 1
		}
	},
	premium: {
		tier: 'premium',
		name: 'Premium',
		limits: {
			maxVaults: -1 // -1 indicates unlimited
		}
	}
};

/**
 * Get subscription configuration for a tier
 */
export function getSubscriptionConfig(tier: SubscriptionTier): SubscriptionConfig {
	return SUBSCRIPTION_CONFIGS[tier];
}

/**
 * Check if user has reached vault limit
 */
export function canCreateVault(tier: SubscriptionTier, currentVaultCount: number): boolean {
	const config = getSubscriptionConfig(tier);
	if (config.limits.maxVaults === -1) return true; // Unlimited
	return currentVaultCount < config.limits.maxVaults;
}

/**
 * Get remaining vault slots for a user
 */
export function getRemainingVaults(tier: SubscriptionTier, currentVaultCount: number): number {
	const config = getSubscriptionConfig(tier);
	if (config.limits.maxVaults === -1) return -1; // Unlimited
	return Math.max(0, config.limits.maxVaults - currentVaultCount);
}
