from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error,mean_squared_error,r2_score
import joblib

# Project paths
PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR/'data'/'processed'
MODEL_DIR = PROJECT_DIR/'ml'/'models'

# Load processed data
X = pd.read_csv(DATA_DIR/'X.csv')
y = pd.read_csv(DATA_DIR/'y.csv').squeeze()


# Identify categorical columns
categorical_features = ['staff_experience','waste_category']


# Convert categorical values into numerical representation
preprocessor = ColumnTransformer(transformers=[('categorical',
                                                OneHotEncoder(handle_unknown='ignore'),
                                                categorical_features)],remainder='passthrough')

# Create the ML pipeline
model = Pipeline(steps=[('preprocessor',preprocessor),
                        ('regressor',RandomForestRegressor(n_estimators=200,random_state=42))])

# Split data into training and testing sets
X_train,X_test,y_train,y_test = train_test_split(X,y,test_size=0.2,random_state=42)


# Train the model
model.fit(X_train,y_train)


# Make predictions
predictions = model.predict(X_test)


# Evaluate the model
mae = mean_absolute_error(y_test,predictions)
rmse = mean_squared_error(y_test,predictions)**0.5
r2 = r2_score(y_test,predictions)


print('======== MODEL PERFORMANCE =========')
print(f"MAE:{mae:.2f} kg")
print(f"RMSE:{rmse:.2f} kg")
print(f"R2: {r2:.3f}")

# Save the trained model:
MODEL_DIR.mkdir(parents=True,exist_ok=True)
joblib.dump(model,MODEL_DIR/'food_waste_model.pkl')


print("\nModel saved successfully!")
print("Location:",MODEL_DIR/'food_waste_model.pkl')







