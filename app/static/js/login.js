
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");

// Redirect authenticated users to dashboard
if (
    localStorage.getItem("access_token") &&
    localStorage.getItem("refresh_token")
) {
    window.location.replace("/dashboard");
}

// Handle login form submission
loginForm.addEventListener("submit", async event => {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {

        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Login failed.");
        }

        // Save JWT token
        localStorage.setItem("access_token", data.access_token);

        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Start the inactivity timer
        localStorage.setItem("last_activity", Date.now().toString());

        window.location.href = "/dashboard";


    } catch (error) {

        loginMessage.textContent = error.message;
    }
});
