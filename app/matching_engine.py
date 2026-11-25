from datetime import date
import unicodedata
from app.models import Organization, Match


def normalize_location(location):
    location = location.strip().casefold()
    location = unicodedata.normalize("NFKD",location)
    return "".join(char for char in location if not unicodedata.combining(char)).replace("ł","l")

def find_matching_organizations(donation):
    today = date.today()

    # 1. İanənin son istifadə tarixi keçibsə, uyğun təşkilat tapma.
    if donation.expiry_date < today:
        return []

    # 2. İanə mövcud deyilsə və ya artıq götürülübsə, dayandır.
    if donation.status != 'available':
        return []

    # 3. Bütün təşkilatları bazadan götür.
    organizations = Organization.query.all()

    candidates = []

    # 4. Hər təşkilatın uyğunluğunu yoxla.
    for org in organizations:

        # Təşkilatın tutumu ianənin çəkisindən azdırsa, ötür.
        if org.capacity_kg < donation.quantity_kg:
            continue

        # Təşkilat və ianə eyni məkanda olmalıdır.
        if normalize_location(org.location) != normalize_location(donation.location):
            continue

        # Təşkilatın qəbul etdiyi kateqoriyaları əldə et.
        accepted_categories = {
            category.name.strip().casefold()
            for category in org.food_categories
        }

        # İanənin kateqoriyasını təşkilat qəbul etmirsə, ötür.
        if donation.category.strip().casefold() not in accepted_categories:
            continue

        # Bu ianə ilə təşkilat arasında əvvəl match yaradılıbsa, ötür.
        existing_match = Match.query.filter_by(
            donation_id=donation.id,
            organization_id=org.id
        ).first()

        if existing_match is not None:
            continue

        # 5. Uyğunluq balını hesabla.
        remaining_capacity = org.capacity_kg - donation.quantity_kg

        score = 100 - (
            remaining_capacity / max(org.capacity_kg, 1) * 30
        )

        # Son istifadə tarixinə qalan günlərin sayı.
        days_left = (donation.expiry_date - today).days

        # Tez xarab olacaq qidaya üstünlük ver.
        if days_left <= 2:
            score += 20
        elif days_left <= 5:
            score += 10

        # Uyğun təşkilatı nəticələr siyahısına əlavə et.
        candidates.append({
            'organization': org,
            'score': round(score, 2),
            'days_until_expiry': days_left,
            'remaining_capacity_kg': round(remaining_capacity, 2)
        })

    # 6. Bütün təşkilatlar yoxlanıldıqdan sonra
    # nəticələri ən yüksək score-dan ən aşağıya sırala.
    candidates.sort(
        key=lambda item: item['score'],
        reverse=True
    )

    # 7. Uyğun təşkilatların siyahısını qaytar.
    return candidates
