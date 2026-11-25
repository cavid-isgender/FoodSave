from pathlib import Path
import pandas as pd

# Find the project folder and CSV files
PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data" / "raw"

train = pd.read_csv(DATA_DIR / "train.csv")
test = pd.read_csv(DATA_DIR / "test.csv")

# 1. Dataset size
print("=== DATASET SIZE ===")
print("Train:", train.shape)
print("Test:", test.shape)

# 2. Column names and data types
print("\n=== TRAIN COLUMNS AND TYPES ===")
print(train.dtypes)

# 3. Missing values
print("\n=== MISSING VALUES ===")
print(train.isnull().sum())

# 4. Duplicate rows
print("\n=== DUPLICATE ROWS ===")
print("Train duplicates:", train.duplicated().sum())
print("Test duplicates:", test.duplicated().sum())

# 5. Duplicate IDs and train/test overlap
print("\n=== ID CHECK ===")
print("Duplicate train IDs:", train["ID"].duplicated().sum())
print("Duplicate test IDs:", test["ID"].duplicated().sum())
print("Common IDs:", train["ID"].isin(test["ID"]).sum())

# Compare input features between train and test
features = test.columns.tolist()
same_features = train[features].reset_index(drop=True).equals(
    test[features].reset_index(drop=True)
)
print("Are all train/test input rows identical and in the same order?",
      same_features)

# 6. Numerical statistics
print("\n=== NUMERICAL STATISTICS ===")
print(train.describe())

# 7. Categorical values
print("\n=== CATEGORY VALUES ===")
for column in ["staff_experience", "waste_category", "day_of_week",
               "special_event"]:
    print(f"\n{column}:")
    print(train[column].value_counts(dropna=False))

# 8. Target distribution
print("\n=== FOOD WASTE TARGET ===")
print(train["food_waste_kg"].describe())
print("\n10 largest food waste values:")
print(
    train.nlargest(10, "food_waste_kg")[
        ["ID", "meals_served", "past_waste_kg", "food_waste_kg"]
    ]
)

# 9. Date range
train["date"] = pd.to_datetime(train["date"], errors="coerce")
print("\n=== DATE RANGE ===")
print("Earliest:", train["date"].min())
print("Latest:", train["date"].max())
print("Invalid dates:", train["date"].isna().sum())



# 10. Investigate unusually large values
print("\n=== MEALS SERVED DISTRIBUTION ===")
print(
    train["meals_served"].quantile(
        [0.50, 0.75, 0.90, 0.95, 0.99]
    )
)

print("\nRows with more than 1000 meals:")
print(
    train.loc[
        train["meals_served"] > 1000,
        ["ID", "date", "meals_served", "food_waste_kg"]
    ].sort_values("meals_served", ascending=False).head(15)
)

# 11. Check whether target values are negative or zero
print("\n=== TARGET VALIDATION ===")
print("Negative food waste:", (train["food_waste_kg"] < 0).sum())
print("Zero food waste:", (train["food_waste_kg"] == 0).sum())

# 12. Check category values after normalizing capitalization
print("\n=== NORMALIZED CATEGORIES ===")
print(
    train["staff_experience"]
    .str.strip()
    .str.lower()
    .value_counts(dropna=False)
)

print(
    train["waste_category"]
    .str.strip()
    .str.lower()
    .value_counts(dropna=False)
)
