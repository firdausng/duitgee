import { syncUserDisplayName } from "$lib/server/utils/syncUserDisplayName";

export const syncDisplayName = async (
	session: App.AuthSession,
	displayName: string,
	env: Cloudflare.Env
) => {
	const result = await syncUserDisplayName(session.user.id, displayName, env);

	return {
		success: true,
		count: result.count,
		message: `Updated ${result.count} vault membership(s)`
	};
};
