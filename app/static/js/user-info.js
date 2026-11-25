document.addEventListener("DOMContentLoaded", () => {
    let user;

    try {
        user = JSON.parse(localStorage.getItem("user"));
    } catch (error) {
        console.error("Could not read user information:", error);
        return;
    }

    if (!user) {
        console.error("User information not found in localStorage.");
        return;
    }

    const userInitial = document.getElementById("user-initial");
    const userName = document.getElementById("user-name");
    const userRole = document.getElementById("user-role");

    if (userInitial) {
        userInitial.textContent = (user.name || "U").charAt(0).toUpperCase();
    }

    if (userName) {
        userName.textContent = user.name || "User";
    }

    if (userRole) {
        userRole.textContent =
            user.role.charAt(0).toUpperCase() + user.role.slice(1);
    }
});