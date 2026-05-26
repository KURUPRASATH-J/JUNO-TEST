"""
JUNO AI — Authentication Module
SQLite database + bcrypt password hashing
No external services or API keys required
"""

import os
import uuid
import sqlite3
import logging
import bcrypt
from datetime import datetime
from flask import Blueprint, request, jsonify

auth_bp = Blueprint('auth', __name__)

# In-memory session store: { token: { email, name, user_id, created_at } }
auth_sessions = {}

# Database path — stored alongside this file in backend/
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'juno_ai.db')


def get_db():
    """Get a database connection with row_factory for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the users table if it doesn't exist."""
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            email       TEXT UNIQUE NOT NULL,
            password    TEXT NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    logging.info("Auth database initialized.")


def hash_password(password):
    """Hash a password with bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password, password_hash):
    """Verify a password against its bcrypt hash."""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


# ─── Registration ────────────────────────────────────────────────

@auth_bp.route('/api/register', methods=['POST'])
def register():
    """Register a new user with name, email, and password."""
    try:
        data = request.json or {}
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        # Validation
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        if not password or len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        # Check if email already exists
        conn = get_db()
        existing = conn.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
        if existing:
            conn.close()
            return jsonify({'error': 'An account with this email already exists'}), 409

        # Create user
        pw_hash = hash_password(password)
        cursor = conn.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            (name, email, pw_hash)
        )
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()

        # Auto-login: create session token
        token = str(uuid.uuid4())
        auth_sessions[token] = {
            'user_id': user_id,
            'name': name,
            'email': email,
            'created_at': datetime.now().isoformat()
        }

        logging.info(f"New user registered: {email} (ID: {user_id})")

        return jsonify({
            'token': token,
            'name': name,
            'email': email,
            'message': 'Registration successful'
        }), 201

    except Exception as e:
        logging.error(f"Error in /api/register: {e}", exc_info=True)
        return jsonify({'error': 'An internal server error occurred.'}), 500


# ─── Login ───────────────────────────────────────────────────────

@auth_bp.route('/api/login', methods=['POST'])
def login():
    """Authenticate a user with email and password."""
    try:
        data = request.json or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        # Find user
        conn = get_db()
        user = conn.execute(
            'SELECT id, name, email, password FROM users WHERE email = ?',
            (email,)
        ).fetchone()
        conn.close()

        if not user:
            return jsonify({'error': 'No account found with this email'}), 401

        # Verify password
        if not verify_password(password, user['password']):
            return jsonify({'error': 'Incorrect password'}), 401

        # Create session token
        token = str(uuid.uuid4())
        auth_sessions[token] = {
            'user_id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'created_at': datetime.now().isoformat()
        }

        logging.info(f"User logged in: {user['email']}")

        return jsonify({
            'token': token,
            'name': user['name'],
            'email': user['email'],
            'message': 'Login successful'
        })

    except Exception as e:
        logging.error(f"Error in /api/login: {e}", exc_info=True)
        return jsonify({'error': 'An internal server error occurred.'}), 500


# ─── Auth Status ─────────────────────────────────────────────────

@auth_bp.route('/api/auth/status', methods=['GET'])
def auth_status():
    """Check if a given auth token is valid."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token and token in auth_sessions:
        session = auth_sessions[token]
        return jsonify({
            'authenticated': True,
            'name': session['name'],
            'email': session['email']
        })
    return jsonify({'authenticated': False}), 401


# ─── Logout ──────────────────────────────────────────────────────

@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    """Invalidate the session token."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token and token in auth_sessions:
        email = auth_sessions[token].get('email', 'unknown')
        del auth_sessions[token]
        logging.info(f"User logged out: {email}")
    return jsonify({'message': 'Logged out successfully'})
