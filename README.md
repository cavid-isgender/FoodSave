# FoodSave – Food Waste Management System

FoodSave is a web-based food waste management system developed using Flask and PostgreSQL. The platform aims to reduce food waste by connecting food donors with organizations that can redistribute surplus food to people in need.

The system provides food donation management, organization matching, user authentication, activity tracking, and machine learning-based food waste prediction.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Machine Learning Component](#machine-learning-component)
- [Database](#database)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Overview](#api-overview)
- [Future Improvements](#future-improvements)

---

## Project Overview

FoodSave is designed to make surplus food redistribution more efficient.

Food donors can create and manage food donations, while organizations can find suitable donations through a matching system. The platform also provides a machine learning component that estimates food waste based on different operational and environmental factors.

The main goal is to support better food resource management and reduce unnecessary food waste.

## Key Features

### 1. User Authentication
- User registration and login.
- Password hashing using Flask-Bcrypt.
- JWT-based authentication.
- Access and refresh token support.
- Protected routes for authorized users.

### 2. Food Donation Management
- Create and manage food donations.
- View donation details and donation history.
- Archive donations without permanently deleting their records.
- Restore archived donations.

### 3. Organization Matching System
- Match available food donations with suitable organizations.
- Consider donation categories and location when finding potential matches.
- Generate matching results with compatibility scores.
- Allow organizations to manage incoming match requests.

### 4. Match Management
- Accept or reject donation match requests.
- Track the status of donation matches.
- Mark completed donations as completed.

### 5. Food Waste Prediction
- Predict food waste using a trained machine learning model.
- Use operational and environmental factors as model inputs.
- Display predicted food waste in kilograms.

### 6. Dashboard
- Display relevant donation statistics.
- Visualize monthly donation activity.
- Display food waste prediction statistics and charts.

---

## Technologies Used

| Technology | Purpose |
|---|---|
| Python | Main programming language |
| Flask | Backend web framework |
| PostgreSQL | Relational database |
| Flask-SQLAlchemy | Database ORM integration |
| SQLAlchemy | Database operations |
| Flask-Bcrypt | Password hashing |
| Flask-JWT-Extended | Authentication and authorization |
| HTML5 | Frontend structure |
| CSS3 | Frontend styling |
| JavaScript | Frontend interactions |
| Pandas | Data processing |
| Scikit-learn | Machine learning model development |
| Joblib | Model serialization and loading |
| Python-dotenv | Environment variable management |

---

## Project Structure

The project is organized into separate modules for the backend application, machine learning component, data, and frontend resources.

```text
FoodSave/
│
├── app/
│   ├── __init__.py
│   ├── models.py
│   ├── routes.py
│   ├── matching_engine.py
│   │
│   ├── templates/
│   │   ├── dashboard.html
│   │   ├── donations.html
│   │   ├── food_waste_prediction.html
│   │   ├── login.html
│   │   ├── organizations.html
│   │   └── register.html
│   │
│   └── static/
│       ├── css/
│       └── js/
│
├── data/
│   ├── raw/
│   │   ├── train.csv
│   │   └── test.csv
│   │
│   └── processed/
│       ├── X.csv
│       └── y.csv
│
├── ml/
│   ├── models/
│   │   └── food_waste_model.pkl
│   │
│   ├── inspect_data.py
│   ├── prepare_data.py
│   ├── preprocess.py
│   ├── train_model.py
│   └── predict.py
│
├── .env.example
├── .gitignore
├── requirements.txt
├── run.py
├── seed.py
└── README.md
```

**Main directories:**

- `app/` – Flask application, database models, routes, and matching logic.
- `app/templates/` – HTML templates.
- `app/static/` – CSS and JavaScript files.
- `data/` – Raw and processed machine learning datasets.
- `ml/` – Data preparation, preprocessing, model training, and prediction scripts.
- `ml/models/` – Saved machine learning model.

---

## Machine Learning Component

FoodSave includes a machine learning component for predicting food waste.

A Random Forest Regressor is used to estimate the amount of food waste in kilograms.

### Model Input Features

The prediction model uses the following features:

| Feature | Description |
|---|---|
| `meals_served` | Number of meals served |
| `kitchen_staff` | Number of kitchen staff members |
| `temperature_C` | Temperature in Celsius |
| `humidity_percent` | Humidity percentage |
| `day_of_week` | Day of the week |
| `special_event` | Indicates whether a special event takes place |
| `past_waste_kg` | Historical food waste in kilograms |
| `staff_experience` | Experience level of kitchen staff |
| `waste_category` | Food waste category |

### Machine Learning Workflow

1. Data inspection and exploration.
2. Data preparation and preprocessing.
3. Feature transformation.
4. Model training using Random Forest Regressor.
5. Model evaluation.
6. Model serialization using Joblib.
7. Loading the trained model for predictions.

The trained model is stored in:

```text
ml/models/food_waste_model.pkl
```

The prediction result is returned in kilograms.

---


## Database

FoodSave uses PostgreSQL as its relational database management system.

Flask-SQLAlchemy is used to interact with the database through ORM models.

The database connection is configured using environment variables to keep sensitive configuration details outside the source code.

### Entity Relationship Diagram

The following diagram illustrates the database entities and their relationships.

```mermaid
  
erDiagram
    USERS {
        int id PK
        varchar name
        varchar email
        varchar password
        varchar role
        timestamp created_at
    }

    ORGANIZATIONS {
        int id PK
        int user_id FK
        varchar organization_name
        varchar location
        float capacity_kg
        varchar phone
        varchar accepted_categories
    }

    FOOD_CATEGORIES {
        int id PK
        varchar name
    }

    ORGANIZATION_CATEGORIES {
        int organization_id PK, FK
        int category_id PK, FK
    }

    FOOD_DONATIONS {
        int id PK
        int donor_id FK
        varchar food_name
        varchar category
        float quantity_kg
        date expiry_date
        varchar location
        varchar status
        timestamp created_at
        boolean is_archived
        timestamp archived_at
    }

    MATCHES {
        int id PK
        int donation_id FK
        int organization_id FK
        varchar status
        timestamp matched_at
    }

    FOOD_WASTE_PREDICTIONS {
        int id PK
        int user_id FK
        int meals_served
        int kitchen_staff
        numeric temperature_c
        numeric humidity_percent
        int day_of_week
        int special_event
        numeric past_waste_kg
        varchar staff_experience
        varchar waste_category
        numeric predicted_food_waste_kg
        timestamp created_at
    }

    PREDICTION_LOGS {
        int id PK
        int donor_id FK
        double predicted_waste
        double actual_waste
        timestamp prediction_date
    }

    USERS ||--o| ORGANIZATIONS : has
    USERS ||--o{ FOOD_DONATIONS : creates
    USERS ||--o{ FOOD_WASTE_PREDICTIONS : generates
    USERS ||--o{ PREDICTION_LOGS : has
    ORGANIZATIONS ||--o{ MATCHES : receives
    FOOD_DONATIONS ||--o{ MATCHES : has
    ORGANIZATIONS ||--o{ ORGANIZATION_CATEGORIES : accepts
    FOOD_CATEGORIES ||--o{ ORGANIZATION_CATEGORIES : includes

```

---


## System Architecture

FoodSave follows a modular web application architecture. The frontend communicates with the Flask backend through HTTP requests. The backend handles authentication, donation management, organization matching, database operations, and machine learning predictions.

### Architecture Diagram

The following diagram illustrates the main components of the FoodSave application and how they interact.

```mermaid
flowchart TB
    U["User"]
    FE["Frontend<br/>HTML, CSS, JavaScript<br/>Jinja2 Templates"]

    subgraph FLASK["Flask Application"]
        APP["Application Initialization<br/>app/__init__.py"]
        ROUTES["Routes<br/>app/routes.py"]
        AUTH["Authentication<br/>JWT + Flask-Bcrypt"]
        MATCH["Matching Engine<br/>app/matching_engine.py"]
        ORM["Database Models<br/>app/models.py"]

        subgraph ML["Machine Learning Component"]
            PRED["Prediction Logic"]
            DATA["Pandas DataFrame"]
            MODEL["Trained Model<br/>food_waste_model.pkl"]
        end
    end

    DB[("PostgreSQL Database")]

    U <--> FE
    FE <-->|HTTP Requests / Responses| ROUTES
    APP --> ROUTES
    ROUTES <--> AUTH
    ROUTES --> MATCH
    MATCH <--> ORM
    ROUTES <--> ORM
    ORM <--> DB
    ROUTES --> PRED
    PRED --> DATA
    DATA --> MODEL
    MODEL --> PRED
    PRED --> ROUTES
```

### Main Components

- **Frontend:** Provides the user interface using HTML, CSS, JavaScript, and Jinja2 templates.
- **Flask Backend:** Handles incoming requests and coordinates application functionality.
- **Authentication:** Manages user authentication and password hashing using JWT and Flask-Bcrypt.
- **Matching Engine:** Finds suitable organizations for available food donations.
- **Database Layer:** Uses Flask-SQLAlchemy and SQLAlchemy to communicate with PostgreSQL.
- **Machine Learning Component:** Uses Pandas and the trained Scikit-learn model to predict food waste.


## Installation and Setup

Follow these steps to run the project locally.

### 1. Clone the Repository

```bash
git clone https://github.com/cavid-isgender/FoodSave.git
```

### 2. Navigate to the Project Directory

```bash
cd FoodSave
```

### 3. Install Dependencies

Make sure Python 3.11 or a compatible version is installed.

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory.

Add the required configuration variables:

```env
secret_key=your_secret_key
database_url=postgresql://username:password@localhost:5432/database_name
```

Replace the placeholder values with your own configuration.

### 5. Configure PostgreSQL

Make sure PostgreSQL is installed and running.

Create a database and update the `database_url` variable in your `.env` file with the appropriate connection details.

---

## Environment Variables

The application uses the following environment variables:

| Variable | Description |
|---|---|
| `secret_key` | Flask application secret key |
| `database_url` | PostgreSQL database connection URL |

**Important:** Never commit your actual `.env` file or database credentials to GitHub.

---

## Running the Application

After completing the installation and configuration steps, start the Flask application:

```bash
python run.py
```

Open your browser and navigate to:

```text
http://127.0.0.1:5000/
```

---

## API Overview

The application provides backend routes for managing donations, matching organizations, and predicting food waste.

### Food Donations

| Endpoint | Description |
|---|---|
| `/donations` | Retrieve donation records |
| `/donations/<id>` | Retrieve a specific donation |
| `/donations/<id>/restore` | Restore an archived donation |

### Donation Matching

| Endpoint | Description |
|---|---|
| `/matches` | Handle donation matching requests |
| `/donations/<id>/match` | Find matching organizations for a donation |
| `/organizations/me/matches` | Retrieve matches associated with the organization |
| `/donor/requests` | Retrieve donation match requests for the donor |

### Food Waste Prediction

| Endpoint | Description |
|---|---|
| `/predict/food-waste` | Predict food waste using the trained machine learning model |

The API uses JSON for data exchange where applicable. Protected endpoints require valid JWT authentication.

---


## API Documentation

FoodSave provides REST-style API endpoints for authentication, user management, food donations, organization matching, dashboard statistics, and food waste prediction.

### Authentication

Most API endpoints require JWT authentication.

Include the access token in the request header:

```http
Authorization: Bearer <access_token>
```

The application uses:
- Access tokens with a 15-minute expiration.
- Refresh tokens with a 7-day expiration.

### Authentication Endpoints

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/register` | Register a new user | No |
| POST | `/login` | Authenticate a user and receive access and refresh tokens | No |
| POST | `/refresh` | Generate a new access token | Refresh token |

### User Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/users` | Retrieve all users | Admin only |

### Food Donation Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/donations` | Retrieve donations according to user role | Authenticated users |
| GET | `/donations/<donation_id>` | Retrieve a specific donation | Authenticated users with permission |
| POST | `/donations` | Create a new food donation | Donor |
| PUT | `/donations/<donation_id>` | Update a donation | Owner or admin |
| DELETE | `/donations/<donation_id>` | Archive a donation | Owner or admin |
| GET | `/donations/my` | Retrieve the donor's donation history | Donor |
| POST | `/donations/<donation_id>/restore` | Restore an archived donation | Admin |

The donation archive feature uses soft deletion, preserving donation records instead of permanently deleting them.

### Organization Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/organizations` | Retrieve all organizations | Authenticated users |
| GET | `/organizations/<organization_id>` | Retrieve a specific organization | Authenticated users |
| GET | `/organizations/me/matches` | Retrieve matches belonging to the current organization | Organization |
| GET | `/organizations/me/donations` | Retrieve donations associated with the organization's matches | Organization |

### Donation Matching Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/donations/<donation_id>/match` | Find suitable organizations for a donation and create match requests | Donation owner or admin |
| POST | `/matches` | Create a match request for a donation | Organization |
| GET | `/matches/<match_id>` | Retrieve match details | Related donor, organization, or admin |
| GET | `/donor/requests` | Retrieve incoming organization requests | Donor |
| POST | `/matches/<match_id>/accept` | Accept a match request | Donor |
| POST | `/matches/<match_id>/reject` | Reject a match request | Donor |
| POST | `/matches/<match_id>/complete` | Mark an accepted match as completed | Related organization |

### Dashboard Endpoint

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/dashboard/stats` | Retrieve dashboard statistics based on the user's role | Authenticated users |

### Machine Learning Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/predict/food-waste` | Predict food waste and save the prediction result | Authenticated users |
| GET | `/predictions` | Retrieve the current user's prediction history | Authenticated users |

### Example API Requests

#### 1. User Registration

**POST** `/register`

Request body:

```json
{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "your_password",
    "role": "donor"
}
```

#### 2. User Login

**POST** `/login`

Request body:

```json
{
    "email": "john@example.com",
    "password": "your_password"
}
```

The response includes an access token and a refresh token.

#### 3. Create a Food Donation

**POST** `/donations`

Request body:

```json
{
    "food_name": "Fresh Vegetables",
    "category": "Vegetables",
    "quantity_kg": 25,
    "expiry_date": "2026-12-01",
    "location": "Lodz"
}
```

Requires a donor access token.

#### 4. Request Food Waste Prediction

**POST** `/predict/food-waste`

Request body:

```json
{
    "meals_served": 150,
    "kitchen_staff": 5,
    "temperature_c": 22.5,
    "humidity_percent": 60,
    "day_of_week": 2,
    "special_event": 0,
    "past_waste_kg": 12.5,
    "staff_experience": "experienced",
    "waste_category": "vegetables"
}
```

The prediction result is returned in kilograms and saved for the authenticated user.

### HTTP Status Codes

| Status Code | Meaning |
|---|---|
| 200 | Request completed successfully |
| 201 | Resource created successfully |
| 400 | Invalid request or input data |
| 401 | Authentication required or invalid credentials/token |
| 403 | Access forbidden |
| 404 | Resource not found |
| 409 | Conflict with the current resource state |
| 500 | Internal server error |

### Frontend Pages

In addition to the JSON API, the Flask application provides the following HTML pages:

| Method | Route | Description |
|---|---|---|
| GET | `/` | Redirects to the login page |
| GET | `/login-page` | Login page |
| GET | `/register-page` | Registration page |
| GET | `/dashboard` | Dashboard page |
| GET | `/food-waste-prediction` | Food waste prediction page |
| GET | `/donations-page` | Donations page |
| GET | `/organizations-page` | Organizations page |


## Future Improvements

Potential improvements for future development include:

- Expanding the machine learning dataset.
- Improving prediction accuracy through model comparison and hyperparameter tuning.
- Adding more detailed analytics to the dashboard.
- Improving donation matching algorithms.
- Adding automated notifications for donation status updates.
- Expanding API documentation and automated testing.
- Deploying the application to a cloud platform.

---

## Author

Developed as a portfolio project to demonstrate skills in Python, Flask, PostgreSQL, web development, and machine learning.

**GitHub Repository:**  
https://github.com/cavid-isgender/FoodSave

---

## License

This project is currently intended for educational and portfolio purposes.