const registerForm = document.getElementById("register-form");
const registerMessage = document.getElementById("register-message");
const registerButton = document.getElementById("register-button");

registerForm.addEventListener("submit", async event => {

    event.preventDefault();

    const userData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value,
        role: document.getElementById("role").value
    };

    try {
        registerButton.disabled = true;

        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Registration failed.");
        }

        registerMessage.textContent =
            "Account created successfully! Redirecting to login...";

        registerMessage.style.color = "green";

        registerForm.reset();

        setTimeout(() => {
            window.location.href = "/login-page";
        }, 1500);

    } catch (error) {

        registerMessage.textContent = error.message;
        registerMessage.style.color = "red";

    } finally {
        registerButton.disabled = false;
    }
});


const togglePassword = document.getElementById("toggle-password");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", () => {

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.textContent = "Hide";
    } else {
        passwordInput.type = "password";
        togglePassword.textContent = "Show";
    }

});

