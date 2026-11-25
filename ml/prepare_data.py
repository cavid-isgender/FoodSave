from pathlib import Path
import pandas as pd

# Project Paths
PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR/'data'/'raw'
PROCESSED_DIR = PROJECT_DIR/'data'/'processed'

# Load training data
df = pd.read_csv(DATA_DIR/'train.csv')

#Remove unnecessary columns
df = df.drop(columns=['ID','date'])

#Normalize categorical values
df['staff_experience'] = (df['staff_experience'].fillna('Unknown').str.strip().str.lower())

df['waste_category'] = (df['waste_category'].str.strip().str.lower())

# Separate features and target
X = df.drop(columns=['food_waste_kg'])
y = df['food_waste_kg']

# Create processed directory
PROCESSED_DIR.mkdir(parents=True,exist_ok=True)

# Save processed data
X.to_csv(PROCESSED_DIR/'X.csv',index=False)
y.to_csv(PROCESSED_DIR/'y.csv',index=False)

print('Preprocessing completed successfully!')
print('Features shape:',X.shape)
print('Target shape:',y.shape)
print('\nFeatures:')
print(X.head())
print('\nTarget:')
print(y.head())