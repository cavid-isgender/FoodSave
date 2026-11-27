# Machine Learning

FoodSave includes a regression model that estimates food waste in kilograms from operational, environmental, and historical inputs.

## Dataset and preparation

The raw training and test files are stored in `data/raw/`. The project scripts are:

- `ml/inspect_data.py` — explores dataset dimensions, types, missing values, duplicates, IDs, distributions, and date values.
- `ml/prepare_data.py` — removes `ID` and `date`, fills missing `staff_experience` values with `Unknown`, normalizes categorical text, separates features and target, and writes `X.csv` and `y.csv` to `data/processed/`.
- `ml/train_model.py` — trains and saves the model.
- `ml/predict.py` — loads the saved model and generates predictions.

## Model inputs

| Feature | Meaning |
|---|---|
| `meals_served` | Number of meals served |
| `kitchen_staff` | Number of kitchen staff |
| `temperature_C` | Temperature in Celsius |
| `humidity_percent` | Humidity percentage |
| `day_of_week` | Day of the week |
| `special_event` | Special-event indicator |
| `past_waste_kg` | Previously recorded food waste |
| `staff_experience` | Staff experience level |
| `waste_category` | Food waste category |

**Target:** `food_waste_kg`.

## Training pipeline

The project uses a Scikit-learn `RandomForestRegressor` with 200 estimators and `random_state=42`. The data is split into 80% training and 20% testing. `OneHotEncoder` is applied to `staff_experience` and `waste_category`, with `handle_unknown='ignore'`; numerical features are passed through.

The complete pipeline is saved with Joblib at:

```text
ml/models/food_waste_model.pkl
```

## Evaluation

The model is evaluated using MAE, RMSE, and R². Metric values are intentionally not listed here because no verified evaluation results are included in the project README.

## Application integration

The prediction endpoint is:

```http
POST /predict/food-waste
```

It accepts the model input fields and returns a predicted food waste value in JSON.
