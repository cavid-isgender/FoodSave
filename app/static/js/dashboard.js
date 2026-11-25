
    // ======================================
    // DOM Elements
    // ======================================

    const historyTable = document.getElementById("prediction-history");

    const totalPredictions = document.getElementById("total-predictions");
    const averageWaste = document.getElementById("average-waste");
    const latestPrediction = document.getElementById("latest-prediction");

    const donationsContainer = document.getElementById("donations-container");
    const donationsMessage = document.getElementById("donations-message");
    const refreshDonationsButton = document.getElementById("refresh-donations");

    const donationsHeading = document.getElementById("donations-heading");
    const donationsDescription = document.getElementById("donations-description");

    const requestsSection = document.getElementById("incoming-requests-section");
    const requestsContainer = document.getElementById("requests-container");
    const requestsMessage = document.getElementById("requests-message");
    const refreshRequestsButton = document.getElementById("refresh-requests");

    const welcomeMessage = document.getElementById("dashboard-welcome");

    const myRequestsSection = document.getElementById("my-requests-section");
    const myRequestsContainer = document.getElementById("my-requests-container");
    const myRequestsMessage = document.getElementById("my-requests-message");
    const refreshMyRequestsButton = document.getElementById("refresh-my-requests");

    let donationsChart = null;
    let wasteChart = null;


    // ======================================
    // Current User
    // ======================================

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


    // ======================================
    // Fetch Data
    // ======================================

    async function fetchData(url) {
        const response = await window.authenticatedFetch(url);

        if (!response.ok) {
            let data = {};

            try {
                data = await response.json();
            } catch (error) {
                // Response may not contain JSON.
            }

            throw new Error(
                data.error || `Could not load ${url}. Status: ${response.status}`
            );
        }

        return await response.json();
    }


    // ======================================
    // Initialize Dashboard
    // ======================================

    function initializeDashboard() {
        if (welcomeMessage && currentUser.name) {
            welcomeMessage.textContent =
                `Welcome, ${currentUser.name}!`;
        }

        if (currentUserRole === "donor") {
            if (requestsSection) {
                requestsSection.hidden = false;
            }

            if (donationsHeading) {
                donationsHeading.textContent = "My Food Donations";
            }

            if (donationsDescription) {
                donationsDescription.textContent =
                    "Manage the food donations you have created.";
            }

        } else if (currentUserRole === "organization") {

            if (donationsHeading) {
                donationsHeading.textContent = "Available Food Donations";
            }

            if (donationsDescription) {
                donationsDescription.textContent =
                    "Browse available donations and request food from donors.";
            }

        } else {
            if (donationsHeading) {
                donationsHeading.textContent = "Food Donations";
            }

            if (donationsDescription) {
                donationsDescription.textContent =
                    "View food donations in the system.";
            }
        }
    }


    // ======================================
    // Load Dashboard
    // ======================================

    async function loadDashboard() {

        // Load donations
        try {
            const donationData = await fetchData("/donations");

            const donations = Array.isArray(donationData)
                ? donationData
                : [];

            let organizationMatches = [];

            // Get existing requests to prevent duplicate request buttons.
            if (currentUserRole === "organization") {
                try {
                    const matchData = await fetchData(
                        "/organizations/me/matches"
                    );

                    organizationMatches = Array.isArray(matchData.matches)
                        ? matchData.matches
                        : [];

                } catch (error) {
                    console.error("Could not load organization matches:", error);
                }
            }

            displayDonations(donations, organizationMatches);
            createDonationsChart(donations);

        } catch (error) {
            console.error("Donations loading error:", error);

            if (donationsContainer) {
                donationsContainer.innerHTML = `
                    <p class="empty-message">
                        Could not load donations.
                    </p>
                `;
            }

            showDonationsMessage(error.message, "error");
        }


        // Load predictions independently
        try {
            const predictionData = await fetchData("/predictions");

            const predictions = Array.isArray(predictionData.predictions)
                ? predictionData.predictions
                : [];

            displayPredictions(predictions);
            updateDashboardStats(predictions);
            createWasteChart(predictions);

        } catch (error) {
            console.error("Predictions loading error:", error);

            if (historyTable) {
                historyTable.innerHTML = `
                    <tr>
                        <td colspan="5">
                            Could not load prediction history.
                        </td>
                    </tr>
                `;
            }

            updateDashboardStats([]);
        }


        // Load donor requests
        if (currentUserRole === "donor") {
            await loadIncomingRequests();
        }

        if (
            currentUserRole === "organization" &&
            myRequestsSection
        ) {
            myRequestsSection.hidden = false;
        }

        // Load organization requests
        if (currentUserRole === "organization") {

            try {

                await loadMyRequests();

            } catch (error) {

                console.error("My requests loading error:", error);

                showMyRequestsMessage(
                    error.message,
                    "error"
                );
            }
        }
    }


    // ======================================
    // Display Donations
    // ======================================

    function displayDonations(donations, organizationMatches = []) {

        if (!donationsContainer) return;

        donationsContainer.innerHTML = "";

        if (donations.length === 0) {
            donationsContainer.innerHTML = `
                <div class="empty-donations">
                    <h3>No Donations Found</h3>
                    <p>
                        There are currently no donations to display.
                    </p>
                </div>
            `;

            return;
        }

        const requestedDonationIds = new Set(
            organizationMatches.map(match =>
                Number(match.donation?.donation_id ?? match.donation?.id)
            )
        );

        donations.forEach(donation => {

            const card = document.createElement("div");
            card.className = "donation-card";

            const quantity = Number(donation.quantity_kg);

            const expiryDate = donation.expiry_date
                ? formatDate(donation.expiry_date)
                : "Not specified";

            let actionHTML = "";

            if (
                currentUserRole === "organization" &&
                donation.status === "available"
            ) {
                const alreadyRequested = requestedDonationIds.has(
                    Number(donation.id)
                );

                actionHTML = alreadyRequested
                    ? `
                        <button class="request-donation-button" disabled>
                            Request Already Sent
                        </button>
                    `
                    : `
                        <button
                            class="request-donation-button"
                            data-donation-id="${Number(donation.id)}"
                        >
                            Request Donation
                        </button>
                    `;
            }

            card.innerHTML = `
                <div class="donation-card-header">
                    <span class="donation-category">
                        ${escapeHTML(donation.category)}
                    </span>

                    <span class="donation-status">
                        ${escapeHTML(donation.status)}
                    </span>
                </div>

                <h3>${escapeHTML(donation.food_name)}</h3>

                <div class="donation-details">
                    <p>
                        <strong>Quantity:</strong>
                        ${Number.isFinite(quantity) ? quantity : "N/A"} kg
                    </p>

                    <p>
                        <strong>Expiry Date:</strong>
                        ${escapeHTML(expiryDate)}
                    </p>

                    <p>
                        <strong>Location:</strong>
                        ${escapeHTML(donation.location)}
                    </p>
                </div>

                ${actionHTML}
            `;

            donationsContainer.appendChild(card);
        });
    }

    // ======================================
    // Load Organization Requests
    // ======================================

    async function loadMyRequests() {

        if (currentUserRole !== "organization") {
            return;
        }

        const data = await fetchData("/organizations/me/matches");

        const matches = Array.isArray(data.matches)
            ? data.matches
            : [];

        displayMyRequests(matches);
    }


    // ======================================
    // Display Organization Requests
    // ======================================

    function displayMyRequests(matches) {

        if (!myRequestsContainer) return;

        myRequestsContainer.innerHTML = "";

        if (matches.length === 0) {

            myRequestsContainer.innerHTML = `
                <div class="empty-donations">
                    <h3>No Requests Yet</h3>
                    <p>You have not requested any donations.</p>
                </div>
            `;

            return;
        }

        matches.forEach(match => {

            const donation = match.donation || {};

            const card = document.createElement("div");

            card.className = "donation-card request-card";

            let statusMessage = "";

            let actionButton = "";

            if (match.status === "pending") {

                statusMessage = "Waiting for donor approval";

            } else if (match.status === "accepted") {

                statusMessage = "Your request was accepted";

                actionButton = `
                    <button
                        class="complete-donation-button"
                        data-match-id="${Number(match.match_id)}"
                    >
                        Complete Donation
                    </button>
                `;

            } else if (match.status === "completed") {

                statusMessage = "Donation completed";

            } else if (match.status === "rejected") {

                statusMessage = "Request rejected";

            }

            card.innerHTML = `

                <div class="donation-card-header">

                    <span class="donation-category">
                        ${escapeHTML(donation.category)}
                    </span>

                    <span class="donation-status">
                        ${escapeHTML(match.status)}
                    </span>

                </div>

                <h3>${escapeHTML(donation.food_name)}</h3>

                <div class="donation-details">

                    <p>
                        <strong>Quantity:</strong>
                        ${Number(donation.quantity_kg)} kg
                    </p>

                    <p>
                        <strong>Location:</strong>
                        ${escapeHTML(donation.location)}
                    </p>

                    <p>
                        <strong>Expiry Date:</strong>
                        ${escapeHTML(formatDate(donation.expiry_date))}
                    </p>

                    <p>
                        <strong>Request Date:</strong>
                        ${escapeHTML(formatDate(match.matched_at))}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${escapeHTML(statusMessage)}
                    </p>

                </div>

                ${actionButton}

            `;

            myRequestsContainer.appendChild(card);
        });
    }


    // ======================================
    // Show My Requests Messages
    // ======================================

    function showMyRequestsMessage(message, type = "") {

        if (!myRequestsMessage) return;

        myRequestsMessage.textContent = message;

        myRequestsMessage.className =
            `donations-alert ${type}`;
    }




    // ======================================
    // Request Donation / Create Match
    // ======================================

    async function requestDonation(donationId, button) {

        if (currentUserRole !== "organization") {
            showDonationsMessage(
                "Only organizations can request donations.",
                "error"
            );
            return;
        }

        try {
            button.disabled = true;
            button.textContent = "Sending Request...";

            const response = await window.authenticatedFetch(
                "/matches",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        donation_id: donationId
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Could not create donation request."
                );
            }

            showDonationsMessage(
                "Donation request sent successfully!",
                "success"
                );

            button.textContent = "Request Sent";
            button.disabled = true;

            // Refresh organization requests
            await loadMyRequests();

        } catch (error) {
            showDonationsMessage(error.message, "error");

            button.disabled = false;
            button.textContent = "Request Donation";

            console.error("Match creation error:", error);
        }
    }


    // ======================================
    // Donation Button Event Listener
    // ======================================

    if (donationsContainer) {
        donationsContainer.addEventListener("click", event => {

            const button = event.target.closest(
                ".request-donation-button"
            );

            if (!button || button.disabled) return;

            const donationId = Number(button.dataset.donationId);

            if (!Number.isInteger(donationId) || donationId <= 0) {
                showDonationsMessage("Invalid donation ID.", "error");
                return;
            }

            requestDonation(donationId, button);
        });
    }


    // ======================================
    // Load Incoming Requests - Donor
    // ======================================

    async function loadIncomingRequests() {

        if (currentUserRole !== "donor") return;
        if (!requestsContainer) return;

        requestsContainer.innerHTML = `
            <p class="loading-message">
                Loading incoming requests...
            </p>
        `;

        try {
            const data = await fetchData("/donor/requests");

            const requests = Array.isArray(data.requests)
                ? data.requests
                : [];

            displayIncomingRequests(requests);

        } catch (error) {
            console.error("Incoming requests loading error:", error);

            requestsContainer.innerHTML = `
                <p class="empty-message">
                    Could not load incoming requests.
                </p>
            `;

            showRequestsMessage(error.message, "error");
        }
    }


    // ======================================
    // Display Incoming Requests
    // ======================================

    function displayIncomingRequests(requests) {

        if (!requestsContainer) return;

        requestsContainer.innerHTML = "";

        if (requests.length === 0) {
            requestsContainer.innerHTML = `
                <div class="empty-donations">
                    <h3>No Incoming Requests</h3>
                    <p>
                        Organizations have not requested your donations yet.
                    </p>
                </div>
            `;

            return;
        }

        requests.forEach(request => {

            const organization = request.organization || {};
            const donation = request.donation || {};

            const card = document.createElement("div");
            card.className = "donation-card request-card";

            const status = String(request.status || "").toLowerCase();

            let actionHTML = "";

            if (status === "pending") {
                actionHTML = `
                    <div class="request-actions">
                        <button
                            class="accept-request-button"
                            data-match-id="${Number(request.match_id)}"
                        >
                            Accept
                        </button>

                        <button
                            class="reject-request-button"
                            data-match-id="${Number(request.match_id)}"
                        >
                            Reject
                        </button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="donation-card-header">
                    <span class="donation-category">
                        ${escapeHTML(donation.category)}
                    </span>

                    <span class="donation-status">
                        ${escapeHTML(status)}
                    </span>
                </div>

                <h3>${escapeHTML(donation.food_name)}</h3>

                <div class="donation-details">

                    <p>
                        <strong>Organization:</strong>
                        ${escapeHTML(organization.name)}
                    </p>

                    <p>
                        <strong>Organization Location:</strong>
                        ${escapeHTML(organization.location)}
                    </p>

                    <p>
                        <strong>Phone:</strong>
                        ${escapeHTML(organization.phone)}
                    </p>

                    <p>
                        <strong>Quantity:</strong>
                        ${Number(donation.quantity_kg)} kg
                    </p>

                    <p>
                        <strong>Expiry Date:</strong>
                        ${escapeHTML(formatDate(donation.expiry_date))}
                    </p>

                    <p>
                        <strong>Request Date:</strong>
                        ${escapeHTML(formatDate(request.matched_at))}
                    </p>

                </div>

                ${actionHTML}
            `;

            requestsContainer.appendChild(card);
        });
    }


    // ======================================
    // Accept / Reject Request
    // ======================================

    async function updateRequestStatus(matchId, action, button) {

        if (currentUserRole !== "donor") {
            showRequestsMessage(
                "Only donors can manage incoming requests.",
                "error"
            );
            return;
        }

        if (!["accept", "reject"].includes(action)) return;

        const actionLabel = action === "accept" ? "Accept" : "Reject";

        const confirmed = window.confirm(
            `Are you sure you want to ${action} this donation request?`
        );

        if (!confirmed) return;

        try {
            const buttons = button
                .closest(".request-card")
                .querySelectorAll("button");

            buttons.forEach(item => {
                item.disabled = true;
            });

            button.textContent = `${actionLabel}ing...`;

            const response = await window.authenticatedFetch(
                `/matches/${matchId}/${action}`,
                {
                    method: "POST"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || `Could not ${action} request.`
                );
            }

            showRequestsMessage(
                data.message || `Request ${action}ed successfully.`,
                "success"
            );

            // Reload requests to display the updated statuses.
            await loadIncomingRequests();

            // Reload donations and dashboard charts because donation status may change.
            await loadDonationsOnly();

        } catch (error) {
            console.error(`${actionLabel} request error:`, error);

            showRequestsMessage(error.message, "error");

            const buttons = button
                .closest(".request-card")
                ?.querySelectorAll("button");

            buttons?.forEach(item => {
                item.disabled = false;
            });

            button.textContent = actionLabel;
        }
    }


    // ======================================
    // Request Button Event Listener
    // ======================================

    if (requestsContainer) {
        requestsContainer.addEventListener("click", event => {

            const acceptButton = event.target.closest(
                ".accept-request-button"
            );

            const rejectButton = event.target.closest(
                ".reject-request-button"
            );

            const button = acceptButton || rejectButton;

            if (!button) return;

            const matchId = Number(button.dataset.matchId);

            if (!Number.isInteger(matchId) || matchId <= 0) {
                showRequestsMessage("Invalid match ID.", "error");
                return;
            }

            const action = acceptButton ? "accept" : "reject";

            updateRequestStatus(matchId, action, button);
        });
    }


    // ======================================
    // Load Donations Only
    // ======================================

    async function loadDonationsOnly() {

        try {
            const donationData = await fetchData("/donations");

            const donations = Array.isArray(donationData)
                ? donationData
                : [];

            let organizationMatches = [];

            if (currentUserRole === "organization") {
                try {
                    const matchData = await fetchData(
                        "/organizations/me/matches"
                    );

                    organizationMatches = Array.isArray(matchData.matches)
                        ? matchData.matches
                        : [];

                } catch (error) {
                    console.error("Could not load organization matches:", error);
                }
            }

            displayDonations(donations, organizationMatches);
            createDonationsChart(donations);

        } catch (error) {
            showDonationsMessage(error.message, "error");
        }
    }


    // ======================================
    // Refresh Buttons
    // ======================================

    if (refreshDonationsButton) {
        refreshDonationsButton.addEventListener(
            "click",
            loadDonationsOnly
        );
    }

    if (refreshRequestsButton) {
        refreshRequestsButton.addEventListener(
            "click",
            loadIncomingRequests
        );
    }


    // ======================================
    // Show Messages
    // ======================================

    function showDonationsMessage(message, type = "") {

        if (!donationsMessage) return;

        donationsMessage.textContent = message;
        donationsMessage.className = `donations-alert ${type}`;
    }

    function showRequestsMessage(message, type = "") {

        if (!requestsMessage) return;

        requestsMessage.textContent = message;
        requestsMessage.className = `donations-alert ${type}`;
    }


    // ======================================
    // Escape HTML
    // ======================================

    function escapeHTML(value) {

        const element = document.createElement("div");

        element.textContent = value ?? "-";

        return element.innerHTML;
    }


    // ======================================
    // Display Recent Predictions
    // ======================================

    function displayPredictions(predictions) {

        if (!historyTable) return;

        historyTable.innerHTML = "";

        if (predictions.length === 0) {
            historyTable.innerHTML = `
                <tr class="empty-predictions-row">
                    <td colspan="5">
                        <div class="empty-predictions">
                            <div class="empty-predictions-icon">
                                <span>📊</span>
                            </div>
                            <h3>No Predictions Yet</h3>
                            <p>
                                Your food waste predictions will appear here
                                after you make your first prediction.
                            </p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        predictions.forEach(prediction => {

            const row = document.createElement("tr");

            const values = [
                prediction.id,
                prediction.meals_served,
                prediction.waste_category,
                `${Number(prediction.predicted_food_waste_kg).toFixed(2)} kg`,
                formatDate(prediction.created_at)
            ];

            values.forEach(value => {

                const cell = document.createElement("td");

                cell.textContent = value ?? "-";

                row.appendChild(cell);
            });

            historyTable.appendChild(row);
        });
    }


    // ======================================
    // Update Dashboard Statistics
    // ======================================

    function updateDashboardStats(predictions) {

        if (!totalPredictions || !averageWaste || !latestPrediction) {
            return;
        }

        totalPredictions.textContent = predictions.length;

        if (predictions.length === 0) {
            averageWaste.textContent = "0 kg";
            latestPrediction.textContent = "No data";
            return;
        }

        const totalWaste = predictions.reduce((sum, prediction) => {
            return sum + Number(prediction.predicted_food_waste_kg);
        }, 0);

        const average = totalWaste / predictions.length;

        averageWaste.textContent = `${average.toFixed(2)} kg`;

        latestPrediction.textContent =
            `${Number(
                predictions[0].predicted_food_waste_kg
            ).toFixed(2)} kg`;
    }


    // ======================================
    // Get Latest Six Calendar Months
    // ======================================

    function getLastSixMonths() {

        const months = [];
        const currentDate = new Date();

        for (let i = 5; i >= 0; i--) {

            const date = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() - i,
                1
            );

            const year = date.getFullYear();

            const month = String(
                date.getMonth() + 1
            ).padStart(2, "0");

            months.push({
                key: `${year}-${month}`,
                label: date.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric"
                })
            });
        }

        return months;
    }


    // ======================================
    // Create Monthly Donations Bar Chart
    // ======================================

    function createDonationsChart(donations) {

        const canvas = document.getElementById("donations-chart");

        if (!canvas || typeof Chart === "undefined") return;

        const months = getLastSixMonths();

        const monthlyCounts = months.map(month => {

            return donations.filter(donation => {

                if (!donation.created_at) return false;

                const date = new Date(donation.created_at);

                if (isNaN(date.getTime())) return false;

                const key = `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}`;

                return key === month.key;

            }).length;
        });

        if (donationsChart) {
            donationsChart.destroy();
        }

        donationsChart = new Chart(canvas, {

            type: "bar",

            data: {
                labels: months.map(month => month.label),

                datasets: [{
                    label: "Donations",
                    data: monthlyCounts,
                    backgroundColor: "#45a66b",
                    borderRadius: 6
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }


    // ======================================
    // Create Monthly Predicted Food Waste Chart
    // ======================================

    function createWasteChart(predictions) {

        const canvas = document.getElementById("waste-chart");

        if (!canvas || typeof Chart === "undefined") return;

        const months = getLastSixMonths();

        const monthlyAverages = months.map(month => {

            const monthlyPredictions = predictions.filter(prediction => {

                if (!prediction.created_at) return false;

                const date = new Date(prediction.created_at);

                if (isNaN(date.getTime())) return false;

                const key = `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}`;

                return key === month.key;
            });

            if (monthlyPredictions.length === 0) {
                return null;
            }

            const total = monthlyPredictions.reduce((sum, prediction) => {
                return sum + Number(prediction.predicted_food_waste_kg);
            }, 0);

            return Number(
                (total / monthlyPredictions.length).toFixed(2)
            );
        });

        if (wasteChart) {
            wasteChart.destroy();
        }

        wasteChart = new Chart(canvas, {

            type: "line",

            data: {
                labels: months.map(month => month.label),

                datasets: [{
                    label: "Average Predicted Waste (kg)",
                    data: monthlyAverages,
                    borderColor: "#3986c8",
                    backgroundColor: "rgba(57, 134, 200, 0.12)",
                    fill: true,
                    tension: 0.3,
                    spanGaps: false
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                scales: {
                    y: {
                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Kilograms (kg)"
                        }
                    }
                }
            }
        });
    }


    // ======================================
    // Format Date
    // ======================================

    function formatDate(dateString) {

        if (!dateString) return "-";

        const date = new Date(dateString);

        if (isNaN(date.getTime())) return "-";

        return date.toLocaleDateString();
    }

    // ======================================
    // Complete Donation
    // ======================================

    async function completeDonation(matchId, button) {

        try {

            button.disabled = true;
            button.textContent = "Completing...";

            const response = await window.authenticatedFetch(
                `/matches/${matchId}/complete`,
                {
                    method: "POST"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Could not complete donation."
                );
            }

            showMyRequestsMessage(
                "Donation completed successfully!",
                "success"
            );

            await loadMyRequests();
            await loadDonationsOnly();

        } catch (error) {

            showMyRequestsMessage(
                error.message,
                "error"
            );

            button.disabled = false;
            button.textContent = "Complete Donation";

            console.error("Complete donation error:", error);
        }
    }


    // ======================================
    // Complete Donation Button Listener
    // ======================================

    if (myRequestsContainer) {

        myRequestsContainer.addEventListener("click", event => {

            const button = event.target.closest(
                ".complete-donation-button"
            );

            if (!button) return;

            const matchId = Number(button.dataset.matchId);

            if (!Number.isInteger(matchId) || matchId <= 0) {

                showMyRequestsMessage(
                    "Invalid match ID.",
                    "error"
                );

                return;
            }

            completeDonation(matchId, button);
        });
    }


    // ======================================
    // Refresh My Requests
    // ======================================

    if (refreshMyRequestsButton) {

        refreshMyRequestsButton.addEventListener(
            "click",
            loadMyRequests
        );
    }


    // ======================================
    // Load Dashboard When Page Opens
    // ======================================

    initializeDashboard();
    loadDashboard();
