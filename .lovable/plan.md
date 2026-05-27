I’ll finish the remaining domain/branding work and then prepare the email-domain step.

1. Update website branding
- Ensure the visible site name is consistently `CallEscort24`.
- Replace any remaining old published/preview domain references in public-facing metadata with `https://callescort24.org`.
- Keep existing legal/privacy/cookie/contact pages intact, only updating domain/email references where needed.

2. Update SEO/domain metadata
- Check route `head()` metadata for canonical URLs and `og:url` values.
- Ensure sitemap/robots references use `https://callescort24.org`.
- Keep `www.callescort24.org` as an accepted custom-domain URL, but use `callescort24.org` as the main canonical domain.

3. Prepare email setup
- Your project already has the custom domain `www.callescort24.org` connected.
- No email sender domain is configured yet, so after implementation you’ll need to open the email setup flow and add a sender domain for branded emails.
- Once you complete that setup, I can continue with custom auth/app email templates if needed.

Technical notes
- I’ll only edit existing frontend/SEO files and public static files if needed.
- I won’t change database tables, authentication rules, or app behavior for this step.