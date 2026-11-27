# API Reference

FoodSave exposes REST-style endpoints for authentication, users, donations, organizations, matching, dashboard statistics, and food waste prediction.

Most endpoints require JWT authentication. Send the access token in the request header:

```http
Authorization: Bearer <access_token>
```

Access tokens expire after 15 minutes; refresh tokens expire after 7 days.

## Endpoints

### Authentication

| Method | Endpoint | Access |
|---|---|---|
| POST | `/register` | Public |
| POST | `/login` | Public |
| POST | `/refresh` | Refresh token |

### Users

| Method | Endpoint | Access |
|---|---|---|
| GET | `/users` | Admin |

### Donations

| Method | Endpoint | Access |
|---|---|---|
| GET | `/donations` | Authenticated users |
| GET | `/donations/<donation_id>` | Authorized users |
| POST | `/donations` | Donor |
| PUT | `/donations/<donation_id>` | Owner or admin |
| DELETE | `/donations/<donation_id>` | Owner or admin; archives the donation |
| GET | `/donations/my` | Donor |
| POST | `/donations/<donation_id>/restore` | Admin |

### Organizations

| Method | Endpoint | Access |
|---|---|---|
| GET | `/organizations` | Authenticated users |
| GET | `/organizations/<organization_id>` | Authenticated users |
| GET | `/organizations/me/matches` | Organization |
| GET | `/organizations/me/donations` | Organization |

### Matching

| Method | Endpoint | Access |
|---|---|---|
| POST | `/donations/<donation_id>/match` | Donation owner or admin |
| POST | `/matches` | Organization |
| GET | `/matches/<match_id>` | Related donor, organization, or admin |
| GET | `/donor/requests` | Donor |
| POST | `/matches/<match_id>/accept` | Donor |
| POST | `/matches/<match_id>/reject` | Donor |
| POST | `/matches/<match_id>/complete` | Related organization |

### Dashboard and predictions

| Method | Endpoint | Access |
|---|---|---|
| GET | `/dashboard/stats` | Authenticated users |
| POST | `/predict/food-waste` | Authenticated users |
| GET | `/predictions` | Authenticated users |

## Example: food waste prediction

`POST /predict/food-waste`

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

The response contains the predicted food waste in kilograms.

> This endpoint list is transcribed from the project's README. Verify routes and access permissions against `app/routes.py` before treating this document as a definitive API contract.
