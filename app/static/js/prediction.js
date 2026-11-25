const predictionForm = document.getElementById("prediction-form");
const predictionButton = document.getElementById("predict-button");

const predictionResult = document.getElementById("prediction-result");
const predictionValue = document.getElementById("prediction-value");


// Handle prediction form submission
predictionForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    predictionButton.disabled = true;
    predictionButton.textContent = "Predicting...";

    predictionResult.style.display = "block";
    predictionValue.textContent = "Calculating prediction...";

    const formData = new FormData(predictionForm);

    const predictionData = {
        meals_served: Number(formData.get("meals_served")),
        kitchen_staff: Number(formData.get("kitchen_staff")),
        temperature_c: Number(formData.get("temperature_c")),
        humidity_percent: Number(formData.get("humidity_percent")),
        day_of_week: Number(formData.get("day_of_week")),
        special_event: Number(formData.get("special_event")),
        past_waste_kg: Number(formData.get("past_waste_kg")),
        staff_experience: formData.get("staff_experience"),
        waste_category: formData.get("waste_category")
    };

    console.log("Prediction data:", predictionData);

    try {
        const response = await window.authenticatedFetch(
            "/predict/food-waste",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(predictionData)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Prediction failed.");
        }

        const predictedWaste = Number(data.predicted_food_waste_kg);

        predictionValue.textContent =
            `${predictedWaste.toFixed(2)} kg`;

    } catch (error) {
        predictionValue.textContent = error.message;
        console.error("Prediction error:", error);

    } finally {
        predictionButton.disabled = false;
        predictionButton.textContent = "Predict Food Waste";
    }
});