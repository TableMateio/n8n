# Troubleshooting Guide

## Safari Can't Establish Secure Connection to `https://localhost:5678`

If n8n is running correctly and accessible via Chrome, but Safari shows an error like "Safari can't open the page because Safari can't establish a secure connection to the server 'localhost'", this is often due to Safari's cached data or strict handling of local SSL certificates.

**Solution:**

1.  **Open Safari.**
2.  Go to the **Safari Menu** in the menu bar (top-left of your screen).
3.  Select **Settings...** (or **Preferences...** on older macOS versions).
4.  Navigate to the **Privacy** tab.
5.  Click the **Manage Website Data...** button.
6.  In the search field that appears, type `localhost`.
7.  Select the `localhost` entry from the list.
8.  Click the **Remove** button.
9.  Click **Done**.
10. **Quit Safari** completely (Cmd+Q) and then reopen it.
11. Try accessing `https://localhost:5678` again.

This should clear any problematic cached SSL state for `localhost` in Safari.
