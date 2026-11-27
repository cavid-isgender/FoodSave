# Database

FoodSave uses PostgreSQL, accessed through Flask-SQLAlchemy and SQLAlchemy.

## Tables

| Table | Purpose |
|---|---|
| `users` | User accounts, credentials, and roles |
| `organizations` | Organization profiles |
| `food_categories` | Food category definitions |
| `organization_categories` | Organization-to-category associations |
| `food_donations` | Donation records |
| `matches` | Donation and organization match records |
| `food_waste_predictions` | Prediction inputs and results |
| `prediction_logs` | Prediction log structure |

## Relationships

- `users` to `organizations`: one-to-one; `organizations.user_id` is unique.
- `users` to `food_donations`: one-to-many.
- `users` to `food_waste_predictions`: one-to-many.
- `users` to `prediction_logs`: one-to-many.
- `food_donations` to `matches`: one-to-many.
- `organizations` to `matches`: one-to-many.
- `organizations` to `food_categories`: many-to-many through `organization_categories`.

## Integrity

- Primary and foreign keys maintain record identity and relationships.
- `organizations.user_id` has a unique constraint.
- `organization_categories` uses `(organization_id, category_id)` as a composite primary key.
- The association table's foreign keys use `ON DELETE CASCADE`.
- Donations support archiving through `is_archived` and `archived_at`.

## Notes

The current prediction routes use `food_waste_predictions` to store and retrieve prediction records. `prediction_logs` is present in the database schema but is not used by those routes.
