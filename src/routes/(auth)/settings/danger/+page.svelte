<script lang="ts">
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { authClientBase } from '$lib/client/auth-client-base';
    import LogOut from '@lucide/svelte/icons/log-out';

    let { data } = $props();

    const authClient = authClientBase({ basePath: data.basePath });

    let signingOut = $state(false);
    async function signOut() {
        signingOut = true;
        try {
            await authClient.signOut();
            await goto('/login');
        } catch {
            signingOut = false;
        }
    }
</script>

<div class="space-y-6">
    <Card>
        <CardHeader>
            <CardTitle>Sign out</CardTitle>
            <CardDescription>End your session on this device.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button variant="outline" onclick={signOut} disabled={signingOut}>
                <LogOut class="size-4" />
                {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
        </CardContent>
    </Card>

    <Card class="border-destructive/40">
        <CardHeader>
            <CardTitle class="text-destructive">Delete account</CardTitle>
            <CardDescription>Permanent and irreversible. All vaults you own will be deleted too.</CardDescription>
        </CardHeader>
        <CardContent>
            <p class="text-sm text-muted-foreground mb-4">
                Self-serve account deletion is coming soon. To request deletion now, contact support.
            </p>
            <Button variant="destructive" disabled>Delete account</Button>
        </CardContent>
    </Card>
</div>
