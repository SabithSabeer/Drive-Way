from flask import Flask, request, session, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from functools import wraps
from bson.objectid import ObjectId
from datetime import datetime
import pandas as pd
import joblib
import os
import re
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from werkzeug.utils import secure_filename

# ----------------- Load environment variables -----------------
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "supersecret")

# Enable CORS for React frontend
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

# ----------------- MongoDB connection -----------------
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(mongo_uri)
db = client.vehicle_marketplace
users_collection = db.users
cars_collection = db.cars
ratings_collection = db.ratings

# Upload folder for images
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Allowed image extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ----------------- Load dataset -----------------
try:
    car_data = pd.read_csv("csv/car_price_dataset.csv")
    
    # Clean and prepare the dataset to match your training data
    current_year = datetime.now().year
    car_data['Car_Age'] = current_year - car_data['YOM']
    
    car_data.rename(columns={
        'Brand': 'make',
        'Model': 'model',
        'YOM': 'year',
        'Fuel Type': 'fuel_type',
        'Gear': 'transmission_type',
        'Condition': 'condition',
        'Millage(KM)': 'mileage',
        'Engine (cc)': 'engine',
        'Town': 'town',
        'Leasing': 'leasing'
    }, inplace=True)

    for col in ['make', 'model', 'condition', 'fuel_type', 'transmission_type', 'town', 'leasing']:
        if col in car_data.columns:
            car_data[col] = car_data[col].astype(str).str.lower().str.strip()

    print("✅ Dataset loaded and cleaned successfully")
    print(f"Dataset shape: {car_data.shape}")
    print(f"Available makes: {sorted(car_data['make'].unique())}")
    
except Exception as e:
    print(f"❌ Error loading dataset: {e}")
    car_data = pd.DataFrame()

# ----------------- Load Retrained ML Model -----------------
try:
    price_model = joblib.load("models/car_price_model_retrained.joblib")
    print("✅ Retrained price prediction model loaded successfully")
    
    try:
        brand_encoder = joblib.load("models/brand_encoder.joblib")
        print("✅ Brand encoder loaded successfully")
    except:
        print("⚠️ Brand encoder not found, creating from dataset...")
        brand_encoder = None
    
    print("🔄 Creating label encoders from current dataset...")
    label_encoders = {}
    categorical_columns = ['make', 'model', 'fuel_type', 'transmission_type', 'condition', 'town', 'leasing']
    
    for col in categorical_columns:
        if col in car_data.columns:
            le = LabelEncoder()
            unique_values = car_data[col].dropna().unique()
            le.fit(unique_values)
            label_encoders[col] = le
            print(f"✅ Created encoder for {col}: {len(unique_values)} unique values - {list(unique_values)[:5]}...")
        else:
            print(f"❌ Column '{col}' not found in dataset")
    
    print(f"✅ Label encoders created for: {list(label_encoders.keys())}")
    
except Exception as e:
    print(f"❌ Error loading ML model: {e}")
    price_model = None
    label_encoders = {}

try:
    multi_target_model = joblib.load("models/multi_target_classifier.joblib")
    classifier_label_encoders = joblib.load("models/classifier_label_encoders.joblib")
    print("✅ Multi-target brand/model classifier and encoders loaded successfully")
except Exception as e:
    print(f"❌ Error loading multi-target classifier or encoders: {e}")
    multi_target_model = None
    classifier_label_encoders = {}

# ----------------- Helpers -----------------
def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required", "authenticated": False}), 401
        return f(*args, **kwargs)
    return wrapper

def serialize_objectid(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: serialize_objectid(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_objectid(v) for v in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def sanitize_input(data):
    if isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    if isinstance(data, list):
        return [sanitize_input(v) for v in data]
    if isinstance(data, str):
        return re.sub(r"[<>{};]", "", data).strip().lower()
    if hasattr(data, 'item'):
        return sanitize_input(data.item())
    if hasattr(data, 'iloc'):
        if len(data) == 1:
            return sanitize_input(data.iloc[0])
    return data

def find_closest_match(input_value, available_classes, field_name=""):
    if available_classes is None or len(available_classes) == 0:
        print(f"❌ No available classes for {field_name}")
        return None
        
    input_value = str(input_value).lower().strip()
    
    if hasattr(available_classes, 'tolist'):
        available_classes_list = available_classes.tolist()
    else:
        available_classes_list = list(available_classes)
    
    available_classes_lower = [str(cls).lower().strip() for cls in available_classes_list]
    
    print(f"🔍 Searching for '{input_value}' in {field_name}")
    print(f"Available options: {available_classes_lower[:10]}...")
    
    if input_value in available_classes_lower:
        idx = available_classes_lower.index(input_value)
        matched_value = available_classes_list[idx]
        print(f"✅ Exact match found: '{matched_value}'")
        return matched_value
    
    for i, cls in enumerate(available_classes_lower):
        if input_value in cls or cls in input_value:
            matched_value = available_classes_list[i]
            print(f"✅ Partial match found: '{matched_value}' for '{input_value}'")
            return matched_value
    
    common_mappings = {
        'petrol': 'gasoline',
        'gasoline': 'petrol',
        'manual': 'manual',
        'automatic': 'auto',
        'auto': 'automatic',
        'used': 'used',
        'new': 'new',
        'brand new': 'new',
        'no': 'no leasing',
        'yes': 'leasing',
        'leasing': 'leasing',
        'no leasing': 'no leasing',
        'ongoing lease': 'ongoing lease',
        'no lease': 'no leasing'
    }
    
    if input_value in common_mappings:
        alternative = common_mappings[input_value]
        if alternative in available_classes_lower:
            idx = available_classes_lower.index(alternative)
            matched_value = available_classes_list[idx]
            print(f"✅ Mapped match found: '{matched_value}' for '{input_value}' -> '{alternative}'")
            return matched_value
    
    print(f"❌ No match found for '{input_value}' in {field_name}")
    return None

def format_price_lkr(price):
    if price >= 10000000:
        crores = price / 10000000
        return f"LKR {crores:.1f} Crores" if crores < 100 else f"LKR {crores:.0f} Crores"
    elif price >= 100000:
        lakhs = price / 100000
        return f"LKR {lakhs:.1f} Lakhs" if lakhs < 100 else f"LKR {lakhs:.0f} Lakhs"
    elif price >= 1000:
        thousands = price / 1000
        return f"LKR {thousands:.0f}K"
    else:
        return f"LKR {price:.0f}"

def create_smaller_model():
    try:
        df = pd.read_csv("csv/car_price_dataset.csv")
        features = ['condition', 'gear', 'fuel_type', 'yom', 'engine', 'price']
        target_brand = 'brand'
        target_model = 'model'
        
        df = df[features + [target_brand, target_model]].dropna()
        
        label_encoders = {}
        for col in features:
            if df[col].dtype == 'object':
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col])
                label_encoders[col] = le
        
        brand_encoder = LabelEncoder()
        model_encoder = LabelEncoder()
        df[target_brand] = brand_encoder.fit_transform(df[target_brand])
        df[target_model] = model_encoder.fit_transform(df[target_model])
        
        X = df[features]
        y_brand = df[target_brand]
        y_model = df[target_model]
        
        model = RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42)
        
        model.fit(X, y_brand)  # Simplified: training only for brand
        joblib.dump(model, "models/smaller_multi_target_classifier.joblib")
        joblib.dump(label_encoders, "models/smaller_classifier_label_encoders.joblib")
        joblib.dump(brand_encoder, "models/smaller_brand_encoder.joblib")
        joblib.dump(model_encoder, "models/smaller_model_encoder.joblib")
        
        print("✅ Smaller model created and saved successfully")
        
    except Exception as e:
        print(f"❌ Error creating smaller model: {e}")

if multi_target_model is None:
    print("🔄 Attempting to create a smaller model...")
    create_smaller_model()
    try:
        multi_target_model = joblib.load("models/smaller_multi_target_classifier.joblib")
        classifier_label_encoders = joblib.load("models/smaller_classifier_label_encoders.joblib")
        print("✅ Smaller multi-target classifier and encoders loaded successfully")
    except Exception as e:
        print(f"❌ Error loading smaller model: {e}")
        multi_target_model = None
        classifier_label_encoders = {}

# ----------------- Default Admin -----------------
def create_default_admin():
    try:
        admin_email = "admin@marketplace.com"
        admin_user = users_collection.find_one({"email": admin_email})
        
        if not admin_user:
            users_collection.insert_one({
                "username": "admin",
                "email": admin_email,
                "password": generate_password_hash("admin123", method='pbkdf2:sha256'),
                "role": "admin",
                "created_at": datetime.utcnow()
            })
            print("✅ Default admin created")
        else:
            if not admin_user.get("password") or not admin_user["password"].startswith('pbkdf2:'):
                users_collection.update_one(
                    {"email": admin_email},
                    {"$set": {"password": generate_password_hash("admin123", method='pbkdf2:sha256')}}
                )
                print("✅ Admin password rehashed")
            else:
                print("ℹ️ Admin already exists")
    except Exception as e:
        print(f"❌ Error creating default admin: {e}")

create_default_admin()

# ----------------- Dynamic Dropdown Endpoints -----------------
@app.route("/api/makes", methods=["GET"])
def get_makes():
    if car_data.empty:
        return jsonify({"error": "Data not available"}), 500
    makes = sorted(car_data['make'].dropna().unique().tolist())
    return jsonify(makes)

@app.route("/api/models/<make>", methods=["GET"])
def get_models(make):
    if car_data.empty:
        return jsonify({"error": "Data not available"}), 500
    make = make.lower()
    filtered = car_data[car_data['make'] == make]
    models = sorted(filtered['model'].dropna().unique().tolist())
    return jsonify(models)

@app.route("/api/years/<make>/<model>", methods=["GET"])
def get_years(make, model):
    if car_data.empty:
        return jsonify({"error": "Data not available"}), 500
    make = make.lower()
    model = model.lower()
    filtered = car_data[(car_data['make'] == make) & (car_data['model'] == model)]
    years = sorted(filtered['year'].dropna().unique().tolist(), reverse=True)
    return jsonify(years)

@app.route("/api/fuel_types/<make>/<model>/<year>", methods=["GET"])
def get_fuel_types(make, model, year):
    if car_data.empty:
        return jsonify({"error": "Data not available"}), 500
    make = make.lower()
    model = model.lower()
    try:
        year = int(year)
    except ValueError:
        return jsonify({"error": "Invalid year"}), 400
    filtered = car_data[(car_data['make'] == make) & (car_data['model'] == model) & (car_data['year'] == year)]
    fuel_types = sorted(filtered['fuel_type'].dropna().unique().tolist())
    return jsonify(fuel_types)

@app.route("/api/transmissions/<make>/<model>/<year>", methods=["GET"])
def get_transmissions(make, model, year):
    if car_data.empty:
        return jsonify({"error": "Data not available"}), 500
    make = make.lower()
    model = model.lower()
    try:
        year = int(year)
    except ValueError:
        return jsonify({"error": "Invalid year"}), 400
    filtered = car_data[(car_data['make'] == make) & (car_data['model'] == model) & (car_data['year'] == year)]
    transmissions = sorted(filtered['transmission_type'].dropna().unique().tolist())
    return jsonify(transmissions)

@app.route("/api/engine_sizes/<make>/<model>/<year>", methods=["GET"])
def get_engine_sizes(make, model, year):
    if car_data.empty:
        return jsonify({"error": "Data not available"}), 500
    make = make.lower()
    model = model.lower()
    try:
        year = int(year)
    except ValueError:
        return jsonify({"error": "Invalid year"}), 400
    filtered = car_data[(car_data['make'] == make) & (car_data['model'] == model) & (car_data['year'] == year)]
    engines = sorted(filtered['engine'].dropna().unique().tolist())
    return jsonify(engines)

@app.route("/api/towns", methods=["GET"])
def get_towns():
    if car_data.empty:
        return jsonify({"error": "Data not available"}), 500
    towns = sorted(car_data['town'].dropna().unique().tolist())
    return jsonify(towns)

@app.route("/api/mileage_ranges", methods=["GET"])
def get_mileage_ranges():
    if car_data.empty:
        return jsonify({"error": "Data not available"}), 500
    max_mileage = car_data[car_data['condition'] == 'used']['mileage'].max()
    step = 10000
    bins = np.arange(0, max_mileage + step + 1, step)
    ranges = [f"{int(bins[i])}-{int(bins[i+1] - 1)}" for i in range(len(bins) - 1)]
    ranges[-1] = f"{int(bins[-2])}+"
    return jsonify(ranges)

# ----------------- Price Prediction Endpoint -----------------
@app.route("/api/predict_price", methods=["POST"])
def predict_price():
    if price_model is None or not label_encoders:
        return jsonify({"error": "Model or encoders not loaded"}), 500

    try:
        data = request.json
        make = sanitize_input(data.get("make", ""))
        model_name = sanitize_input(data.get("model", ""))
        year = data.get("year")
        fuel_type = sanitize_input(data.get("fuel_type", ""))
        transmission = sanitize_input(data.get("transmission_type", ""))
        condition_input = sanitize_input(data.get("condition", ""))
        mileage_range = sanitize_input(data.get("mileage_range", ""))
        engine = data.get("engine")
        town = sanitize_input(data.get("town", ""))
        leasing_input = data.get("leasing", "no leasing")

        print(f"🚗 Prediction request: make={make}, model={model_name}, year={year}, leasing={leasing_input}")

        required_fields = [make, model_name, year, fuel_type, transmission, condition_input, engine, town, leasing_input]
        if any(field is None or str(field).strip() == "" for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        try:
            year = int(year)
            engine = float(engine)
        except (ValueError, TypeError) as e:
            return jsonify({"error": f"Invalid data type: {str(e)}"}), 400

        condition = 'new' if condition_input == 'brand new' else 'used'

        if condition == 'used':
            if not mileage_range:
                return jsonify({"error": "Mileage range required for used cars"}), 400
            try:
                if '+' in mileage_range:
                    low = int(mileage_range.split('+')[0])
                    mileage = low + 5000
                else:
                    low, high = map(int, mileage_range.split('-'))
                    mileage = (low + high) // 2
            except (ValueError, IndexError) as e:
                return jsonify({"error": f"Invalid mileage range format: {str(e)}"}), 400
        else:
            mileage = 0

        car_age = datetime.now().year - year

        try:
            matched_make = find_closest_match(make, label_encoders['make'].classes_, "make")
            if matched_make is None:
                return jsonify({
                    "error": f"Make '{make}' not found",
                    "available_makes": list(label_encoders['make'].classes_)[:10]
                }), 400
            make_encoded = label_encoders['make'].transform([matched_make])[0]

            matched_model = find_closest_match(model_name, label_encoders['model'].classes_, "model")
            if matched_model is None:
                return jsonify({
                    "error": f"Model '{model_name}' not found"
                }), 400
            model_encoded = label_encoders['model'].transform([matched_model])[0]

            matched_fuel = find_closest_match(fuel_type, label_encoders['fuel_type'].classes_, "fuel_type")
            if matched_fuel is None:
                return jsonify({
                    "error": f"Fuel type '{fuel_type}' not found",
                    "available_fuel_types": list(label_encoders['fuel_type'].classes_)
                }), 400
            fuel_encoded = label_encoders['fuel_type'].transform([matched_fuel])[0]

            matched_transmission = find_closest_match(transmission, label_encoders['transmission_type'].classes_, "transmission")
            if matched_transmission is None:
                return jsonify({
                    "error": f"Transmission '{transmission}' not found",
                    "available_transmissions": list(label_encoders['transmission_type'].classes_)
                }), 400
            transmission_encoded = label_encoders['transmission_type'].transform([matched_transmission])[0]

            matched_condition = find_closest_match(condition, label_encoders['condition'].classes_, "condition")
            if matched_condition is None:
                return jsonify({
                    "error": f"Condition '{condition}' not found",
                    "available_conditions": list(label_encoders['condition'].classes_)
                }), 400
            condition_encoded = label_encoders['condition'].transform([matched_condition])[0]

            matched_town = find_closest_match(town, label_encoders['town'].classes_, "town")
            if matched_town is None:
                return jsonify({
                    "error": f"Town '{town}' not found",
                    "available_towns": list(label_encoders['town'].classes_)[:10]
                }), 400
            town_encoded = label_encoders['town'].transform([matched_town])[0]

            matched_leasing = find_closest_match(leasing_input, label_encoders['leasing'].classes_, "leasing")
            if matched_leasing is None:
                most_common_leasing = car_data['leasing'].mode().iloc[0] if not car_data.empty else label_encoders['leasing'].classes_[0]
                matched_leasing = most_common_leasing
                print(f"⚠️ Using fallback leasing value: {matched_leasing}")
            leasing_encoded = label_encoders['leasing'].transform([matched_leasing])[0]

            print(f"✅ All matches found and encoded successfully")

        except Exception as e:
            print(f"❌ Error in encoding: {e}")
            return jsonify({"error": f"Encoding error: {str(e)}"}), 400

        feature_vector = np.array([
            make_encoded,
            model_encoded,
            float(engine),
            transmission_encoded,
            fuel_encoded,
            float(mileage),
            town_encoded,
            leasing_encoded,
            condition_encoded,
            int(car_age)
        ]).reshape(1, -1)

        print(f"📊 Feature vector shape: {feature_vector.shape}")
        print(f"📊 Feature vector: {feature_vector}")

        try:
            predicted_price = price_model.predict(feature_vector)[0]
            predicted_price = float(predicted_price)
        except Exception as e:
            print(f"❌ Error in prediction: {e}")
            return jsonify({"error": f"Prediction error: {str(e)}"}), 500

        formatted_price = format_price_lkr(predicted_price)
        print(f"💰 Predicted price: {predicted_price} -> {formatted_price}")

        return jsonify({
            "predicted_price": round(predicted_price, 2),
            "formatted_price": formatted_price,
            "matched_values": {
                "make": matched_make,
                "model": matched_model,
                "fuel_type": matched_fuel,
                "transmission": matched_transmission,
                "condition": matched_condition,
                "town": matched_town
            },
            "leasing_used": matched_leasing,
            "car_age": car_age,
            "mileage_used": mileage,
            "warning": "Prediction based on training data - actual market prices may vary"
        })
        
    except ValueError as ve:
        print(f"❌ ValueError in predict_price: {ve}")
        return jsonify({"error": f"Value error: {str(ve)}"}), 400
    except Exception as e:
        print(f"❌ Unexpected error in predict_price: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# ----------------- API Endpoints -----------------
@app.route("/api/cars", methods=["GET"])
def get_cars():
    try:
        limit = int(request.args.get("limit", 10))
        page = int(request.args.get("page", 1))
        search = request.args.get("search", "").strip()
        min_price = request.args.get("minPrice", None)
        max_price = request.args.get("maxPrice", None)
        skip = (page - 1) * limit

        query = {}
        if "user_id" not in session or session.get("role") != "admin":
            query["status"] = "approved"

        if search:
            query["$or"] = [
                {"make": {"$regex": search, "$options": "i"}},
                {"model": {"$regex": search, "$options": "i"}},
                {"title": {"$regex": search, "$options": "i"}}
            ]

        if min_price or max_price:
            query["price"] = {}
            if min_price:
                try:
                    query["price"]["$gte"] = float(min_price)
                except ValueError:
                    return jsonify({"error": "Invalid minPrice value"}), 400
            if max_price:
                try:
                    query["price"]["$lte"] = float(max_price)
                except ValueError:
                    return jsonify({"error": "Invalid maxPrice value"}), 400

        pipeline = [
            {"$match": query},
            {"$lookup": {
                "from": "users",
                "localField": "seller_id",
                "foreignField": "_id",
                "as": "seller"
            }},
            {"$unwind": "$seller"},
            {"$project": {
                "_id": 1,
                "title": 1,
                "description": 1,
                "price": 1,
                "make": 1,
                "model": 1,
                "year": 1,
                "mileage": 1,
                "condition": 1,
                "images": 1,
                "status": 1,
                "created_at": 1,
                "updated_at": 1,
                "views": 1,
                "seller_id": "$seller._id",
                "sellerBusinessName": "$seller.businessName",
                "sellerContact": {"$ifNull": ["$seller.businessPhone", "$seller.phone", ""]}
            }},
            {"$skip": skip},
            {"$limit": limit}
        ]

        cars = list(cars_collection.aggregate(pipeline))
        total = cars_collection.count_documents(query)

        serialized_cars = serialize_objectid(cars)

        return jsonify({
            "cars": serialized_cars,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        })
    except Exception as e:
        print(f"Error fetching cars: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/predict_brand_model", methods=["POST"])
def predict_brand_model_api():
    if request.method == "OPTIONS":
        return ("", 204)

    if multi_target_model is None or not classifier_label_encoders:
        return jsonify({"error": "Prediction model not available. Please try again later."}), 503

    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "No input data provided"}), 400

        feature_mapping = {
            'condition': 'Condition',
            'gear': 'Gear',
            'fuel_type': 'Fuel Type',
            'yom': 'YOM',
            'engine': 'Engine (cc)',
            'price': 'Price'
        }

        mapped_data = {}
        for frontend_name, backend_name in feature_mapping.items():
            if frontend_name in data:
                value = data[frontend_name]
                if frontend_name == 'condition':
                    value = 'USED' if value.lower() == 'used' else 'NEW'
                elif frontend_name == 'gear':
                    value = 'Automatic' if value.lower() == 'auto' else 'Manual'
                elif frontend_name == 'fuel_type':
                    fuel_map = {
                        'petrol': 'Petrol',
                        'diesel': 'Diesel',
                        'hybrid': 'Hybrid',
                        'electric': 'Electric'
                    }
                    value = fuel_map.get(value.lower(), value.title())
                elif frontend_name == 'price':
                    try:
                        value = float(value) * 100000
                    except ValueError:
                        return jsonify({"error": "Price must be a number"}), 400
                mapped_data[backend_name] = value

        mapped_data['Millage(KM)'] = 0
        mapped_data['Town'] = 'Colombo'
        mapped_data['Leasing'] = 'No Leasing'

        input_df = pd.DataFrame([mapped_data])

        for col in input_df.columns:
            if col in classifier_label_encoders:
                le = classifier_label_encoders[col]
                try:
                    if col in ['YOM', 'Engine (cc)', 'Price', 'Millage(KM)']:
                        input_df[col] = input_df[col].astype(float)
                    else:
                        input_df[col] = le.transform(input_df[col].astype(str))
                except ValueError as e:
                    return jsonify({
                        "error": f"Input value for '{col}' is invalid: {str(e)}",
                        "field": col,
                        "value": str(input_df[col].iloc[0]),
                        "available_values": le.classes_.tolist()
                    }), 400

        predicted_labels = multi_target_model.predict(input_df)[0]
        predicted_probs = multi_target_model.predict_proba(input_df)

        brand_le = classifier_label_encoders['Brand']
        model_le = classifier_label_encoders['Model']
        predicted_brand = brand_le.inverse_transform([predicted_labels[0]])[0]
        predicted_model = model_le.inverse_transform([predicted_labels[1]])[0]

        brand_prob = max(predicted_probs[0][0])
        model_prob = max(predicted_probs[1][0])

        brand_classes = brand_le.classes_
        model_classes = model_le.classes_
        brand_top_k = [{"brand": brand_classes[i], "prob": float(predicted_probs[0][0][i])} 
                       for i in predicted_probs[0][0].argsort()[::-1][:3]]
        model_top_k = [{"model": model_classes[i], "prob": float(predicted_probs[1][0][i])} 
                       for i in predicted_probs[1][0].argsort()[::-1][:3]]

        return jsonify({
            "brand": predicted_brand,
            "brand_confidence": float(brand_prob),
            "brand_top_k": brand_top_k,
            "model": predicted_model,
            "model_confidence": float(model_prob),
            "model_top_k": model_top_k
        })

    except Exception as e:
        print(f"❌ Error in predict_brand_model_api: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# ----------------- Authentication -----------------
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json()
        username = data.get("username", "").strip()
        email = data.get("email", "").lower().strip()
        password = data.get("password", "")

        if not username or not email or not password:
            return jsonify({"error": "All fields are required"}), 400
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        if "@" not in email or "." not in email:
            return jsonify({"error": "Invalid email format"}), 400
        if users_collection.find_one({"$or": [{"email": email}, {"username": username}]}):
            return jsonify({"error": "User already exists"}), 409

        user = {
            "username": username,
            "email": email,
            "password": generate_password_hash(password),
            "role": "buyer",
            "created_at": datetime.utcnow()
        }
        result = users_collection.insert_one(user)

        session.update({
            "user_id": str(result.inserted_id),
            "username": username,
            "email": email,
            "role": "buyer"
        })
        return jsonify({"message": "Account created", "user_id": str(result.inserted_id), "authenticated": True}), 201
    except Exception as e:
        print(f"Error in signup: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email, password = data.get("email", "").lower().strip(), data.get("password", "")
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        user = users_collection.find_one({"email": email})
        if not user or not check_password_hash(user["password"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        session.clear()
        session["user_id"] = str(user["_id"])
        session["username"] = user["username"]
        session["email"] = user["email"]
        session["role"] = user["role"]
        session.modified = True

        return jsonify({
            "message": "Login successful",
            "user": {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "role": user["role"]
            },
            "authenticated": True
        })
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/auth/logout", methods=["POST"])
@login_required
def logout():
    username = session.get("username", "User")
    session.clear()
    return jsonify({"message": f"Goodbye, {username}!", "authenticated": False})

@app.route("/api/auth/me", methods=["GET"])
def get_current_user():
    if "user_id" not in session:
        return jsonify({"authenticated": False})
    return jsonify({
        "user": {
            "id": session.get("user_id"),
            "username": session.get("username"),
            "email": session.get("email"),
            "role": session.get("role")
        },
        "authenticated": True
    })

# ----------------- Debug Endpoints -----------------
@app.route("/api/debug/encoders", methods=["GET"])
def debug_encoders():
    if not label_encoders:
        return jsonify({"error": "Encoders not loaded"}), 500
    
    debug_info = {}
    for encoder_name, encoder in label_encoders.items():
        debug_info[encoder_name] = {
            "classes": list(encoder.classes_)[:20],
            "total_classes": len(encoder.classes_)
        }
    
    return jsonify(debug_info)

@app.route("/api/debug/model_info", methods=["GET"])
def debug_model_info():
    return jsonify({
        "model_loaded": price_model is not None,
        "encoders_loaded": len(label_encoders) if label_encoders else 0,
        "dataset_loaded": not car_data.empty,
        "dataset_shape": car_data.shape if not car_data.empty else None,
        "available_encoders": list(label_encoders.keys()) if label_encoders else []
    })

@app.route("/api/debug/classifier_values", methods=["GET"])
def debug_classifier_values():
    if not classifier_label_encoders:
        return jsonify({"error": "Classifier encoders not loaded"}), 500
    
    debug_info = {}
    for encoder_name, encoder in classifier_label_encoders.items():
        debug_info[encoder_name] = {
            "classes": list(encoder.classes_),
            "total_classes": len(encoder.classes_)
        }
    
    return jsonify(debug_info)

# ----------------- Error Handlers -----------------
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error"}), 500

# ----------------- Seller Management -----------------
@app.route("/api/admin/create-seller", methods=["POST"])
@login_required
def create_seller():
    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403

    try:
        data = request.json
        email = data.get("email", "").lower().strip()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        if users_collection.find_one({"email": email}):
            return jsonify({"error": "Email already exists"}), 409

        seller = {
            "username": data.get("username", ""),
            "businessName": data.get("businessName", ""),
            "yearsInBusiness": data.get("yearsInBusiness"),
            "businessType": data.get("businessType", ""),
            "email": email,
            "password": generate_password_hash(password),
            "phone": data.get("phone", ""),
            "businessPhone": data.get("businessPhone", ""),
            "role": "seller",
            "isVerified": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = users_collection.insert_one(seller)
        return jsonify({"message": "Seller created successfully", "user_id": str(result.inserted_id)}), 201

    except Exception as e:
        print(f"Error creating seller: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ----------------- Seller Listings Endpoints -----------------
@app.route("/api/listings", methods=["POST"])
@login_required
def create_listing():
    if session.get("role") != "seller":
        return jsonify({"error": "Unauthorized"}), 403

    try:
        title = request.form.get("title")
        description = request.form.get("description")
        price = request.form.get("price")
        make = request.form.get("make")
        model = request.form.get("model")
        year = request.form.get("year")
        mileage = request.form.get("mileage")
        condition = request.form.get("condition")

        if not all([title, description, price, make, model, year, condition]):
            return jsonify({"error": "Missing required fields"}), 400

        price = float(price)
        year = int(year)
        mileage = int(mileage) if mileage and condition == "used" else None

        images = []
        if 'images' in request.files:
            for file in request.files.getlist('images'):
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(file_path)
                    images.append(f"/uploads/{filename}")

        listing = {
            "title": title,
            "description": description,
            "price": price,
            "make": make,
            "model": model,
            "year": year,
            "mileage": mileage,
            "condition": condition,
            "images": images,
            "status": "pending",
            "seller_id": ObjectId(session["user_id"]),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "views": 0
        }

        result = cars_collection.insert_one(listing)
        return jsonify({"message": "Listing created", "id": str(result.inserted_id)}), 201

    except Exception as e:
        print(f"Error creating listing: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/my-listings", methods=["GET"])
@login_required
def get_my_listings():
    if session.get("role") != "seller":
        return jsonify({"error": "Unauthorized"}), 403

    try:
        seller_id = ObjectId(session["user_id"])
        listings = list(cars_collection.find({"seller_id": seller_id}))
        return jsonify(serialize_objectid(listings))
    except Exception as e:
        print(f"Error fetching listings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/listings/<id>", methods=["DELETE"])
@login_required
def delete_listing(id):
    if session.get("role") != "seller":
        return jsonify({"error": "Unauthorized"}), 403

    try:
        obj_id = ObjectId(id)
        listing = cars_collection.find_one({"_id": obj_id, "seller_id": ObjectId(session["user_id"])})
        if not listing:
            return jsonify({"error": "Listing not found or not owned"}), 404

        cars_collection.delete_one({"_id": obj_id})
        return jsonify({"message": "Listing deleted"})
    except Exception as e:
        print(f"Error deleting listing: {str(e)}")
        return jsonify({"error": str(e)}), 400

# ----------------- Admin Endpoints -----------------
@app.route("/api/admin/users/<userType>", methods=["GET"])
@login_required
def get_users(userType):
    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403

    try:
        if userType not in ["buyer", "seller"]:
            return jsonify({"error": "Invalid user type. Must be 'buyer' or 'seller'"}), 400

        users = list(users_collection.find({"role": userType}))

        formatted_users = [
            {
                "_id": str(user["_id"]),
                "username": user.get("username", ""),
                "email": user.get("email", ""),
                "phone": user.get("phone", "") or user.get("businessPhone", ""),
                "created_at": user.get("created_at", "").isoformat() if user.get("created_at") else "",
                "isVerified": user.get("isVerified", False) if userType == "seller" else False
            }
            for user in users
        ]

        print(f"Fetching users with role: {userType}")
        print(f"Found {len(users)} users")
        return jsonify(formatted_users)
    except Exception as e:
        print(f"Error fetching {userType} users: {str(e)}")
        return jsonify({"error": f"Failed to fetch {userType} users: {str(e)}"}), 500

@app.route("/api/admin/users/<userId>", methods=["DELETE"])
@login_required
def delete_user(userId):
    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized access"}), 403

    try:
        obj_id = ObjectId(userId)
        user = users_collection.find_one({"_id": obj_id, "role": {"$in": ["buyer", "seller"]}})
        if not user:
            return jsonify({"error": "User not found or not a buyer/seller"}), 404

        cars_collection.delete_many({"seller_id": obj_id})
        ratings_collection.delete_many({"$or": [{"seller_id": obj_id}, {"buyer_id": obj_id}]})

        users_collection.delete_one({"_id": obj_id})
        return jsonify({"message": f"{user['role'].capitalize()} account deleted successfully"})
    except Exception as e:
        print(f"Error deleting user: {str(e)}")
        return jsonify({"error": f"Failed to delete user: {str(e)}"}), 500

@app.route("/api/admin/pending-listings", methods=["GET"])
@login_required
def get_pending_listings():
    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    try:
        pipeline = [
            {"$match": {"status": "pending"}},
            {"$lookup": {
                "from": "users",
                "localField": "seller_id",
                "foreignField": "_id",
                "as": "seller"
            }},
            {"$unwind": "$seller"},
            {"$project": {
                "_id": 1,
                "title": 1,
                "description": 1,
                "price": 1,
                "make": 1,
                "model": 1,
                "year": 1,
                "mileage": 1,
                "condition": 1,
                "images": 1,
                "status": 1,
                "created_at": 1,
                "updated_at": 1,
                "views": 1,
                "sellerName": "$seller.username",
                "sellerBusinessName": "$seller.businessName",
                "sellerContact": {"$ifNull": ["$seller.businessPhone", "$seller.phone", ""]}
            }}
        ]
        listings = list(cars_collection.aggregate(pipeline))
        return jsonify(serialize_objectid(listings))
    except Exception as e:
        print(f"Error fetching pending listings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/listings/<id>/approve", methods=["POST"])
@login_required
def approve_listing(id):
    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    try:
        obj_id = ObjectId(id)
        result = cars_collection.update_one(
            {"_id": obj_id, "status": "pending"},
            {"$set": {"status": "approved", "updated_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            return jsonify({"error": "Listing not found or not pending"}), 404
        return jsonify({"message": "Listing approved"})
    except Exception as e:
        print(f"Error approving listing: {str(e)}")
        return jsonify({"error": str(e)}), 400

@app.route("/api/admin/listings/<id>/reject", methods=["POST"])
@login_required
def reject_listing(id):
    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    try:
        obj_id = ObjectId(id)
        result = cars_collection.update_one(
            {"_id": obj_id, "status": "pending"},
            {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            return jsonify({"error": "Listing not found or not pending"}), 404
        return jsonify({"message": "Listing rejected"})
    except Exception as e:
        print(f"Error rejecting listing: {str(e)}")
        return jsonify({"error": str(e)}), 400

# ----------------- Profile Update -----------------
@app.route("/api/profile", methods=["PATCH"])
@login_required
def update_profile():
    try:
        data = request.json
        update = {}
        if "username" in data:
            update["username"] = data["username"]
        if "phone" in data:
            update["phone"] = data["phone"]
        if "location" in data:
            update["location"] = data["location"]

        if not update:
            return jsonify({"error": "No fields to update"}), 400

        result = users_collection.update_one(
            {"_id": ObjectId(session["user_id"])},
            {"$set": update}
        )
        if result.modified_count == 0:
            return jsonify({"error": "No changes made"}), 404

        return jsonify({"message": "Profile updated"})
    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ----------------- Serve Uploaded Files -----------------
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ----------------- Buyer Rating Endpoint -----------------
@app.route("/api/rate-seller", methods=["POST"])
@login_required
def rate_seller():
    if session.get("role") != "buyer":
        return jsonify({"error": "Unauthorized - Only buyers can rate sellers"}), 403

    try:
        data = request.json
        seller_id = data.get("seller_id")
        rating = data.get("rating")
        comment = data.get("comment", "")

        if not seller_id or not rating:
            return jsonify({"error": "Seller ID and rating are required"}), 400

        if rating < 1 or rating > 5:
            return jsonify({"error": "Rating must be between 1 and 5"}), 400

        seller = users_collection.find_one({"_id": ObjectId(seller_id), "role": "seller"})
        if not seller:
            return jsonify({"error": "Seller not found"}), 404

        rating_doc = {
            "buyer_id": ObjectId(session["user_id"]),
            "seller_id": ObjectId(seller_id),
            "rating": rating,
            "comment": comment,
            "created_at": datetime.utcnow()
        }

        ratings_collection.insert_one(rating_doc)

        pipeline = [
            {"$match": {"seller_id": ObjectId(seller_id)}},
            {"$group": {"_id": "$seller_id", "avg_rating": {"$avg": "$rating"}, "total_ratings": {"$sum": 1}}}
        ]
        avg_result = list(ratings_collection.aggregate(pipeline))
        if avg_result:
            avg_rating = avg_result[0]["avg_rating"]
            total_ratings = avg_result[0]["total_ratings"]
            users_collection.update_one(
                {"_id": ObjectId(seller_id)},
                {"$set": {"avg_rating": avg_rating, "total_ratings": total_ratings}}
            )

        return jsonify({"message": "Rating submitted successfully"})
    except Exception as e:
        print(f"Error submitting rating: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/seller-ratings/<seller_id>", methods=["GET"])
def get_seller_ratings(seller_id):
    try:
        pipeline = [
            {"$match": {"seller_id": ObjectId(seller_id)}},
            {"$lookup": {
                "from": "users",
                "localField": "buyer_id",
                "foreignField": "_id",
                "as": "buyer"
            }},
            {"$unwind": "$buyer"},
            {"$project": {
                "_id": 1,
                "rating": 1,
                "comment": 1,
                "created_at": 1,
                "buyerName": "$buyer.username"
            }}
        ]
        ratings = list(ratings_collection.aggregate(pipeline))
        seller = users_collection.find_one({"_id": ObjectId(seller_id)}, {"avg_rating": 1, "total_ratings": 1})
        return jsonify({
            "ratings": serialize_objectid(ratings),
            "avg_rating": seller.get("avg_rating", 0),
            "total_ratings": seller.get("total_ratings", 0)
        })
    except Exception as e:
        print(f"Error fetching seller ratings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/vehicles/<vehicle_id>", methods=["GET"])
def get_vehicle_details(vehicle_id):
    try:
        vehicle = cars_collection.find_one({"_id": ObjectId(vehicle_id)})
        if not vehicle:
            return jsonify({"error": "Vehicle not found"}), 404

        seller = users_collection.find_one({"_id": vehicle["seller_id"]})
        vehicle["sellerBusinessName"] = seller.get("businessName", "")
        vehicle["sellerContact"] = seller.get("businessPhone", seller.get("phone", ""))
        return jsonify(serialize_objectid(vehicle))
    except Exception as e:
        print(f"Error fetching vehicle details: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/vehicles/<vehicle_id>/view", methods=["POST"])
def increment_vehicle_view(vehicle_id):
    try:
        cars_collection.update_one(
            {"_id": ObjectId(vehicle_id)},
            {"$inc": {"views": 1}}
        )
        return jsonify({"message": "View count incremented"})
    except Exception as e:
        print(f"Error incrementing vehicle view: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ----------------- Run -----------------
if __name__ == "__main__":
    app.run(debug=True, port=5002)