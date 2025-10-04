#!/usr/bin/env python
"""Script to test authentication API endpoints."""

import requests

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/auth"


class Colors:
    """ANSI color codes for colored terminal output."""

    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    END = "\033[0m"


def print_success(msg):
    """Print a success message in green color.

    Args:
        msg (str): The message to display.

    """
    print(f"{Colors.GREEN}✅ {msg}{Colors.END}")


def print_error(msg):
    """Print an error message in red color.

    Args:
        msg (str): The message to display.

    """
    print(f"{Colors.RED}❌ {msg}{Colors.END}")


def print_info(msg):
    """Print an informational message in blue color.

    Args:
        msg (str): The message to display.

    """
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.END}")


def print_warning(msg):
    """Print a warning message in yellow color.

    Args:
        msg (str): The message to display.

    """
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.END}")


def print_section(title):
    """Print a section title with formatting."""
    print(f"\n{Colors.BLUE}{'=' * 60}")
    print(f"{title}")
    print(f"{'=' * 60}{Colors.END}\n")


def test_register():
    """Test user registration endpoint."""
    print_section("Testing User Registration")

    url = f"{API_BASE}/register"
    data = {"email": "newuser@example.com", "password": "NewUser123!", "first_name": "New", "last_name": "User"}

    try:
        response = requests.post(url, json=data)
        print_info(f"POST {url}")
        print_info(f"Status: {response.status_code}")

        if response.status_code == 201:
            result = response.json()
            print_success("Registration successful!")
            print_info(f"User: {result.get('user', {}).get('email')}")
            print_info(f"Access token received: {bool(result.get('access_token'))}")
            return result
        else:
            print_warning(f"Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None


def test_login():
    """Test user login endpoint."""
    print_section("Testing User Login")

    url = f"{API_BASE}/login"
    data = {"email": "user1@example.com", "password": "Test123!"}

    try:
        response = requests.post(url, json=data)
        print_info(f"POST {url}")
        print_info(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print_success("Login successful!")
            print_info(f"User: {result.get('user', {}).get('email')}")
            print_info(f"Access token: {result.get('access_token')[:20]}...")
            print_info(f"Refresh token cookie: {bool(response.cookies.get('refresh_token'))}")
            return result, response.cookies
        else:
            print_error(f"Login failed: {response.text}")
            return None, None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None, None


def test_get_user_profile(access_token):
    """Test getting user profile."""
    print_section("Testing Get User Profile")

    url = f"{API_BASE}/user"
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        response = requests.get(url, headers=headers)
        print_info(f"GET {url}")
        print_info(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print_success("Profile retrieved successfully!")
            print_info(f"Email: {result.get('email')}")
            print_info(f"Name: {result.get('first_name')} {result.get('last_name')}")
            return result
        else:
            print_error(f"Failed: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None


def test_update_user_profile(access_token):
    """Test updating user profile."""
    print_section("Testing Update User Profile")

    url = f"{API_BASE}/user"
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {"first_name": "Updated", "last_name": "Name"}

    try:
        response = requests.patch(url, json=data, headers=headers)
        print_info(f"PATCH {url}")
        print_info(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print_success("Profile updated successfully!")
            print_info(f"New name: {result.get('first_name')} {result.get('last_name')}")
            return result
        else:
            print_error(f"Failed: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None


def test_get_providers(access_token):
    """Test getting connected providers."""
    print_section("Testing Get Connected Providers")

    url = f"{API_BASE}/user/providers"
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        response = requests.get(url, headers=headers)
        print_info(f"GET {url}")
        print_info(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print_success("Providers retrieved successfully!")
            for provider in result:
                status = "Connected" if provider.get("connected") else "Not connected"
                print_info(f"  {provider.get('name')}: {status}")
            return result
        else:
            print_error(f"Failed: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None


def test_token_refresh(cookies):
    """Test token refresh endpoint."""
    print_section("Testing Token Refresh")

    url = f"{API_BASE}/token/refresh"

    try:
        response = requests.post(url, cookies=cookies)
        print_info(f"POST {url}")
        print_info(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print_success("Token refresh successful!")
            print_info(f"New access token: {result.get('access_token')[:20]}...")
            return result
        else:
            print_error(f"Failed: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None


def test_password_reset_request():
    """Test password reset request."""
    print_section("Testing Password Reset Request")

    url = f"{API_BASE}/password/reset"
    data = {"email": "user1@example.com"}

    try:
        response = requests.post(url, json=data)
        print_info(f"POST {url}")
        print_info(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print_success("Password reset email sent!")
            print_info(f"Message: {result.get('message')}")
            return result
        else:
            print_error(f"Failed: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None


def test_logout(access_token, cookies):
    """Test logout endpoint."""
    print_section("Testing Logout")

    url = f"{API_BASE}/logout"
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        response = requests.post(url, headers=headers, cookies=cookies)
        print_info(f"POST {url}")
        print_info(f"Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print_success("Logout successful!")
            print_info(f"Message: {result.get('message')}")
            return result
        else:
            print_error(f"Failed: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None


def main():
    """Run all API tests."""
    print(f"{Colors.BLUE}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║         Authentication API Endpoint Tests                 ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}")

    print_warning("Make sure the Django development server is running on http://localhost:8000")
    print_warning("Run: python manage.py runserver\n")

    # Test login first (using existing user)
    login_result, cookies = test_login()
    if not login_result:
        print_error("\n❌ Login failed. Cannot continue with authenticated tests.")
        print_info("Make sure the server is running and test users exist.")
        return

    access_token = login_result.get("access_token")

    # Test authenticated endpoints
    test_get_user_profile(access_token)
    test_update_user_profile(access_token)
    test_get_providers(access_token)
    test_token_refresh(cookies)

    # Test password reset
    test_password_reset_request()

    # Test logout
    test_logout(access_token, cookies)

    # Test registration (creates a new user)
    test_register()

    print(f"\n{Colors.GREEN}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                   Testing Complete!                        ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_warning("\n\nTests interrupted by user")
    except Exception as e:
        print_error(f"\n\nUnexpected error: {str(e)}")
