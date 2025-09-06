from flask import Flask, request, session, jsonify
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

# ----------------- Load environment variables -----------------
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")

# Enable CORS for React frontend
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

# ----------------- MongoDB connection -----------------
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(mongo_uri)
db = client.vehicle_marketplace
users_collection = db.users
cars_collection = db.cars

# ----------------- Load ML model and preprocessing -----------------
try:
    model = joblib.load("car_ml_models_optimized.pkl")
    preprocessor = joblib.load("preprocessing_components.pkl")
    print("ML model and preprocessing objects loaded successfully")
except Exception as e:
    print(f"Error loading ML model: {e}")
    model = None
    preprocessor = None

# ----------------- Helpers -----------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required", "authenticated": False}), 401
        return f(*args, **kwargs)
    return decorated_function

def serialize_objectid(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: serialize_objectid(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [serialize_objectid(item) for item in obj]
    return obj

def sanitize_input(data):
    if isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    elif isinstance(data, str):
        return re.sub(r"[<>{};]", "", data).strip()
    return data

def preprocess_input(data):
    try:
        input_df = pd.DataFrame([data])
        processed_data = preprocessor.transform(input_df)
        return processed_data, None
    except Exception as e:
        return None, f"Error in preprocessing: {str(e)}"

def predict_price(processed_data):
    try:
        if model is None:
            return None, "Model not loaded"
        prediction = model.predict(processed_data)
        return prediction[0], None
    except Exception as e:
        return None, f"Error in prediction: {str(e)}"

# ----------------- Default Admin Creation -----------------
def create_default_admin():
    try:
        admin_email = "admin@marketplace.com"
        admin_username = "admin"
        admin_password = "admin123"
        existing_admin = users_collection.find_one({"email": admin_email})
        if not existing_admin:
            hashed_password = generate_password_hash(admin_password)
            users_collection.insert_one({
                "username": admin_username,
                "email": admin_email,
                "password": hashed_password,
                "role": "admin",
                "created_at": datetime.utcnow()
            })
            print("✅ Default admin created")
        else:
            print("ℹ️ Admin already exists")
    except Exception as e:
        print(f"Error creating default admin: {e}")

create_default_admin()

# ----------------- Routes -----------------
@app.route("/", methods=["GET"])
def root():
    return jsonify({"message": "Vehicle Marketplace API", "version": "1.0"})

@app.route("/api/health", methods=["GET"])
def health_check():
    model_status = "loaded" if model is not None else "not loaded"
    db_status = "connected" if client is not None else "disconnected"
    return jsonify({"status": "healthy", "model_status": model_status, "database_status": db_status})

# ---------- Authentication ----------
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        username = data.get("username", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        role = "buyer"

        if not username or not email or not password:
            return jsonify({"error": "All fields are required"}), 400
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400
        if "@" not in email or "." not in email:
            return jsonify({"error": "Invalid email format"}), 400

        existing_user = users_collection.find_one({"$or": [{"email": email}, {"username": username}]})
        if existing_user:
            return jsonify({"error": "User already exists"}), 409

        hashed_password = generate_password_hash(password)
        user_data = {
            "username": username,
            "email": email,
            "password": hashed_password,
            "role": role,
            "created_at": datetime.utcnow()
        }

        result = users_collection.insert_one(user_data)
        if result.inserted_id:
            session["user_id"] = str(result.inserted_id)
            session["username"] = username
            session["email"] = email
            session["role"] = role
            return jsonify({
                "message": "Account created successfully",
                "user_id": str(result.inserted_id),
                "authenticated": True
            }), 201

        return jsonify({"error": "Failed to create account"}), 500
    except Exception as e:
        print(f"Error creating user: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Find user by email
        user = users_collection.find_one({"email": email})
        if not user or not check_password_hash(user["password"], password):
            return jsonify({"error": "Invalid email or password"}), 401

        # Save session info
        session["user_id"] = str(user["_id"])
        session["username"] = user["username"]
        session["email"] = user["email"]
        session["role"] = user["role"]

        # Return user data without password
        return jsonify({
            "message": "Login successful",
            "user": {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "role": user["role"]
            },
            "authenticated": True
        }), 200

    except Exception as e:
        print(f"Error during login: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/auth/logout", methods=["POST"])
@login_required
def logout():
    username = session.get("username", "User")
    session.clear()
    return jsonify({"message": f"Goodbye, {username}!", "authenticated": False}), 200

@app.route("/api/auth/me", methods=["GET"])
@login_required
def get_current_user():
    return jsonify({
        "user": {
            "id": session.get("user_id"),
            "username": session.get("username"),
            "email": session.get("email"),
            "role": session.get("role")
        },
        "authenticated": True
    }), 200

# ----------------- Error Handlers -----------------
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# ----------------- Run -----------------
if __name__ == "__main__":
    if not app.secret_key:
        print("Error: SECRET_KEY not found in environment variables")
        exit(1)
    if not mongo_uri:
        print("Error: MONGO_URI not found in environment variables")
        exit(1)

    try:
        client.admin.command("ping")
        print("MongoDB connection successful!")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        exit(1)

    print("🚀 API Server running on http://localhost:5002")
    app.run(debug=os.getenv("FLASK_DEBUG", "False").lower() == "true", host="0.0.0.0", port=5002)
