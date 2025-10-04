"""URL configuration for the authentication app."""

from django.urls import path

from authentication import views

app_name = "authentication"

urlpatterns = [
    # Authentication Endpoints
    path("register", views.RegisterView.as_view(), name="register"),
    path("login", views.LoginView.as_view(), name="login"),
    path("logout", views.LogoutView.as_view(), name="logout"),
    path("token/refresh", views.TokenRefreshView.as_view(), name="token_refresh"),
    # Password Management
    path("password/reset", views.PasswordResetRequestView.as_view(), name="password_reset_request"),
    path(
        "password/reset/confirm/<str:uidb64>/<str:token>",
        views.PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path("password/change", views.PasswordChangeView.as_view(), name="password_change"),
    # Email Verification
    path(
        "email/verify/confirm/<str:uidb64>/<str:token>",
        views.EmailVerificationView.as_view(),
        name="email_verification",
    ),
    # Passkey (WebAuthn) Endpoints
    path("passkey/signup/begin", views.PasskeySignupBeginView.as_view(), name="passkey_signup_begin"),
    path("passkey/signup/complete", views.PasskeySignupCompleteView.as_view(), name="passkey_signup_complete"),
    path("passkey/login/begin", views.PasskeyAuthenticationBeginView.as_view(), name="passkey_login_begin"),
    path("passkey/login/complete", views.PasskeyAuthenticationCompleteView.as_view(), name="passkey_login_complete"),
    path(
        "passkey/register/begin",
        views.PasskeyRegistrationBeginView.as_view(),
        name="passkey_registration_begin",
    ),
    path(
        "passkey/register/complete",
        views.PasskeyRegistrationCompleteView.as_view(),
        name="passkey_registration_complete",
    ),
    # User Account Endpoints
    path("user", views.UserProfileView.as_view(), name="user_profile"),
    path("user/providers", views.UserProvidersView.as_view(), name="user_providers"),
    path("user/passkeys", views.UserPasskeyListView.as_view(), name="user_passkeys"),
    path("user/passkeys/<int:pk>", views.UserPasskeyDetailView.as_view(), name="user_passkey_detail"),
]
