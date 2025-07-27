import os
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)

# Configure the SQLite database
# Use instance folder for the database file
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///econfinancas.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# --- Database Models ---

class Category(db.Model):
    """
    Represents a spending category in the database.
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    # Relationship to Expense: 'backref' creates a 'category' attribute on Expense objects
    expenses = db.relationship('Expense', backref='category_obj', lazy=True)

    def __repr__(self):
        return f'<Category {self.name}>'

    def to_dict(self):
        """Converts the Category object to a dictionary."""
        return {
            'id': self.id,
            'name': self.name
        }

class Expense(db.Model):
    """
    Represents an individual expense in the database.
    """
    # Using String for UUID to be compatible with both SQLite and potentially PostgreSQL UUID
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    value = db.Column(db.Float, nullable=False)
    date = db.Column(db.String(10), nullable=False) # Stored as YYYY-MM-DD string
    description = db.Column(db.String(200), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)

    def __repr__(self):
        return f'<Expense {self.value} on {self.date} for {self.description}>'

    def to_dict(self):
        """Converts the Expense object to a dictionary."""
        return {
            'id': self.id,
            'value': self.value,
            'date': self.date,
            'description': self.description,
            'category': self.category_obj.name if self.category_obj else None, # Include category name
            'category_id': self.category_id
        }

# --- Routes ---

@app.route('/')
def index():
    """Renders the main HTML page."""
    return render_template('index.html')

# --- API Endpoints for Categories ---

@app.route('/api/categories', methods=['GET', 'POST'])
def handle_categories():
    """
    Handles GET requests to retrieve all categories and POST requests to add a new category.
    """
    if request.method == 'GET':
        categories = Category.query.all()
        return jsonify([category.to_dict() for category in categories])
    elif request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        if not name:
            return jsonify({'error': 'Category name is required'}), 400
        if Category.query.filter_by(name=name).first():
            return jsonify({'error': 'Category with this name already exists'}), 409

        new_category = Category(name=name)
        db.session.add(new_category)
        db.session.commit()
        return jsonify(new_category.to_dict()), 201

@app.route('/api/categories/<int:category_id>', methods=['PUT', 'DELETE'])
def handle_category(category_id):
    """
    Handles PUT requests to update a category and DELETE requests to remove a category.
    """
    category = Category.query.get(category_id)
    if not category:
        return jsonify({'error': 'Category not found'}), 404

    if request.method == 'PUT':
        data = request.get_json()
        new_name = data.get('name')
        if not new_name:
            return jsonify({'error': 'New category name is required'}), 400
        if Category.query.filter_by(name=new_name).first() and new_name != category.name:
            return jsonify({'error': 'Category with this name already exists'}), 409

        category.name = new_name
        db.session.commit()
        return jsonify(category.to_dict())

    elif request.method == 'DELETE':
        # Get the default category 'Outros'
        default_category = Category.query.filter_by(name='Outros').first()
        if not default_category:
            # If 'Outros' doesn't exist, create it. This should ideally be handled during initial setup.
            default_category = Category(name='Outros')
            db.session.add(default_category)
            db.session.commit() # Commit to get an ID for default_category

        # Reassign expenses from the deleted category to the default category
        expenses_to_reassign = Expense.query.filter_by(category_id=category.id).all()
        for expense in expenses_to_reassign:
            expense.category_id = default_category.id
        db.session.delete(category)
        db.session.commit()
        return jsonify({'message': 'Category deleted and expenses reallocated successfully'}), 200

# --- API Endpoints for Expenses ---

@app.route('/api/expenses', methods=['GET', 'POST'])
def handle_expenses():
    """
    Handles GET requests to retrieve all expenses (with optional filters)
    and POST requests to add a new expense.
    """
    if request.method == 'GET':
        # Apply filters if provided in query parameters
        category_filter = request.args.get('category')
        date_filter = request.args.get('date')

        query = Expense.query

        if category_filter:
            category_obj = Category.query.filter_by(name=category_filter).first()
            if category_obj:
                query = query.filter_by(category_id=category_obj.id)
            else:
                return jsonify({'error': 'Category not found for filtering'}), 404

        if date_filter:
            query = query.filter_by(date=date_filter)

        expenses = query.order_by(Expense.date.desc()).all() # Order by date descending
        return jsonify([expense.to_dict() for expense in expenses])

    elif request.method == 'POST':
        data = request.get_json()
        value = data.get('value')
        date = data.get('date')
        category_name = data.get('category')
        description = data.get('description')

        if not all([value, date, category_name]):
            return jsonify({'error': 'Value, date, and category are required'}), 400

        try:
            value = float(value)
            if value <= 0:
                return jsonify({'error': 'Value must be positive'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid value format'}), 400

        # Find or create category
        category = Category.query.filter_by(name=category_name).first()
        if not category:
            # This case should ideally not happen if categories are pre-loaded or added via UI
            # For robustness, we can create it or default to 'Outros'
            default_category = Category.query.filter_by(name='Outros').first()
            if not default_category:
                default_category = Category(name='Outros')
                db.session.add(default_category)
                db.session.commit()
            category = default_category # Assign to default category if provided category doesn't exist

        new_expense = Expense(
            value=value,
            date=date,
            description=description,
            category_id=category.id
        )
        db.session.add(new_expense)
        db.session.commit()
        return jsonify(new_expense.to_dict()), 201

@app.route('/api/expenses/<string:expense_id>', methods=['PUT', 'DELETE'])
def handle_expense(expense_id):
    """
    Handles PUT requests to update an expense and DELETE requests to remove an expense.
    """
    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    if request.method == 'PUT':
        data = request.get_json()
        value = data.get('value')
        date = data.get('date')
        category_name = data.get('category')
        description = data.get('description')

        if not all([value, date, category_name]):
            return jsonify({'error': 'Value, date, and category are required'}), 400

        try:
            value = float(value)
            if value <= 0:
                return jsonify({'error': 'Value must be positive'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid value format'}), 400

        category = Category.query.filter_by(name=category_name).first()
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        expense.value = value
        expense.date = date
        expense.description = description
        expense.category_id = category.id
        db.session.commit()
        return jsonify(expense.to_dict())

    elif request.method == 'DELETE':
        db.session.delete(expense)
        db.session.commit()
        return jsonify({'message': 'Expense deleted successfully'}), 200

@app.route('/api/reset_data', methods=['DELETE'])
def reset_data():
    """
    Deletes all expenses from the database.
    """
    try:
        num_deleted = db.session.query(Expense).delete()
        db.session.commit()
        return jsonify({'message': f'{num_deleted} expenses deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to reset data: {str(e)}'}), 500

# --- Database Initialization (Run this once to create tables) ---
# To run this, open a Python shell in your project directory:
# > python
# > from app import app, db
# > with app.app_context():
# >     db.create_all()
# >     # Optional: Add default categories if they don't exist
# >     if not Category.query.filter_by(name='Alimentação').first():
# >         db.session.add(Category(name='Alimentação'))
# >         db.session.add(Category(name='Transporte'))
# >         db.session.add(Category(name='Lazer'))
# >         db.session.add(Category(name='Moradia'))
# >         db.session.add(Category(name='Saúde'))
# >         db.session.add(Category(name='Educação'))
# >         db.session.add(Category(name='Outros'))
# >         db.session.commit()
# > exit()

if __name__ == '__main__':
    # This block is for direct execution and development.
    # In a production environment, you'd typically use a WSGI server (e.g., Gunicorn).
    with app.app_context():
        db.create_all()
        # Add default categories if they don't exist on initial setup
        if not Category.query.filter_by(name='Alimentação').first():
            db.session.add(Category(name='Alimentação'))
            db.session.add(Category(name='Transporte'))
            db.session.add(Category(name='Lazer'))
            db.session.add(Category(name='Moradia'))
            db.session.add(Category(name='Saúde'))
            db.session.add(Category(name='Educação'))
            db.session.add(Category(name='Outros'))
            db.session.commit()
    app.run(debug=True) # debug=True enables auto-reloading and better error messages
