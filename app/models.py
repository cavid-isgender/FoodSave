from app import db
from datetime import datetime



class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer,primary_key = True)
    name = db.Column(db.String(100), nullable = False)
    email = db.Column(db.String(100),unique = True,nullable = False)
    password = db.Column(db.String(200),nullable=False)
    role = db.Column(db.String(20),nullable=False)
    created_at = db.Column(db.DateTime,default = datetime.utcnow)

    organization = db.relationship('Organization',
                                   back_populates = 'user',
                                   uselist = False,
                                   cascade = 'all,delete-orphan')
    donations = db.relationship('FoodDonation',
                                back_populates = 'donor',
                                cascade = 'all,delete-orphan')
    prediction_logs = db.relationship(
                                'PredictionLog',
                                back_populates='donor',
                                cascade='all, delete-orphan')

organization_categories = db.Table(
    'organization_categories',
    db.Column('organization_id',db.Integer, db.ForeignKey('organizations.id', ondelete = 'CASCADE'),primary_key=True),
    db.Column('category_id',db.Integer, db.ForeignKey('food_categories.id',ondelete='CASCADE'),primary_key=True)

)

class Organization(db.Model):
    __tablename__ = 'organizations'
    id = db.Column(db.Integer,primary_key = True)
    user_id = db.Column(db.Integer,db.ForeignKey('users.id'),unique=True,nullable=False)
    organization_name = db.Column(db.String(200),nullable=False)
    location = db.Column(db.String(200),nullable=False)
    capacity_kg = db.Column(db.Float,nullable = False)
    phone = db.Column(db.String(30),nullable = False)
    accepted_categories = db.Column(db.String(300), nullable=True)


    user = db.relationship('User',
                           back_populates = 'organization')

    matches = db.relationship('Match',
                              back_populates = 'organization',
                              cascade = 'all,delete-orphan')

    food_categories = db.relationship('FoodCategory',
                                      secondary=organization_categories,
                                      back_populates='organizations')



class FoodCategory(db.Model):
    __tablename__ = 'food_categories'
    id = db.Column(db.Integer,primary_key = True)
    name = db.Column(db.String(50),unique=True,nullable = False)

    organizations = db.relationship('Organization',
                                    secondary = organization_categories,
                                    back_populates = 'food_categories')


class FoodDonation(db.Model):
    __tablename__ = 'food_donations'

    id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    food_name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    quantity_kg = db.Column(db.Float, nullable=False)
    expiry_date = db.Column(db.Date, nullable=False)
    location = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='available')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    is_archived = db.Column(db.Boolean, nullable=False, default=False)
    archived_at = db.Column(db.DateTime, nullable=True)

    donor = db.relationship(
        'User',
        back_populates='donations'
    )

    matches = db.relationship(
        'Match',
        back_populates='donation'
    )


class Match(db.Model):
    __tablename__ = 'matches'
    id = db.Column(db.Integer,primary_key=True)
    donation_id = db.Column(db.Integer,db.ForeignKey('food_donations.id'),nullable = False)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'),nullable = False)
    status = db.Column(db.String(20), nullable=False, default='pending')
    matched_at = db.Column(db.DateTime, default = datetime.utcnow)

    organization = db.relationship('Organization',
                                   back_populates = 'matches')

    donation = db.relationship('FoodDonation',
                               back_populates = 'matches')


class PredictionLog(db.Model):
    __tablename__ = 'prediction_logs'
    id = db.Column(db.Integer,primary_key = True)
    donor_id = db.Column(db.Integer,db.ForeignKey('users.id'),nullable = False)
    predicted_waste = db.Column(db.Float,nullable=False)
    actual_waste = db.Column(db.Float, nullable = True)
    prediction_date = db.Column(db.DateTime,default = datetime.utcnow)


    donor = db.relationship('User',
                            back_populates = 'prediction_logs')









