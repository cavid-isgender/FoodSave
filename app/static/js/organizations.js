
const organizationsContainer = document.getElementById(
    "organizations-container"
);

const organizationsMessage = document.getElementById(
    "organizations-message"
);

const totalOrganizations = document.getElementById(
    "total-organizations"
);

const totalCapacity = document.getElementById(
    "total-capacity"
);

const refreshButton = document.getElementById(
    "refresh-organizations"
);


// Display messages
function showMessage(message, type = "") {
    organizationsMessage.textContent = message;
    organizationsMessage.className = type;
}


// Prevent HTML injection
function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "-";
    return element.innerHTML;
}


// Load organizations from API
async function loadOrganizations() {

    organizationsContainer.innerHTML = `
        <div class="organizations-loading">
            <div class="loading-spinner"></div>
            <p>Loading organizations...</p>
        </div>
    `;

    showMessage("");

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
    }

    try {

        const response = await window.authenticatedFetch(
            "/organizations"
        );

        const organizations = await response.json();

        if (!response.ok) {
            throw new Error(
                organizations.error || "Could not load organizations."
            );
        }

        if (!Array.isArray(organizations)) {
            throw new Error("Unexpected server response.");
        }

        // Update statistics
        totalOrganizations.textContent = organizations.length;

        const combinedCapacity = organizations.reduce(
            (total, organization) => {
                const capacity = Number(organization.capacity_kg);

                return total + (
                    Number.isFinite(capacity) ? capacity : 0
                );
            },
            0
        );

        totalCapacity.textContent = combinedCapacity.toLocaleString();

        // Display organization cards
        displayOrganizations(organizations);

    } catch (error) {

        organizationsContainer.innerHTML = "";

        showMessage(error.message, "error");

        console.error("Organizations loading error:", error);

    } finally {

        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = "Refresh";
        }
    }
}


// Display organization cards
function displayOrganizations(organizations) {

    organizationsContainer.innerHTML = "";

    if (organizations.length === 0) {

        organizationsContainer.innerHTML = `
            <div class="empty-organizations">
                <div class="empty-organizations-icon">🏢</div>
                <h3>No Organizations Found</h3>
                <p>
                    There are currently no registered organizations.
                    Organizations will appear here once they join FoodSave.
                </p>
            </div>
        `;

        return;
    }

    organizations.forEach(organization => {

        const card = document.createElement("div");

        card.className = "organization-card";

        card.innerHTML = `
            <div class="organization-card-top">
                <div class="organization-icon">🏢</div>
                <span class="organization-label">
                    FoodSave Organization
                </span>
            </div>

            <h3 class="organization-name">
                ${escapeHTML(organization.organization_name)}
            </h3>

            <div class="organization-details">

                <div class="organization-detail">
                    <span class="detail-icon">📍</span>
                    <div>
                        <span class="detail-label">Location</span>
                        <strong>
                            ${escapeHTML(organization.location)}
                        </strong>
                    </div>
                </div>

                <div class="organization-detail">
                    <span class="detail-icon">📦</span>
                    <div>
                        <span class="detail-label">Capacity</span>
                        <strong>
                            ${escapeHTML(organization.capacity_kg)} kg
                        </strong>
                    </div>
                </div>

                <div class="organization-detail">
                    <span class="detail-icon">📞</span>
                    <div>
                        <span class="detail-label">Phone</span>
                        <strong>
                            ${escapeHTML(organization.phone)}
                        </strong>
                    </div>
                </div>

            </div>
        `;

        organizationsContainer.appendChild(card);
    });
}


// Refresh button
if (refreshButton) {
    refreshButton.addEventListener("click", loadOrganizations);
}


// Initial loading
loadOrganizations();
