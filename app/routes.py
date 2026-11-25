from flask import jsonify, request, render_template, url_for, redirect
from app import app,db, bcrypt
from app.models import FoodDonation, Organization, Match, User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, create_refresh_token
from app.matching_engine import find_matching_organizations
from sqlalchemy import text
from datetime import time,datetime


@app.route('/')
def home():
    return redirect(url_for('login_page'))

@app.route('/login-page')
def login_page():
    return render_template('login.html')


@app.route('/register-page')
def register_page():
    return render_template('register.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


@app.route('/food-waste-prediction')
def food_waste_prediction():
    return render_template('food_waste_prediction.html')


@app.route('/donations-page')
def donations_page():
    return render_template('donations.html')


@app.route('/organizations-page')
def organizations_page():
    return render_template('organizations.html')



@app.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({'error': 'A valid JSON body is required'}), 400

    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not name or not email or not password or not role:
        return jsonify({'error': 'All fields are required'}), 400

    if role not in ['donor', 'organization']:
        return jsonify({'error': 'Invalid role'}), 400

    existing_user = User.query.filter_by(email=email).first()

    if existing_user:
        return jsonify({'error': 'Email already registered'}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    user = User(
        name=name,
        email=email,
        password=hashed_password,
        role=role
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': 'User registered successfully',
        'user_id': user.id
    }), 201



@app.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            'error': 'A valid JSON body is required'
        }), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({
            'error': 'Email and password are required'
        }), 400

    user = User.query.filter_by(email=email).first()

    if user is None:
        return jsonify({
            'error': 'Invalid email or password!'
        }), 401

    if not bcrypt.check_password_hash(user.password, password):
        return jsonify({
            'error': 'Invalid email or password'
        }), 401

    # Generate access and refresh tokens
    access_token = create_access_token(
        identity=str(user.id)
    )

    refresh_token = create_refresh_token(
        identity=str(user.id)
    )

    return jsonify({
        'message': 'Login Successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role
        }
    }), 200




@app.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()

    user = db.session.get(User, int(current_user_id))

    if user is None:
        return jsonify({
            "error": "User not found"
        }), 401

    new_access_token = create_access_token(
        identity=str(user.id)
    )

    return jsonify({
        "access_token": new_access_token
    }), 200


@app.route('/users', methods=['GET'])
@jwt_required()   # Bu decorator funksiyanın icrasından əvvəl JWT token-i yoxlayır.
def get_users():
    current_user_id = int(get_jwt_identity())
    current_user = db.session.get(User, current_user_id)

    if current_user is None:
        return jsonify({'error': 'User not found'}), 404

    if current_user.role != 'admin':
        return jsonify({'error': 'Access forbidden'}), 403

    users = User.query.all()
    result = []

    for user in users:
        result.append({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'created_at': user.created_at.isoformat()
        })

    return jsonify(result), 200



@app.route('/donations', methods=['GET'])
@jwt_required()
def get_donations():

    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    # Check whether admin requested archived donations
    include_archived = (
        request.args.get('include_archived', 'false').lower() == 'true'
    )

    if user.role == 'admin':

        query = FoodDonation.query

        if not include_archived:
            query = query.filter_by(is_archived=False)

        donations = query.all()

    elif user.role == 'donor':

        donations = FoodDonation.query.filter_by(
            donor_id=current_user_id,
            is_archived=False
        ).all()

    elif user.role == 'organization':

        donations = FoodDonation.query.filter_by(
            status='available',
            is_archived=False
        ).all()

    else:
        return jsonify({'error': 'Access forbidden'}), 403

    result = []

    for donation in donations:
        result.append({
            'id': donation.id,
            'food_name': donation.food_name,
            'category': donation.category,
            'quantity_kg': donation.quantity_kg,
            'expiry_date': (
                donation.expiry_date.isoformat()
                if donation.expiry_date else None
            ),
            'location': donation.location,
            'status': donation.status,
            'created_at': (
                donation.created_at.isoformat()
                if donation.created_at else None
            ),
            'is_archived': donation.is_archived,
            'archived_at': (
                donation.archived_at.isoformat()
                if donation.archived_at else None
            )
        })

    return jsonify(result), 200



@app.route('/donations/<int:donation_id>', methods=['GET'])
@jwt_required()
def get_donation(donation_id):
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    donation = db.session.get(FoodDonation, donation_id)

    if donation is None:
        return jsonify({'error': 'Donation not found'}), 404

    if donation.is_archived and user.role != 'admin':
        return jsonify({
            'error': 'Donation not found'
        }), 404

    if user.role == 'admin':
        allowed = True

    elif user.role == 'donor':
        allowed = donation.donor_id == current_user_id

    elif user.role == 'organization':
        organization = Organization.query.filter_by(
            user_id=current_user_id
        ).first()

        if organization is None:
            return jsonify({
                'error': 'Organization profile not found'
            }), 404

        has_match = Match.query.filter_by(
            donation_id=donation.id,
            organization_id=organization.id
        ).first() is not None

        allowed = donation.status == 'available' or has_match

    else:
        allowed = False

    if not allowed:
        return jsonify({'error': 'Access forbidden'}), 403

    return jsonify({
        'id': donation.id,
        'food_name': donation.food_name,
        'category': donation.category,
        'quantity_kg': donation.quantity_kg,
        'expiry_date': (
            donation.expiry_date.isoformat()
            if donation.expiry_date else None
        ),
        'location': donation.location,
        'status': donation.status
    }), 200



# jsonify - Response göndərmək üçün istifadə edirik:
# request - Client-in göndərdiyi HTTP request haqqında məlumat almaq üçün istifadə olunur.
# request.get_json() - Client-in göndərdiyi JSON-u Python dictionary-yə çevirir.

@app.route('/donations',methods = ['POST'])
@jwt_required()
def create_donation():
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User,current_user_id)

    if user is None:
        return jsonify({'error':'user not found'}),404

    if user.role != 'donor':
        return jsonify({'error':'Only donors can create donations'}),403

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            'error': 'A valid JSON body is required'
        }), 400


    required_fields = [
                       'food_name',
                       'category',
                       'quantity_kg',
                       'expiry_date',
                       'location']

    for field in required_fields:
        if field not in data:
            return jsonify({
                'error':f'{field} is required!'
            }), 400

    donation = FoodDonation(
        donor_id = user.id,
        food_name = data['food_name'],
        category = data['category'],
        quantity_kg = data['quantity_kg'],
        expiry_date = data['expiry_date'],
        location = data['location'],
        status = 'available'
    )
    db.session.add(donation)
    db.session.commit()

    return jsonify({
        'message':'Donation created successfully!',
        'donation_id':donation.id
    }), 201




@app.route('/donations/<int:donation_id>', methods=['PUT'])
@jwt_required()
def update_donation(donation_id):
    current_user_id = int(get_jwt_identity())

    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    donation = db.session.get(FoodDonation, donation_id)

    if donation is None:
        return jsonify({'error': 'Donation not found'}), 404

    if user.role != 'admin' and donation.donor_id != current_user_id:
        return jsonify({
            'error': 'You can only update your own donations'
        }), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            'error': 'A valid JSON body is required'
        }), 400

    allowed_fields = [
        'food_name',
        'category',
        'quantity_kg',
        'expiry_date',
        'location'
    ]

    for field in allowed_fields:
        if field in data:
            if data[field] is None or data[field] == '':
                return jsonify({
                    'error': f'{field} cannot be empty'
                }), 400

            setattr(donation, field, data[field])

    db.session.commit()

    return jsonify({
        'message': 'Donation updated successfully',
        'donation_id': donation.id
    }), 200



@app.route('/donations/<int:donation_id>', methods=['DELETE'])
@jwt_required()
def delete_donation(donation_id):

    current_user_id = int(get_jwt_identity())

    donation = db.session.get(FoodDonation, donation_id)

    if donation is None:
        return jsonify({
            'error': 'Donation not found'
        }), 404

    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({
            'error': 'User not found'
        }), 404

    if user.role != 'admin' and donation.donor_id != current_user_id:
        return jsonify({
            'error': 'You can only archive your own donations'
        }), 403

    if donation.is_archived:
        return jsonify({
            'error': 'Donation is already archived'
        }), 400

    if donation.status == 'completed':
        return jsonify({
            'error': 'Completed donations cannot be archived'
        }), 400

    accepted_match = Match.query.filter_by(
        donation_id=donation_id,
        status='accepted'
    ).first()

    completed_match = Match.query.filter_by(
        donation_id=donation_id,
        status='completed'
    ).first()

    if accepted_match or completed_match:
        return jsonify({
            'error': 'Donation with an accepted or completed match cannot be archived'
        }), 400

    donation.is_archived = True
    donation.archived_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        'message': 'Donation archived successfully',
        'donation_id': donation_id
    }), 200



@app.route('/donations/my', methods=['GET'])
@jwt_required()
def get_my_donations():
    current_user_id = int(get_jwt_identity())

    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    if user.role != 'donor':
        return jsonify({
            'error': 'Only donors can view their donation history'
        }), 403

    donations = (
        FoodDonation.query
        .filter_by(donor_id=current_user_id)
        .order_by(FoodDonation.id.desc())
        .all()
    )

    result = []

    for donation in donations:
        result.append({
            'id': donation.id,
            'food_name': donation.food_name,
            'category': donation.category,
            'quantity_kg': donation.quantity_kg,
            'expiry_date': donation.expiry_date.isoformat(),
            'location': donation.location,
            'status': donation.status
        })

    return jsonify(result), 200


@app.route('/donations/<int:donation_id>/restore', methods=['POST'])
@jwt_required()
def restore_donation(donation_id):
    current_user_id = int(get_jwt_identity())

    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    donation = db.session.get(FoodDonation, donation_id)

    if donation is None:
        return jsonify({'error': 'Donation not found'}), 404

    if not donation.is_archived:
        return jsonify({'error': 'Donation is not archived'}), 400

    donation.is_archived = False
    donation.archived_at = None

    db.session.commit()

    return jsonify({
        'message': 'Donation restored successfully',
        'donation_id': donation_id
    }), 200


@app.route('/organizations',methods = ['GET'])
@jwt_required()
def get_organizations():
    organizations = Organization.query.all()
    result = []
    for organization in organizations:
        result.append({
            'id':organization.id,
            'organization_name':organization.organization_name,
            'location':organization.location,
            'capacity_kg':organization.capacity_kg,
            'phone':organization.phone
        })
    return jsonify(result), 200



@app.route('/organizations/<int:organization_id>', methods=['GET'])
@jwt_required()
def get_organization(organization_id):
    organization = db.session.get(Organization, organization_id)

    if organization is None:
        return jsonify({
            'error': 'Organization not found'
        }), 404

    return jsonify({
        'id': organization.id,
        'organization_name': organization.organization_name,
        'location': organization.location,
        'capacity_kg': organization.capacity_kg,
        'phone': organization.phone
    }), 200



@app.route('/organizations/me/matches',methods = ['GET'])
@jwt_required()
def get_my_matches():
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User,current_user_id)

    if user is None:
        return jsonify({'error':'User not found'}),404

    if user.role != 'organization':
        return jsonify({'error':'Only organizations can view their matches'}),403

    organization = Organization.query.filter_by(user_id = user.id).first()

    if organization is None:
        return jsonify({
            'error': 'Organization profile not found'
        }),404

    matches = Match.query.filter_by( organization_id=organization.id).all()

    results = []

    for match in matches:
        donation = match.donation

        results.append({
            'match_id': match.id,
            'status': match.status,
            'matched_at': (
                match.matched_at.isoformat()
                if match.matched_at else None
            ),
            'donation': {
                'donation_id': donation.id,
                'food_name': donation.food_name,
                'category': donation.category,
                'quantity_kg': donation.quantity_kg,
                'expiry_date': donation.expiry_date.isoformat(),
                'location': donation.location,
                'donation_status': donation.status
            }
        })

    return jsonify({
        'organization_id': organization.id,
        'organization_name': organization.organization_name,
        'total_matches': len(results),
        'matches': results
    }), 200


@app.route('/donor/requests', methods=['GET'])
@jwt_required()
def get_donor_requests():
    current_user_id = int(get_jwt_identity())

    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    if user.role != 'donor':
        return jsonify({
            'error': 'Only donors can view incoming requests'
        }), 403

    matches = (
        Match.query
        .join(FoodDonation, Match.donation_id == FoodDonation.id)
        .filter(FoodDonation.donor_id == current_user_id)
        .order_by(Match.matched_at.desc())
        .all()
    )

    results = []

    for match in matches:
        donation = match.donation
        organization = match.organization

        results.append({
            'match_id': match.id,
            'status': match.status,
            'matched_at': (
                match.matched_at.isoformat()
                if match.matched_at else None
            ),
            'organization': {
                'id': organization.id,
                'name': organization.organization_name,
                'location': organization.location,
                'phone': organization.phone
            },
            'donation': {
                'id': donation.id,
                'food_name': donation.food_name,
                'category': donation.category,
                'quantity_kg': donation.quantity_kg,
                'expiry_date': (
                    donation.expiry_date.isoformat()
                    if donation.expiry_date else None
                ),
                'location': donation.location,
                'status': donation.status
            }
        })

    return jsonify({
        'total_requests': len(results),
        'requests': results
    }), 200




@app.route('/organizations/me/donations', methods=['GET'])
@jwt_required()
def get_organization_donations():
    current_user_id = int(get_jwt_identity())

    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    if user.role != 'organization':
        return jsonify({
            'error': 'Only organizations can view their donations'
        }), 403

    organization = Organization.query.filter_by(
        user_id=current_user_id
    ).first()

    if organization is None:
        return jsonify({
            'error': 'Organization profile not found'
        }), 404

    matches = (
        Match.query
        .filter_by(organization_id=organization.id)
        .order_by(Match.id.desc())
        .all()
    )

    result = []

    for match in matches:
        donation = match.donation

        result.append({
            'match_id': match.id,
            'match_status': match.status,
            'matched_at': (
                match.matched_at.isoformat()
                if match.matched_at else None
            ),
            'donation': {
                'id': donation.id,
                'food_name': donation.food_name,
                'category': donation.category,
                'quantity_kg': donation.quantity_kg,
                'expiry_date': (
                    donation.expiry_date.isoformat()
                    if donation.expiry_date else None
                ),
                'location': donation.location,
                'status': donation.status
            }
        })

    return jsonify(result), 200




@app.route('/matches', methods=['POST'])
@jwt_required()
def create_match():
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    if user.role != 'organization':
        return jsonify({
            'error': 'Only organizations can create matches'
        }), 403

    organization = Organization.query.filter_by(
        user_id=current_user_id
    ).first()

    if organization is None:
        return jsonify({
            'error': 'Organization profile not found'
        }), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            'error': 'A valid JSON body is required'
        }), 400

    donation_id = data.get('donation_id')

    if donation_id is None:
        return jsonify({
            'error': 'donation_id is required'
        }), 400

    donation = db.session.get(FoodDonation, donation_id)

    if donation is None:
        return jsonify({
            'error': 'Donation not found'
        }), 404

    if donation.status != 'available':
        return jsonify({
            'error': 'Donation is not available'
        }), 409

    existing_match = Match.query.filter_by(
        donation_id=donation.id,
        organization_id=organization.id
    ).first()

    if existing_match:
        return jsonify({
            'error': 'This organization already has a match for this donation'
        }), 409

    match = Match(
        donation_id=donation.id,
        organization_id=organization.id,
        status='pending'
    )

    db.session.add(match)
    db.session.commit()

    return jsonify({
        'message': 'Match created successfully',
        'match_id': match.id,
        'status': match.status,
        'donation_status': donation.status
    }), 201




@app.route('/matches/<int:match_id>',methods = ['GET'])
@jwt_required()
def get_match(match_id):
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    match = db.session.get(Match,match_id)

    if match is None:
        return jsonify({
            'error':'Match not found!'
        }), 404

    is_admin = user.role == 'admin'
    is_donor_owner = (
            user.role == 'donor'
            and match.donation.donor_id == current_user_id
    )
    is_org_owner = (
            user.role == 'organization'
            and match.organization.user_id == current_user_id
    )

    if not (is_admin or is_donor_owner or is_org_owner):
        return jsonify({'error': 'Access forbidden'}), 403

    return jsonify({
        'id': match.id,
        'donation_id': match.donation_id,
        'organization_id': match.organization_id,
        'status': match.status,
        'matched_at': match.matched_at.isoformat()
    }), 200



@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error':'Resource not found!'
    }), 404

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({
        'error':'Internal server error!'
    }), 500


@app.route('/donations/<int:donation_id>/match', methods=['POST'])
@jwt_required()
def match_donation(donation_id):
    current_user_id = int(get_jwt_identity())

    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    donation = db.session.get(FoodDonation, donation_id)

    if donation is None:
        return jsonify({'error': 'Donation not found'}), 404

    if user.role != 'admin' and donation.donor_id != user.id:
        return jsonify({
            'error': 'You cannot match this donation'
        }), 403

    if donation.status != 'available':
        return jsonify({
            'error': 'Only available donations can be matched'
        }), 409

    candidates = find_matching_organizations(donation)

    if not candidates:
        return jsonify({
            'message': 'No matching organizations found',
            'matches': []
        }), 200

    created_matches = []

    try:
        for candidate in candidates:
            organization = candidate['organization']

            # Eyni təşkilat üçün artıq match varsa, yenisini yaratma.
            existing_match = Match.query.filter_by(
                donation_id=donation.id,
                organization_id=organization.id
            ).first()

            if existing_match:
                continue

            match = Match(
                donation_id=donation.id,
                organization_id=organization.id,
                status='pending'
            )

            db.session.add(match)
            db.session.flush()

            created_matches.append({
                'match_id': match.id,
                'organization_id': organization.id,
                'organization_name': organization.organization_name,
                'score': candidate['score'],
                'days_until_expiry': candidate['days_until_expiry'],
                'remaining_capacity_kg': candidate['remaining_capacity_kg'],
                'status': match.status
            })

        db.session.commit()

    except Exception:
        db.session.rollback()
        app.logger.exception('Failed to create donation matches')

        return jsonify({
            'error': 'Failed to create matches'
        }), 500

    return jsonify({
        'message': 'Matching completed successfully',
        'donation_id': donation.id,
        'total_matches': len(created_matches),
        'matches': created_matches
    }), 201



@app.route('/matches/<int:match_id>/accept', methods=['POST'])
@jwt_required()
def accept_match(match_id):
    current_user_id = int(get_jwt_identity())

    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    if user.role != 'donor':
        return jsonify({
            'error': 'Only donors can accept requests'
        }), 403

    match = db.session.get(Match, match_id)

    if match is None:
        return jsonify({'error': 'Match not found'}), 404

    # Donor yalnız öz donation-ına gələn sorğunu qəbul edə bilər.
    if match.donation.donor_id != current_user_id:
        return jsonify({
            'error': 'You cannot accept a request for another donor donation'
        }), 403

    if match.status != 'pending':
        return jsonify({
            'error': 'Only pending requests can be accepted'
        }), 400

    if match.donation.status != 'available':
        return jsonify({
            'error': 'This donation is no longer available'
        }), 409

    try:
        match.status = 'accepted'
        match.donation.status = 'matched'

        # Eyni donation üçün digər pending sorğuları rədd et.
        other_matches = Match.query.filter(
            Match.donation_id == match.donation_id,
            Match.id != match.id,
            Match.status == 'pending'
        ).all()

        for other_match in other_matches:
            other_match.status = 'rejected'

        db.session.commit()

    except Exception:
        db.session.rollback()
        app.logger.exception('Failed to accept donation request')

        return jsonify({
            'error': 'Failed to accept request'
        }), 500

    return jsonify({
        'message': 'Donation request accepted successfully',
        'match_id': match.id,
        'status': match.status,
        'donation_id': match.donation_id,
        'donation_status': match.donation.status
    }), 200


@app.route('/matches/<int:match_id>/reject', methods=['POST'])
@jwt_required()
def reject_match(match_id):
    current_user_id = int(get_jwt_identity())

    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    if user.role != 'donor':
        return jsonify({
            'error': 'Only donors can reject requests'
        }), 403

    match = db.session.get(Match, match_id)

    if match is None:
        return jsonify({'error': 'Match not found'}), 404

    if match.donation.donor_id != current_user_id:
        return jsonify({
            'error': 'You cannot reject a request for another donor donation'
        }), 403

    if match.status != 'pending':
        return jsonify({
            'error': 'Only pending requests can be rejected'
        }), 400

    try:
        match.status = 'rejected'

        # Donation available olaraq qalır.
        db.session.commit()

    except Exception:
        db.session.rollback()
        app.logger.exception('Failed to reject donation request')

        return jsonify({
            'error': 'Failed to reject request'
        }), 500

    return jsonify({
        'message': 'Donation request rejected successfully',
        'match_id': match.id,
        'status': match.status,
        'donation_id': match.donation_id,
        'donation_status': match.donation.status
    }), 200


@app.route('/matches/<int:match_id>/complete', methods=['POST'])
@jwt_required()
def complete_match(match_id):
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    if user.role != 'organization':
        return jsonify({
            'error': 'Only organizations can complete matches'
        }), 403

    organization = Organization.query.filter_by(
        user_id=current_user_id
    ).first()

    if organization is None:
        return jsonify({
            'error': 'Organization profile not found'
        }), 404

    match = db.session.get(Match, match_id)

    if match is None:
        return jsonify({'error': 'Match not found'}), 404

    if match.organization_id != organization.id:
        return jsonify({
            'error': 'You cannot complete another organization match'
        }), 403

    if match.status != 'accepted':
        return jsonify({
            'error': 'Only accepted matches can be completed'
        }), 400

    try:
        match.status = 'completed'
        match.donation.status = 'completed'

        db.session.commit()

    except Exception:
        db.session.rollback()
        app.logger.exception('Failed to complete match')
        return jsonify({
            'error': 'Failed to complete match'
        }), 500

    return jsonify({
        'message': 'Match completed successfully',
        'match_id': match.id,
        'status': match.status,
        'donation_id': match.donation_id,
        'donation_status': match.donation.status
    }), 200




@app.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def dashboard_stats():
    current_user_id = int(get_jwt_identity())

    user = db.session.get(User, current_user_id)

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    # Donor statistikaları
    if user.role == 'donor':
        donations = FoodDonation.query.filter_by(
            donor_id=current_user_id
        )

        total_donations = donations.count()

        completed_donations = donations.filter_by(
            status='completed'
        ).count()

        available_donations = donations.filter_by(
            status='available'
        ).count()

        total_quantity = db.session.query(
            db.func.coalesce(
                db.func.sum(FoodDonation.quantity_kg), 0
            )
        ).filter_by(
            donor_id=current_user_id
        ).scalar()

        incoming_requests = (
            Match.query
            .join(FoodDonation, Match.donation_id == FoodDonation.id)
            .filter(FoodDonation.donor_id == current_user_id)
        )

        total_requests = incoming_requests.count()

        pending_requests = incoming_requests.filter_by(
            status='pending'
        ).count()

        accepted_requests = incoming_requests.filter_by(
            status='accepted'
        ).count()

    # Təşkilat statistikaları
    elif user.role == 'organization':
        organization = Organization.query.filter_by(
            user_id=current_user_id
        ).first()

        if organization is None:
            return jsonify({
                'error': 'Organization profile not found'
            }), 404

        matches = Match.query.filter_by(
            organization_id=organization.id
        )

        total_matches = matches.count()

        pending_matches = matches.filter_by(
            status='pending'
        ).count()

        accepted_matches = matches.filter_by(
            status='accepted'
        ).count()

        completed_matches = matches.filter_by(
            status='completed'
        ).count()

        return jsonify({
            'role': 'organization',
            'total_matches': total_matches,
            'pending_matches': pending_matches,
            'accepted_matches': accepted_matches,
            'completed_matches': completed_matches
        }), 200

    # Admin statistikaları
    elif user.role == 'admin':
        total_donations = FoodDonation.query.count()

        completed_donations = FoodDonation.query.filter_by(
            status='completed'
        ).count()

        available_donations = FoodDonation.query.filter_by(
            status='available'
        ).count()

        total_quantity = db.session.query(
            db.func.coalesce(
                db.func.sum(FoodDonation.quantity_kg), 0
            )
        ).scalar()

    else:
        return jsonify({
            'error': 'Access forbidden'
        }), 403

    response = {
        'role': user.role,
        'total_donations': total_donations,
        'completed_donations': completed_donations,
        'available_donations': available_donations,
        'total_quantity_kg': float(total_quantity)
    }

    if user.role == 'donor':
        response.update({
            'total_requests': total_requests,
            'pending_requests': pending_requests,
            'accepted_requests': accepted_requests
        })

    return jsonify(response), 200


from pathlib import Path
import joblib
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = (BASE_DIR/'ml'/'models'/'food_waste_model.pkl')

food_waste_model = joblib.load(MODEL_PATH)



@app.route('/predict/food-waste', methods=['POST'])
@jwt_required()
def predict_food_waste():
    current_user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            'error': 'A valid JSON object is required'
        }), 400

    required_fields = [
        'meals_served',
        'kitchen_staff',
        'temperature_c',
        'humidity_percent',
        'day_of_week',
        'special_event',
        'past_waste_kg',
        'staff_experience',
        'waste_category'
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                'error': f'{field} is required'
            }), 400

    try:
        meals_served = int(data['meals_served'])
        kitchen_staff = int(data['kitchen_staff'])
        temperature = float(data['temperature_c'])
        humidity = float(data['humidity_percent'])
        day_of_week = int(data['day_of_week'])
        special_event = int(data['special_event'])
        past_waste = float(data['past_waste_kg'])

        if meals_served <= 0 or kitchen_staff <= 0:
            raise ValueError('Counts must be positive')

        if humidity < 0 or humidity > 100:
            raise ValueError('Humidity must be between 0 and 100')

        if day_of_week not in range(7):
            raise ValueError('Day of week must be between 0 and 6')

        if special_event not in (0, 1):
            raise ValueError('Special event must be 0 or 1')

        if past_waste < 0:
            raise ValueError('Past waste cannot be negative')

        if not isinstance(data['staff_experience'], str) or not data['staff_experience'].strip():
            raise ValueError('Invalid staff experience')

        if not isinstance(data['waste_category'], str) or not data['waste_category'].strip():
            raise ValueError('Invalid waste category')

        staff_experience = data['staff_experience'].strip().lower()
        waste_category = data['waste_category'].strip().lower()

        input_data = pd.DataFrame([{
            'meals_served': meals_served,
            'kitchen_staff': kitchen_staff,
            'temperature_C': temperature,
            'humidity_percent': humidity,
            'day_of_week': day_of_week,
            'special_event': special_event,
            'past_waste_kg': past_waste,
            'staff_experience': staff_experience,
            'waste_category': waste_category
        }])
        #print("Model features:", food_waste_model.feature_names_in_)
        #print("Input features:", input_data.columns.tolist())

        prediction = float(food_waste_model.predict(input_data)[0])
        prediction = round(prediction, 2)

        insert_query = text("""
            INSERT INTO food_waste_predictions (
                user_id,
                meals_served,
                kitchen_staff,
                temperature_c,
                humidity_percent,
                day_of_week,
                special_event,
                past_waste_kg,
                staff_experience,
                waste_category,
                predicted_food_waste_kg
            )
            VALUES (
                :user_id,
                :meals_served,
                :kitchen_staff,
                :temperature,
                :humidity,
                :day_of_week,
                :special_event,
                :past_waste,
                :staff_experience,
                :waste_category,
                :prediction
            )
            RETURNING id, created_at
        """)

        result = db.session.execute(insert_query, {
            'user_id': current_user_id,
            'meals_served': meals_served,
            'kitchen_staff': kitchen_staff,
            'temperature': temperature,
            'humidity': humidity,
            'day_of_week': day_of_week,
            'special_event': special_event,
            'past_waste': past_waste,
            'staff_experience': staff_experience,
            'waste_category': waste_category,
            'prediction': prediction
        })

        saved_record = result.fetchone()
        db.session.commit()

        return jsonify({
            'message': 'Prediction calculated and saved successfully',
            'prediction_id': saved_record.id,
            'predicted_food_waste_kg': prediction,
            'created_at': saved_record.created_at.isoformat()
        }), 201

    except (TypeError, ValueError):
        db.session.rollback()
        return jsonify({
            'error': 'Invalid input values'
        }), 400

    except Exception:
        db.session.rollback()
        app.logger.exception('Failed to save food waste prediction')
        return jsonify({
            'error': 'Failed to calculate or save prediction'
        }), 500




@app.route('/predictions', methods=['GET'])
@jwt_required()
def get_food_waste_predictions():
    try:
        current_user_id = int(get_jwt_identity())

        query = text("""
            SELECT *
            FROM food_waste_predictions
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """)

        result = db.session.execute(query, {
            'user_id': current_user_id
        })

        rows = result.mappings().all()

        predictions = []

        for row in rows:
            prediction = dict(row)

            prediction['temperature_c'] = float(
                prediction['temperature_c']
            )
            prediction['humidity_percent'] = float(
                prediction['humidity_percent']
            )
            prediction['past_waste_kg'] = float(
                prediction['past_waste_kg']
            )
            prediction['predicted_food_waste_kg'] = float(
                prediction['predicted_food_waste_kg']
            )
            prediction['created_at'] = (
                prediction['created_at'].isoformat()
            )

            predictions.append(prediction)

        return jsonify({
            'count': len(predictions),
            'predictions': predictions
        }), 200

    except Exception:
        app.logger.exception('Failed to retrieve predictions')
        return jsonify({
            'error': 'Failed to retrieve predictions'
        }), 500


