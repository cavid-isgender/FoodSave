
const API_URL = "";

const donationForm = document.getElementById("donation-form");
const formSection = document.getElementById("donation-form-section");
const tableBody = document.getElementById("donations-table-body");

const addButton = document.getElementById("add-donation-button");
const cancelButton = document.getElementById("cancel-donation-button");

const searchInput = document.getElementById("donation-search");
const statusFilter = document.getElementById("status-filter");

const donationsMessage = document.getElementById("donations-message");
const formMessage = document.getElementById("form-message");

const adminDonationTabs = document.getElementById("admin-donation-tabs");
const activeDonationsTab = document.getElementById("active-donations-tab");
const archivedDonationsTab = document.getElementById("archived-donations-tab");

const activeDonationsView = document.getElementById("active-donations-view");
const archivedDonationsView = document.getElementById("archived-donations-view");

const archivedTableBody = document.getElementById(
    "archived-donations-table-body"
);


// Get current user safely
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("user")) || {};
    } catch (error) {
        console.error("Could not read current user:", error);
        return {};
    }
}

const currentUser = getCurrentUser();
const currentUserRole = currentUser.role;


// Cached data
let donations = [];
let organizationMatchesCache = [];
let donorRequestsCache = [];
let archivedDonations = [];


// Send API requests

async function apiRequest(url, options = {}) {

    const response = await window.authenticatedFetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const responseText = await response.text();

    console.log("Response status:", response.status);
    console.log("Response URL:", response.url);
    console.log("Response body:", responseText);

    let data;

    try {
        data = JSON.parse(responseText);
    } catch (error) {
        console.error("JSON parsing error:", error);
        throw new Error(
            `Server returned HTML or invalid JSON. Status: ${response.status}`
        );
    }

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}


// Prevent HTML injection
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}


// Load donations
async function loadDonations() {

    try {

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">Loading donations...</td>
            </tr>
        `;

        // Load donations
        const donationData = await apiRequest("/donations");

        donations = Array.isArray(donationData)
            ? donationData
            : [];

        // Reset cached data
        organizationMatchesCache = [];
        donorRequestsCache = [];


        // Load organization's requests
        if (currentUserRole === "organization") {

            const matchData = await apiRequest(
                "/organizations/me/matches"
            );

            organizationMatchesCache = Array.isArray(matchData.matches)
                ? matchData.matches
                : [];
        }


        // Load donor's incoming requests
        if (currentUserRole === "donor") {

            const requestData = await apiRequest("/donor/requests");

            // Support either an array or an object containing requests
            if (Array.isArray(requestData)) {
                donorRequestsCache = requestData;
            } else if (Array.isArray(requestData.requests)) {
                donorRequestsCache = requestData.requests;
            } else if (Array.isArray(requestData.matches)) {
                donorRequestsCache = requestData.matches;
            }
        }


        displayDonations(
            donations,
            organizationMatchesCache,
            donorRequestsCache
        );

    } catch (error) {

        console.error("Load donations error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">${escapeHTML(error.message)}</td>
            </tr>
        `;
    }
}



// Load archived donations (admin only)
async function loadArchivedDonations() {

    if (currentUserRole !== "admin") {
        return;
    }

    try {

        archivedTableBody.innerHTML = `
            <tr>
                <td colspan="7">Loading archived donations...</td>
            </tr>
        `;

        // Admin receives active and archived donations
        const data = await apiRequest(
            "/donations?include_archived=true"
        );

        // Keep only archived donations
        archivedDonations = Array.isArray(data)
            ? data.filter(donation => donation.is_archived === true)
            : [];

        displayArchivedDonations(archivedDonations);

    } catch (error) {

        console.error("Load archived donations error:", error);

        archivedTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;
    }
}


// Display archived donations
function displayArchivedDonations(items) {
    if (items.length === 0) {
        archivedTableBody.innerHTML = `
            <tr><td colspan="8">No archived donations found.</td></tr>
        `;
        return;
    }

    archivedTableBody.innerHTML = items.map(donation => {
        const archivedDate = donation.archived_at
            ? donation.archived_at.replace("T", " ").slice(0, 16)
            : "N/A";

        const status = String(donation.status || "").toLowerCase();

        return `
            <tr>
                <td>${escapeHTML(donation.food_name)}</td>
                <td>${escapeHTML(donation.category)}</td>
                <td>${escapeHTML(donation.quantity_kg)} kg</td>
                <td>${escapeHTML(donation.expiry_date || "N/A")}</td>
                <td>${escapeHTML(donation.location)}</td>
                <td>
                    <span class="status-label status-${escapeHTML(status)}">
                        ${escapeHTML(status)}
                    </span>
                </td>
                <td>${escapeHTML(archivedDate)}</td>
                <td>
                    <button
                        class="restore-button"
                        data-action="restore"
                        data-id="${donation.id}">
                        Restore
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// Restore function
async function restoreDonation(donationId) {
    const confirmed = confirm(
        "Are you sure you want to restore this donation?"
    );

    if (!confirmed) return;

    try {
        await apiRequest(`/donations/${donationId}/restore`, {
            method: "POST"
        });

        donationsMessage.textContent = "Donation restored successfully!";

        await loadArchivedDonations();
        await loadDonations();

    } catch (error) {
        donationsMessage.textContent = error.message;
    }
}



// Display donations
function displayDonations(
    items,
    organizationMatches = [],
    donorRequests = []
) {

    if (items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">No donations found.</td>
            </tr>
        `;
        return;
    }


    // IDs of donations already requested by this organization
    const requestedDonationIds = new Set(
        organizationMatches.map(match =>
            Number(
                match.donation?.donation_id ??
                match.donation?.id
            )
        )
    );


    // Group incoming requests by donation ID
    const requestsByDonation = {};

    donorRequests.forEach(request => {

        const donationId = Number(
            request.donation?.id ??
            request.donation?.donation_id ??
            request.donation_id
        );

        if (!Number.isFinite(donationId)) return;

        if (!requestsByDonation[donationId]) {
            requestsByDonation[donationId] = [];
        }

        requestsByDonation[donationId].push(request);
    });


    tableBody.innerHTML = items.map(donation => {

        const status = String(
            donation.status || ""
        ).toLowerCase();

        const alreadyRequested = requestedDonationIds.has(
            Number(donation.id)
        );

        const incomingRequests =
            requestsByDonation[Number(donation.id)] || [];

        let actionsHTML = "";


        // DONOR ACTIONS
        if (currentUserRole === "donor") {

            actionsHTML = `
                <button
                    class="action-button edit-button"
                    data-action="edit"
                    data-id="${donation.id}">
                    Edit
                </button>

                <button
                    class="action-button delete-button"
                    data-action="delete"
                    data-id="${donation.id}">
                    Delete
                </button>

                <button
                    class="action-button match-button"
                    data-action="match"
                    data-id="${donation.id}">
                    Match
                </button>
            `;


            // Display incoming organization requests
            if (incomingRequests.length > 0) {

                actionsHTML += `
                    <div class="incoming-requests">
                        <strong>Incoming Requests:</strong>
                `;

                incomingRequests.forEach(request => {

                    const organizationName =
                        request.organization?.name ||
                        request.organization_name ||
                        "Unknown Organization";

                    const organizationLocation =
                        request.organization?.location ||
                        request.organization_location ||
                        "N/A";

                    const requestStatus = String(
                        request.status || ""
                    ).toLowerCase();

                    const matchId =
                        request.match_id ?? request.id;

                    actionsHTML += `
                        <div class="request-item">

                            <p>
                                <strong>
                                    ${escapeHTML(organizationName)}
                                </strong>
                            </p>

                            <p>
                                Location:
                                ${escapeHTML(organizationLocation)}
                            </p>

                            <p>
                                Status:
                                <span class="status-label status-${escapeHTML(requestStatus)}">
                                    ${escapeHTML(requestStatus)}
                                </span>
                            </p>
                    `;


                    // Accept / Reject pending requests
                    if (
                        requestStatus === "pending" &&
                        matchId !== undefined
                    ) {

                        actionsHTML += `
                            <button
                                class="action-button accept-button"
                                data-action="accept"
                                data-match-id="${escapeHTML(matchId)}">
                                Accept
                            </button>

                            <button
                                class="action-button reject-button"
                                data-action="reject"
                                data-match-id="${escapeHTML(matchId)}">
                                Reject
                            </button>
                        `;
                    }

                    actionsHTML += `
                        </div>
                    `;
                });

                actionsHTML += `
                    </div>
                `;
            }
        }


        // ORGANIZATION ACTIONS
        else if (
            currentUserRole === "organization" &&
            status === "available"
        ) {

            actionsHTML = alreadyRequested
                ? `
                    <button
                        class="action-button request-button"
                        disabled>
                        Request Already Sent
                    </button>
                  `
                : `
                    <button
                        class="action-button request-button"
                        data-action="request"
                        data-id="${donation.id}">
                        Request Donation
                    </button>
                  `;
        }


        return `
            <tr>
                <td>${escapeHTML(donation.food_name)}</td>
                <td>${escapeHTML(donation.category)}</td>
                <td>${escapeHTML(donation.quantity_kg)} kg</td>
                <td>${escapeHTML(donation.expiry_date || "N/A")}</td>
                <td>${escapeHTML(donation.location)}</td>

                <td>
                    <span class="status-label status-${escapeHTML(status)}">
                        ${escapeHTML(status)}
                    </span>
                </td>

                <td>
                    ${actionsHTML}
                </td>
            </tr>
        `;

    }).join("");
}


// Search and filter donations
function filterDonations() {

    const searchValue = searchInput.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value;

    const filtered = donations.filter(donation => {

        const foodName = String(
            donation.food_name || ""
        ).toLowerCase();

        const location = String(
            donation.location || ""
        ).toLowerCase();

        const status = String(
            donation.status || ""
        ).toLowerCase();

        const matchesSearch =
            foodName.includes(searchValue) ||
            location.includes(searchValue);

        const matchesStatus =
            selectedStatus === "all" ||
            status === selectedStatus;

        return matchesSearch && matchesStatus;
    });


    // Preserve request information while filtering
    displayDonations(
        filtered,
        organizationMatchesCache,
        donorRequestsCache
    );
}


// Search and filter event listeners
searchInput.addEventListener("input", filterDonations);
statusFilter.addEventListener("change", filterDonations);


// Show Add Donation button only to donors
if (addButton) {
    addButton.hidden = currentUserRole !== "donor";
}


// Open form for new donation
addButton.addEventListener("click", () => {

    donationForm.reset();

    document.getElementById("donation-id").value = "";

    document.getElementById("form-title").textContent =
        "Add New Donation";

    document.getElementById("save-donation-button").textContent =
        "Save Donation";

    formMessage.textContent = "";

    formSection.hidden = false;
});


// Close form
cancelButton.addEventListener("click", () => {

    formSection.hidden = true;
    donationForm.reset();
});


// Create or update donation
donationForm.addEventListener("submit", async event => {

    event.preventDefault();

    if (currentUserRole !== "donor") {
        formMessage.textContent =
            "Only donors can create or update donations.";
        return;
    }

    const donationId = document.getElementById("donation-id").value;

    const donationData = {
        food_name: document.getElementById("food-name").value.trim(),
        category: document.getElementById("category").value.trim(),
        quantity_kg: Number(
            document.getElementById("quantity-kg").value
        ),
        expiry_date: document.getElementById("expiry-date").value,
        location: document.getElementById("location").value.trim()
    };

    const button = document.getElementById("save-donation-button");

    try {

        button.disabled = true;

        if (donationId) {

            await apiRequest(`/donations/${donationId}`, {
                method: "PUT",
                body: JSON.stringify(donationData)
            });

            formMessage.textContent =
                "Donation updated successfully!";

        } else {

            await apiRequest("/donations", {
                method: "POST",
                body: JSON.stringify(donationData)
            });

            formMessage.textContent =
                "Donation created successfully!";
        }

        formSection.hidden = true;
        donationForm.reset();

        await loadDonations();

    } catch (error) {

        formMessage.textContent = error.message;

    } finally {

        button.disabled = false;
    }
});


// Handle table actions
tableBody.addEventListener("click", async event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const action = button.dataset.action;


    // ACCEPT / REJECT DONOR REQUESTS
    if (action === "accept" || action === "reject") {

        if (currentUserRole !== "donor") return;

        const matchId = Number(button.dataset.matchId);

        const endpoint = action === "accept"
            ? `/matches/${matchId}/accept`
            : `/matches/${matchId}/reject`;

        try {

            button.disabled = true;

            await apiRequest(endpoint, {
                method: "POST"
            });

            donationsMessage.textContent =
                action === "accept"
                    ? "Donation request accepted successfully!"
                    : "Donation request rejected successfully!";

            await loadDonations();

        } catch (error) {

            button.disabled = false;
            donationsMessage.textContent = error.message;
        }

        return;
    }


    // Donation-related actions
    const donationId = Number(button.dataset.id);

    const donation = donations.find(
        item => Number(item.id) === donationId
    );

    if (!donation) return;


    // EDIT DONATION
    if (action === "edit") {

        document.getElementById("donation-id").value = donation.id;
        document.getElementById("food-name").value = donation.food_name;
        document.getElementById("category").value = donation.category;
        document.getElementById("quantity-kg").value = donation.quantity_kg;
        document.getElementById("expiry-date").value = donation.expiry_date;
        document.getElementById("location").value = donation.location;

        document.getElementById("form-title").textContent =
            "Edit Donation";

        document.getElementById("save-donation-button").textContent =
            "Update Donation";

        formMessage.textContent = "";
        formSection.hidden = false;

        return;
    }


    // DELETE DONATION
    if (action === "delete") {

        const confirmed = confirm(
            `Are you sure you want to delete ${donation.food_name}?`
        );

        if (!confirmed) return;

        try {

            await apiRequest(`/donations/${donationId}`, {
                method: "DELETE"
            });

            donationsMessage.textContent =
                "Donation deleted successfully!";

            await loadDonations();

        } catch (error) {

            donationsMessage.textContent = error.message;
        }

        return;
    }


    // FIND MATCHING ORGANIZATIONS
    if (action === "match") {

        try {

            const result = await apiRequest(
                `/donations/${donationId}/match`,
                { method: "POST" }
            );

            if (result.total_matches === 0) {

                donationsMessage.textContent =
                    result.message || "No matching organizations found.";

            } else {

                const names = result.matches
                    .map(match => match.organization_name)
                    .join(", ");

                donationsMessage.textContent =
                    `Found ${result.total_matches} matches: ${names}`;
            }

            await loadDonations();

        } catch (error) {

            donationsMessage.textContent = error.message;
        }

        return;
    }


    // ORGANIZATION: REQUEST DONATION
    if (action === "request") {

        if (currentUserRole !== "organization") return;

        try {

            button.disabled = true;

            await apiRequest("/matches", {
                method: "POST",
                body: JSON.stringify({
                    donation_id: donationId
                })
            });

            donationsMessage.textContent =
                "Donation request sent successfully!";

            await loadDonations();

        } catch (error) {

            button.disabled = false;
            donationsMessage.textContent = error.message;
        }

        return;
    }

});


// Restore button click event
archivedTableBody.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="restore"]');

    if (!button) return;

    const donationId = button.dataset.id;

    await restoreDonation(donationId);
});


// Show admin donation tabs only to admins
if (currentUserRole === "admin") {

    adminDonationTabs.hidden = false;
}


// Switch to Active Donations
activeDonationsTab.addEventListener("click", () => {

    activeDonationsView.hidden = false;
    archivedDonationsView.hidden = true;

    activeDonationsTab.classList.add("active");
    archivedDonationsTab.classList.remove("active");

    filterDonations();
});


// Switch to Archived Donations
archivedDonationsTab.addEventListener("click", async () => {

    activeDonationsView.hidden = true;
    archivedDonationsView.hidden = false;

    archivedDonationsTab.classList.add("active");
    activeDonationsTab.classList.remove("active");

    await loadArchivedDonations();
});


// Initial page load
loadDonations();
