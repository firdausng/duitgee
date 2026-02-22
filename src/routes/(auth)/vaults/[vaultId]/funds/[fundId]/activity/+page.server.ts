export const ssr = false;

export const load = async ({ params }: { params: { vaultId: string; fundId: string } }) => {
    return { vaultId: params.vaultId, fundId: params.fundId };
};
