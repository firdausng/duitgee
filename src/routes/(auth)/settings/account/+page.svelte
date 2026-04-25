<script lang="ts">
    import { goto, invalidateAll } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Separator } from '$lib/components/ui/separator';
    import { updateProfileSchema } from '$lib/schemas/settings';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { authClientBase } from '$lib/client/auth-client-base';

    let { data } = $props();

    const authClient = authClientBase({ basePath: data.basePath });

    const { form, errors, enhance, constraints } = superForm(data.form, {
        validators: valibotClient(updateProfileSchema),
        SPA: true,
        dataType: 'json',
        onSubmit: () => {
            isSubmitting = true;
        },
        onUpdate: async ({ form }) => {
            isSubmitting = false;
            if (!form.valid) {
                toast.error('Please enter a valid name');
                return;
            }

            try {
                await authClient.updateUser({ name: form.data.name });
                await ofetch('/api/syncDisplayName', {
                    method: 'POST',
                    body: JSON.stringify({ displayName: form.data.name }),
                    headers: { 'Content-Type': 'application/json' },
                });
                await invalidateAll();
                toast.success('Profile updated successfully');
            } catch (error: unknown) {
                console.error('Error updating profile:', error);
                const message =
                    error instanceof Error ? error.message : 'Failed to update profile.';
                toast.error(message);
                isSubmitting = false;
            }
        },
    });

    let isSubmitting = $state(false);
</script>

<Toaster />

<form method="POST" use:enhance class="space-y-6">
    <Card>
        <CardHeader>
            <CardTitle>Profile information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
            <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={data.user?.email || ''}
                    disabled
                    class="bg-muted"
                />
                <p class="text-xs text-muted-foreground">Your email address cannot be changed</p>
            </div>

            <Separator />

            <div class="space-y-2">
                <Label for="name">
                    Name <span class="text-destructive">*</span>
                </Label>
                <Input
                    id="name"
                    name="name"
                    aria-invalid={$errors.name ? 'true' : undefined}
                    bind:value={$form.name}
                    {...$constraints.name}
                    disabled={isSubmitting}
                    placeholder="Your full name"
                    class={$errors.name ? 'border-destructive' : ''}
                />
                {#if $errors.name}
                    <p class="text-sm text-destructive">{$errors.name}</p>
                {/if}
            </div>
        </CardContent>
    </Card>

    <div class="flex justify-end gap-3">
        <Button
            type="button"
            variant="outline"
            onclick={() => goto('/vaults')}
            disabled={isSubmitting}
        >
            Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
            {#if isSubmitting}
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving…
            {:else}
                Save changes
            {/if}
        </Button>
    </div>
</form>
