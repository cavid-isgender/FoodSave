const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";

const INACTIVITY_LIMIT = 20 * 60 * 1000;
const ACTIVITY_KEY = "last_activity";

let refreshPromise = null;
let lastActivityUpdate = 0;

// Redirect to login if no access or refresh token exists
(function checkAuthentication() {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!accessToken || !refreshToken) {
        logout();
        return;
    }

    checkInactivity();
})();

// Save the latest user activity
function updateActivity() {
    const now = Date.now();

    // Avoid writing to localStorage on every mouse movement
    if (now - lastActivityUpdate < 5000) {
        return;
    }

    lastActivityUpdate = now;
    localStorage.setItem(ACTIVITY_KEY, now.toString());
}

// Check whether the inactivity limit has been reached
function checkInactivity() {
    const lastActivity = Number(
        localStorage.getItem(ACTIVITY_KEY)
    );

    if (
        !lastActivity ||
        Date.now() - lastActivity >= INACTIVITY_LIMIT
    ) {
        logout();
        return false;
    }

    return true;
}

// Handle user activity
function handleUserActivity() {
    if (checkInactivity()) {
        updateActivity();
    }
}

[
    "mousemove",
    "mousedown",
    "keydown",
    "click",
    "scroll",
    "touchstart"
].forEach(eventName => {
    document.addEventListener(eventName, handleUserActivity, {
        passive: true
    });
});

// Check inactivity periodically
setInterval(checkInactivity, 15000);

// Check inactivity when returning to the browser tab
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        checkInactivity();
    }
});

// Refresh the access token using the refresh token
async function refreshAccessToken() {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (!refreshToken) {
            return false;
        }

        try {
            const response = await fetch("/refresh", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${refreshToken}`
                }
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();

            if (!data.access_token) {
                return false;
            }

            localStorage.setItem(
                ACCESS_TOKEN_KEY,
                data.access_token
            );

            return true;

        } catch (error) {
            console.error("Token refresh failed:", error);
            return false;
        }
    })();

    const result = await refreshPromise;
    refreshPromise = null;

    return result;
}

// Send authenticated API requests
window.authenticatedFetch = async function (url, options = {}) {
    if (!checkInactivity()) {
        throw new Error("Session expired due to inactivity.");
    }

    // API requests also count as user activity
    updateActivity();

    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) {
        const refreshed = await refreshAccessToken();

        if (!refreshed) {
            logout();
            throw new Error("Authentication required.");
        }
    }

    const sendRequest = () => {
        const headers = {
            ...options.headers,
            "Authorization": `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}`
        };

        return fetch(url, {
            ...options,
            headers
        });
    };

    let response = await sendRequest();

    // If access token expired, refresh and retry once
    if (response.status === 401) {
        const refreshed = await refreshAccessToken();

        if (!refreshed) {
            logout();
            throw new Error("Session expired. Please log in again.");
        }

        response = await sendRequest();

        if (response.status === 401) {
            logout();
            throw new Error("Authentication failed.");
        }
    }

    return response;
};

// Logout
function logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVITY_KEY);

    window.location.replace("/login-page");
}

window.logout = logout;