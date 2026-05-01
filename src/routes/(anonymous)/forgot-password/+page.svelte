<script lang="ts">
    import { authClientBase } from "$lib/client/auth-client-base";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Eyebrow, Rule, Plate } from "$lib/components/almanac";

    let { data } = $props();

    let authClient = authClientBase({ basePath: data.basePath });

    let email = $state("");
    let isLoading = $state(false);
    let errorMessage = $state("");
    let successMessage = $state("");

    async function handleForgotPassword() {
        errorMessage = "";
        successMessage = "";

        if (!email) {
            errorMessage = "Email is required";
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMessage = "Please enter a valid email address";
            return;
        }

        isLoading = true;
        try {
            await authClient.requestPasswordReset({
                email,
                redirectTo: data.basePath + "/reset-password",
            });

            successMessage = `Reset instructions have been sent to ${email}. Check your inbox and spam folder.`;
            email = "";
        } catch (error) {
            errorMessage =
                error instanceof Error ? error.message : "Failed to send reset email. Please try again.";
        } finally {
            isLoading = false;
        }
    }
</script>

<svelte:head>
    <title>Forgot password — DuitGee</title>
</svelte:head>

<div class="dg-auth dg-auth--single">
    <Plate as="article" class="dg-auth__form">
        <header class="dg-auth__head">
            <Eyebrow tone="muted">Vol. V &middot; A small request</Eyebrow>
            <h1 class="dg-auth__title">Forgot the <em>password</em>?</h1>
            <p class="dg-auth__sub">
                We&rsquo;ll send instructions to your inbox.
            </p>
        </header>
        <Rule variant="double" />

        {#if successMessage}
            <div class="dg-auth__ok">{successMessage}</div>
        {/if}

        {#if errorMessage}
            <div class="dg-auth__alert">{errorMessage}</div>
        {/if}

        <form
            onsubmit={(e) => {
                e.preventDefault();
                handleForgotPassword();
            }}
            class="dg-auth__fields"
        >
            <div class="dg-auth__field">
                <Label for="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    bind:value={email}
                    disabled={isLoading}
                    autocomplete="email"
                    class="dg-auth__input"
                />
            </div>

            <Button
                type="submit"
                variant="almanac-ox"
                class="dg-auth__submit"
                disabled={isLoading}
            >
                {isLoading ? "Sending…" : "Send reset instructions →"}
            </Button>
        </form>

        <Rule />
        <p class="dg-auth__foot">
            Remembered it?
            <a href="/login">Sign in &rarr;</a>
        </p>
    </Plate>

    <p class="dg-auth__legal">
        <a href="/privacy">Privacy policy</a>
        <span aria-hidden="true">·</span>
        <a href="/terms">Terms of service</a>
    </p>
</div>

<style>
    .dg-auth {
        min-height: calc(100vh - 4rem);
        max-width: 86rem;
        margin: 0 auto;
        padding: clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 3rem);
        display: flex;
        flex-direction: column;
        gap: 2rem;
        color: var(--almanac-ink);
    }
    .dg-auth--single {
        align-items: center;
    }
    :global(.dg-auth--single .dg-auth__form) {
        width: 100%;
        max-width: 32rem;
    }

    :global(.dg-auth__form) {
        padding: clamp(1.6rem, 3vw, 2.4rem) clamp(1.4rem, 3vw, 2.4rem) !important;
        display: flex;
        flex-direction: column;
        gap: 0;
    }
    .dg-auth__head { margin-bottom: 0; }
    .dg-auth__title {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 50, 'wght' 400;
        font-size: clamp(2rem, 4vw, 2.6rem);
        line-height: 1.05;
        letter-spacing: -0.018em;
        margin: 0.6rem 0 0.4rem;
        color: var(--almanac-ink);
    }
    .dg-auth__title em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 380;
        color: var(--almanac-oxblood);
    }
    .dg-auth__sub {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 1rem;
        color: var(--almanac-ink-2);
        margin: 0;
    }

    .dg-auth__alert {
        background: transparent;
        color: var(--almanac-oxblood);
        border: 1px solid var(--almanac-oxblood);
        padding: 0.7rem 0.9rem;
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }
    .dg-auth__ok {
        background: transparent;
        color: var(--almanac-forest);
        border: 1px solid var(--almanac-forest);
        padding: 0.7rem 0.9rem;
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }

    .dg-auth__fields {
        display: flex;
        flex-direction: column;
        gap: 1.2rem;
    }
    .dg-auth__field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }
    .dg-auth__field :global(label) {
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 0.7rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--almanac-ink-3) !important;
    }

    :global(.dg-auth__input) {
        border: none !important;
        border-bottom: 1px solid var(--almanac-ink) !important;
        border-radius: 0 !important;
        background: transparent !important;
        padding: 0.4rem 0 !important;
        height: auto !important;
        font-family: 'Newsreader', serif !important;
        font-size: 1rem !important;
        color: var(--almanac-ink) !important;
        box-shadow: none !important;
    }
    :global(.dg-auth__input:focus-visible) {
        outline: none !important;
        border-bottom-color: var(--almanac-oxblood) !important;
        border-bottom-width: 2px !important;
        margin-bottom: -1px;
    }
    :global(.dg-auth__input::placeholder) {
        font-style: italic;
        color: var(--almanac-ink-3);
    }

    :global(.dg-auth__submit) {
        width: 100%;
        margin-top: 0.6rem;
        height: auto !important;
        padding: 0.85rem 1rem !important;
        font-size: 0.95rem !important;
    }

    .dg-auth__foot {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.95rem;
        color: var(--almanac-ink-2);
        margin: 0;
        text-align: center;
    }
    .dg-auth__foot a {
        color: var(--almanac-oxblood);
        text-decoration: underline;
        text-underline-offset: 3px;
        font-style: italic;
    }

    .dg-auth__legal {
        text-align: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        color: var(--almanac-ink-3);
        margin: 0;
    }
    .dg-auth__legal a {
        color: var(--almanac-ink-2);
        text-decoration: none;
    }
    .dg-auth__legal a:hover { color: var(--almanac-oxblood); }
    .dg-auth__legal span { margin: 0 0.6rem; }
</style>
