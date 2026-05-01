<script lang="ts">
    import { goto } from "$app/navigation";
    import { authClientBase } from "$lib/client/auth-client-base";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Eyebrow, ChapterNum, Rule, Plate } from "$lib/components/almanac";
    import { superForm } from "sveltekit-superforms";
    import { valibotClient } from "sveltekit-superforms/adapters";
    import { loginSchema } from "$lib/schemas/login";

    let { data } = $props();

    const { form, errors, enhance, delayed, message } = superForm(data.form, {
        validators: valibotClient(loginSchema),
        resetForm: false,
        onUpdated({ form }) {
            if (
                form.valid &&
                form.message &&
                typeof form.message === "object" &&
                "success" in form.message &&
                form.message.success
            ) {
                goto("/");
            }
        },
    });

    let { basePath, callbackPath } = data;
    let authClient = authClientBase({ basePath: data.basePath });
    let isGoogleLoading = $state(false);

    async function handleGoogleLogin() {
        isGoogleLoading = true;
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: callbackPath,
                errorCallbackURL: "/error",
            });
        } catch (error) {
            console.error("Google login error:", error);
        } finally {
            isGoogleLoading = false;
        }
    }
</script>

<svelte:head>
    <title>Sign in — DuitGee</title>
</svelte:head>

<div class="dg-auth">
    <div class="dg-auth__grid">
        <Plate as="article" class="dg-auth__form">
            <header class="dg-auth__head">
                <Eyebrow tone="muted">Vol. V &middot; No. 01 &middot; Sign in</Eyebrow>
                <h1 class="dg-auth__title">Welcome <em>back</em>.</h1>
                <p class="dg-auth__sub">Continue your household chronicle.</p>
            </header>
            <Rule variant="double" />

            {#if $message}
                <div class="dg-auth__alert">{$message}</div>
            {/if}

            <Button
                variant="almanac-ghost"
                onclick={handleGoogleLogin}
                disabled={isGoogleLoading || $delayed}
                class="dg-auth__google"
            >
                <svg class="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>
                {isGoogleLoading ? "Signing in…" : "Continue with Google"}
            </Button>

            <Rule variant="ornament">— or, with an email —</Rule>

            <form method="POST" use:enhance class="dg-auth__fields">
                <div class="dg-auth__field">
                    <Label for="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        bind:value={$form.email}
                        disabled={$delayed}
                        autocomplete="email"
                        class="dg-auth__input"
                        aria-invalid={$errors.email ? "true" : undefined}
                    />
                    {#if $errors.email}
                        <p class="dg-auth__err">{$errors.email}</p>
                    {/if}
                </div>

                <div class="dg-auth__field">
                    <div class="dg-auth__label-row">
                        <Label for="password">Password</Label>
                        <a href="/forgot-password" class="dg-auth__hint">Forgot it?</a>
                    </div>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        bind:value={$form.password}
                        disabled={$delayed}
                        autocomplete="current-password"
                        class="dg-auth__input"
                        aria-invalid={$errors.password ? "true" : undefined}
                    />
                    {#if $errors.password}
                        <p class="dg-auth__err">{$errors.password}</p>
                    {/if}
                </div>

                <Button
                    type="submit"
                    variant="almanac-ox"
                    class="dg-auth__submit"
                    disabled={$delayed}
                >
                    {$delayed ? "Signing in…" : "Sign in →"}
                </Button>
            </form>

            <Rule />
            <p class="dg-auth__foot">
                First time here?
                <a href="/register">Begin a vault &rarr;</a>
            </p>
        </Plate>

        <Plate variant="inverted" as="aside" class="dg-auth__aside">
            <Eyebrow tone="gold">— A note from the editor —</Eyebrow>
            <Rule variant="ornament">⁂</Rule>
            <p class="dg-auth__quote">
                <em>&ldquo;Money in a home is not a budget. It is a chronicle &mdash;</em>
                kept honestly, kept together.<em>&rdquo;</em>
            </p>
            <p class="dg-auth__attr">&mdash; Vol. I, Editor&rsquo;s preface</p>

            <ChapterNum class="dg-auth__page">— page 02 —</ChapterNum>
            <p class="dg-auth__sidenote">
                <em>From the previous issue:</em> the unidentified-charge workflow,
                AI period insights, and the household funds carousel.
            </p>
        </Plate>
    </div>

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
    .dg-auth__grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.4rem;
        align-items: stretch;
    }
    @media (min-width: 880px) {
        .dg-auth__grid {
            grid-template-columns: 1.25fr 1fr;
            gap: 2rem;
        }
    }

    /* form column */
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

    /* google button — full width override */
    :global(.dg-auth__google) {
        width: 100%;
        height: auto !important;
        padding: 0.7rem 1rem !important;
        margin-top: 0.4rem;
    }

    /* form fields */
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
    .dg-auth__label-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
    }
    .dg-auth__field :global(label) {
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 0.7rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--almanac-ink-3) !important;
    }
    .dg-auth__hint {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.82rem;
        color: var(--almanac-ink-2);
        text-decoration: underline;
        text-underline-offset: 3px;
    }
    .dg-auth__hint:hover { color: var(--almanac-oxblood); }

    /* underline-only inputs — editorial form treatment */
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

    .dg-auth__err {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.85rem;
        color: var(--almanac-oxblood);
        margin: 0.2rem 0 0;
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

    /* aside column */
    :global(.dg-auth__aside) {
        padding: clamp(1.8rem, 3vw, 2.6rem) clamp(1.6rem, 3vw, 2.4rem) !important;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 0.4rem;
    }
    .dg-auth__quote {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 320;
        font-size: clamp(1.3rem, 2vw, 1.6rem);
        line-height: 1.35;
        margin: 0.8rem 0 0;
        color: var(--almanac-paper);
        letter-spacing: -0.012em;
    }
    .dg-auth__quote em {
        font-style: italic;
        color: var(--almanac-gold);
    }
    .dg-auth__attr {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--almanac-gold);
        margin: 1.2rem 0 0;
        opacity: 0.8;
    }
    :global(.dg-auth__page) {
        margin: 2rem 0 0.4rem;
        display: block;
        color: var(--almanac-gold) !important;
    }
    .dg-auth__sidenote {
        font-family: 'Newsreader', serif;
        font-size: 0.92rem;
        line-height: 1.55;
        color: var(--almanac-paper);
        opacity: 0.78;
        margin: 0;
    }
    .dg-auth__sidenote em {
        font-style: italic;
        color: var(--almanac-gold);
        opacity: 1;
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
