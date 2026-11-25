from app import app,db,bcrypt
from app.models import User,Organization,FoodDonation,Match
from datetime import date

users = [{'name':'greenGarden', 'email':'contact@greengarden.example', 'password':'green123', 'role':'donor'}, # already exist in database, sign in directly with these accounts
         {'name':'freshMart', 'email':'contact@freshmart.example', 'password':'fresh123', 'role':'donor'},
         {'name':'sweetCorner', 'email':'info@sweetcorner.example', 'password':'sweet123', 'role':'donor'},
         {'name':'hopeFoodBank', 'email':'contact@hopefoodbank.example', 'password':'food123', 'role':'organization'},
         {'name':'communitySupport', 'email':'office@communitysupport.example', 'password':'community123', 'role':'organization'},
         {'name':'AdminFoodWaste', 'email':'admin@foodwaste.example', 'password':'admin123', 'role':'admin'}]

with app.app_context():
    db.create_all()

    # Create users
    for user_data in users:
        existing_user = User.query.filter_by(email = user_data['email']).first()
        if existing_user is None:
            hashed_password = bcrypt.generate_password_hash(user_data['password']).decode('utf-8')
            user = User(name = user_data['name'],
                        email = user_data['email'],
                        password = user_data['password'],
                        role = user_data['role'])
            db.session.add(user)
    db.session.commit()
    # Get users
    green_garden = User.query.filter_by(email='contact@greengarden.example').first()
    fresh_mart = User.query.filter_by(email='contact@freshmart.example').first()
    sweet_corner = User.query.filter_by(email ='info@sweetcorner.example').first()
    hope_food_bank = User.query.filter_by(email = 'contact@hopefoodbank.example').first()
    community_support = User.query.filter_by(email = 'office@communitysupport.example').first()
    food_waste_admin = User.query.filter_by(email = 'admin@foodwaste.example').first()

    # Create organizations
    if hope_food_bank.organization is None:
        organization = Organization(
            user_id = hope_food_bank.id,
            organization_name = 'Hope Food Bank',
            location = 'Lodz',
            capacity_kg = 500,
            phone = '+48600100200'
        )
        db.session.add(organization)
    else:
        hope_org = hope_food_bank.organization

    if community_support.organization is None:
        organization = Organization(
            user_id = community_support.id,
            organization_name = 'Community Support Center',
            location = 'Lodz',
            capacity_kg = 300,
            phone = '+48600300400'
        )
        db.session.add(organization)
    else:
        community_org = community_support.organization


        # Create food donations
        if not green_garden.donations:
            donation = FoodDonation(
                donor_id = green_garden.id,
                food_name = 'Cooked Pasta',
                category = 'prepared_food',
                quantity_kg = 25,
                expiry_date = date(2026,9,17),
                location = 'Lodz',
                status = 'available'
            )
            db.session.add(donation)

        if not fresh_mart.donations:
            donation = FoodDonation(
                donor_id = fresh_mart.id,
                food_name = 'Fresh Bread',
                category = 'bakery',
                quantity_kg = 40,
                expiry_date = date(2026,9,28),
                location = 'Lodz',
                status = 'available'
            )
            db.session.add(donation)

        if not sweet_corner.donations:
            donation = FoodDonation(
                donor_id = sweet_corner.id,
                food_name = 'Croissants',
                category = 'bakery',
                quantity_kg = 15,
                expiry_date = date(2026,10,7),
                location = 'Warsaw',
                status = 'available'
            )
            db.session.add(donation)
        db.session.commit()


        #get donations
        pasta = FoodDonation.query.filter_by(food_name = 'Cooked Pasta').first()
        bread = FoodDonation.query.filter_by(food_name = 'Fresh Bread').first()
        croissants = FoodDonation.query.filter_by(food_name = 'Croissants').first()

        # create matches
        if pasta and not pasta.matches:
            match = Match(
                donation_id = pasta.id,
                organization_id = hope_org.id,
                status = 'accepted'
            )
            db.session.add(match)
            pasta.status = 'matched'

        if bread and not bread.matches:
            match = Match(
                donation_id = bread.id,
                organization_id = community_org.id,
                status = 'pending'
            )
            db.session.add(match)
            bread.status = 'matched'

        if croissants and not croissants.matches:
            match = Match(
                donation_id = croissants.id,
                organization_id = hope_org.id,
                status = 'completed'
            )
            db.session.add(match)
            croissants.status = 'collected'

        db.session.commit()

        print('Seed data created successfully')





















