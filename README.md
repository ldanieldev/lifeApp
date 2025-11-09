This is an app to manage everyday parts of life:

- todos
- habits
- fitness
- budgets
- car maintenance

## Production Security Configuration

### Required Environment Variables

When deploying to production, configure the following environment variables:

#### Django Core Settings
```bash
DEBUG=False
SECRET_KEY=<strong-random-secret-key>  # Generate with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

#### Security Settings (HTTPS)
```bash
SESSION_COOKIE_SECURE=True  # Ensure session cookies only sent over HTTPS
CSRF_COOKIE_SECURE=True     # Ensure CSRF cookies only sent over HTTPS
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Database
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

#### Redis (Session Storage & Caching)
```bash
REDIS_URL=redis://host:6379/0
```

#### Email (SMTP)
```bash
EMAIL_HOST=smtp.sendgrid.net  # Or your SMTP provider
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey  # Your SMTP username
EMAIL_HOST_PASSWORD=<smtp-password>  # Your SMTP password/API key
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
SERVER_EMAIL=server@yourdomain.com
```

#### OAuth Providers (Optional)
Configure via Django Admin > Social Applications after deployment.

Alternatively, use environment variables (if provider supports):
```bash
# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=<production-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<production-secret>

# GitHub OAuth
GITHUB_OAUTH_CLIENT_ID=<production-client-id>
GITHUB_OAUTH_CLIENT_SECRET=<production-secret>
```

#### CORS Configuration
```bash
CORS_ALLOW_ALL_ORIGINS=False  # Important: Disable wildcard CORS in production
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Frontend URLs (for email links)
Update `HEADLESS_FRONTEND_URLS` in settings.py or via environment variables:
```python
HEADLESS_FRONTEND_URLS = {
    "account_confirm_email": "https://yourdomain.com/auth/verify-email/{key}",
    "account_reset_password": "https://yourdomain.com/auth/password/reset",
    "account_reset_password_from_key": "https://yourdomain.com/auth/password/reset/{key}",
    "socialaccount_login_error": "https://yourdomain.com/auth/oauth/callback",
}
```

### Security Checklist

Before deploying to production, verify:

- [ ] `DEBUG=False` in environment
- [ ] Strong `SECRET_KEY` (50+ random characters)
- [ ] `ALLOWED_HOSTS` contains only your domain(s)
- [ ] `SESSION_COOKIE_SECURE=True` (requires HTTPS)
- [ ] `CSRF_COOKIE_SECURE=True` (requires HTTPS)
- [ ] `CSRF_TRUSTED_ORIGINS` contains only your frontend domain(s)
- [ ] `CORS_ALLOW_ALL_ORIGINS=False`
- [ ] `CORS_ALLOWED_ORIGINS` contains only your frontend domain(s)
- [ ] Database uses strong password
- [ ] Redis is secured (password or network isolation)
- [ ] Email credentials are stored securely (use environment variables, not hardcoded)
- [ ] OAuth credentials are production keys (not development)
- [ ] HTTPS is enabled (required for secure cookies and WebAuthn)
- [ ] `MFA_WEBAUTHN_ALLOW_INSECURE_ORIGIN=False` (default in production)

### Session Security

The application implements secure session management:

- **Session storage:** Redis (in-memory, fast, auto-expires)
- **Session cookies:** `HttpOnly`, `Secure` (HTTPS only), `SameSite=Lax`
- **CSRF protection:** Enabled for all state-changing requests
- **Password change:** Sessions remain valid (user not logged out)
- **Remote termination:** Users can terminate other sessions from account page
- **Activity tracking:** IP address, user agent, last seen timestamp

### WebAuthn/Passkey Security

- **HTTPS required:** WebAuthn only works over HTTPS in production
- **Challenge-response:** Prevents replay attacks
- **Credential storage:** Passkeys stored hashed in database
- **Relying Party ID:** Validated against domain

### OAuth Security

- **State parameter:** Prevents CSRF attacks
- **Auto-linking:** Accounts with same email are automatically linked
- **Token storage:** OAuth tokens stored securely for profile sync
- **Provider verification:** Only configured providers are allowed

### Password Security

- **Hashing:** PBKDF2 with SHA256 (Django default)
- **Validation:** Minimum length, common passwords check, user attribute similarity
- **Reset tokens:** Time-limited, single-use
- **Change tracking:** Password changes tracked in user sessions

### Development vs Production

The application uses environment-based configuration:

**Development (DEBUG=True):**
- Insecure `SECRET_KEY` (don't use in production!)
- `ALLOWED_HOSTS=["*"]` (wildcard)
- `CORS_ALLOW_ALL_ORIGINS=True` (wildcard CORS)
- HTTP cookies allowed
- Mailpit for email testing
- WebAuthn works on localhost

**Production (DEBUG=False):**
- Must set `SECRET_KEY` via environment
- Must set `ALLOWED_HOSTS` to specific domains
- Must set `CORS_ALLOWED_ORIGINS` to specific frontend URLs
- HTTPS-only cookies (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`)
- SMTP email delivery
- WebAuthn requires HTTPS

### Notes
