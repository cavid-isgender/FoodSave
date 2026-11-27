# FoodSave

A Flask and PostgreSQL web application that connects food donors with organizations to support surplus food redistribution. FoodSave also includes a machine-learning component for estimating food waste.

## Features

- User registration, login, and JWT-based authentication
- Food donation creation and management, including archiving and restoration
- Organization matching and match-request management
- Role-based access to application features
- Dashboard statistics and donation activity charts
- Food waste prediction using a trained Random Forest model

## Screenshots

| Dashboard | Food waste prediction |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Prediction](docs/screenshots/predictions.png) |

| Donations | Organizations |
|---|---|
| ![Donations](docs/screenshots/donations.png) | ![Organizations](docs/screenshots/organizations.png) |

## Tech Stack

- **Backend:** Python, Flask
- **Database:** PostgreSQL, Flask-SQLAlchemy, SQLAlchemy
- **Authentication:** Flask-Bcrypt, Flask-JWT-Extended
- **Frontend:** HTML, CSS, JavaScript, Jinja2
- **Machine learning:** Pandas, Scikit-learn, Joblib

## Architecture

```mermaid
flowchart TD
    U[User] --> UI[Frontend]
    UI --> API[Flask Application]
    API --> AUTH[Authentication]
    API --> MATCH[Matching Engine]
    API --> DB[(PostgreSQL)]
    API --> ML[Food Waste Prediction]
    ML --> MODEL[Trained Random Forest Pipeline]
```

## Project Structure

```text
FoodSave/
├── app/                 # Flask application, routes, models, templates and static files
├── data/                # Raw and processed datasets
├── ml/                  # Data inspection, preparation, training and prediction
├── docs/                # Project documentation and screenshots
├── .env.example
├── requirements.txt
├── run.py
├── seed.py
└── README.md
```

## Setup

**Requirements:** Python 3.11 or a compatible version, and PostgreSQL.

1. Clone the repository:

   ```bash
   git clone https://github.com/cavid-isgender/FoodSave.git
   cd FoodSave
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the project root:

   ```env
   secret_key=your_secret_key
   database_url=postgresql://username:password@localhost:5432/database_name
   ```

4. Create a PostgreSQL database and update `database_url` with your connection details.

5. Start the application:

   ```bash
   python run.py
   ```

6. Open [http://127.0.0.1:5000/](http://127.0.0.1:5000/).

## Documentation

- [Machine Learning](docs/machine-learning.md)
- [Database](docs/database.md)
- [API Reference](docs/api.md)

## Security

Passwords are hashed with Flask-Bcrypt. Protected endpoints use JWT authentication, and access is controlled according to user roles. Keep database credentials and other secrets in `.env`; do not commit this file.

## Future Work

- Expand the training dataset and compare model performance
- Improve donation matching
- Add automated notifications and broader test coverage
- Deploy the application to a cloud platform

## Author

**GitHub:** [cavid-isgender/FoodSave](https://github.com/cavid-isgender/FoodSave)

## License

Currently intended for educational and portfolio purposes.
