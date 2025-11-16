import {admin, anonymous, bearer, organization, type UserWithRole} from "better-auth/plugins";

export const plugins = [
    bearer(),
    admin(),
    organization({
        teams: {
            enabled: true,
            //maximumTeams: 10, // Optional: limit teams per organization
            allowRemovingAllTeams: false, // Optional: prevent removing the last team
        },
        allowUserToCreateOrganization: async (user: UserWithRole) => {
            // const subscription = await getSubscription(user.email);

            return true;
        },
        organizationLimit: async (user: UserWithRole) => {
            // const subscription = await getSubscription(user.email);

            return user.role === "admin";
        },

    }),
    anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
            // perform vault ownership migration here
            // perform vault membership migration here
        },
    }),
]
