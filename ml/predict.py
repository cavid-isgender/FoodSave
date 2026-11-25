from pathlib import Path
import joblib
import pandas as pd

PROJECT_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_DIR/'ml'/'models'/'food_waste_model.pkl'

model = joblib.load(MODEL_PATH)

sample = pd.DataFrame([{"meals_served":300,
                        "kitchen_staff": 12,
                        "temperature_C": 20.0,
                        "humidity_percent": 55.0,
                        "day_of_week": 2,
                        "special_event": 0,
                        "past_waste_kg": 25.0,
                        "staff_experience": "intermediate",
                        "waste_category": "vegetables"
                        }])

prediction = model.predict(sample)

print(f"Predicted food waste:{prediction[0]:.2f} kg")