from flask import Blueprint, request, jsonify
import logging
from config.database import get_db_connection
from utils.helpers import safe_datetime_format, decimal_to_float
from utils.auth import jwt_required

report_bp = Blueprint('reports', __name__)

@report_bp.route('/dashboard', methods=['GET'])
@jwt_required
def get_dashboard_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user role to filter data
        cursor.execute("SELECT role, branch_location FROM users WHERE id = ?", (request.current_user_id,))
        user_info = cursor.fetchone()
        
        if not user_info:
            return jsonify({'error': 'User not found'}), 404
        
        user_role, user_branch = user_info
        
        stats = {}
        
        # Float statistics
        if user_role != 'auditor':
            if user_role == 'branch':
                cursor.execute("""
                    SELECT COUNT(*), SUM(initial_amount), SUM(used_amount), SUM(balance)
                    FROM floats WHERE is_active = 1 AND location = ?
                """, (user_branch,))
            else:
                cursor.execute("""
                    SELECT COUNT(*), SUM(initial_amount), SUM(used_amount), SUM(balance)
                    FROM floats WHERE is_active = 1
                """)
                
            float_stats = cursor.fetchone()
            stats['floats'] = {
                'totalFloats': float_stats[0] or 0,
                'totalValue': decimal_to_float(float_stats[1]) if float_stats[1] else 0,
                'totalUsed': decimal_to_float(float_stats[2]) if float_stats[2] else 0,
                'totalBalance': decimal_to_float(float_stats[3]) if float_stats[3] else 0
            }
        
        # Expense statistics
        base_expense_query = "FROM expenses e"
        where_clause = ""
        params = []
        
        if user_role == 'branch':
            where_clause = " WHERE e.location = ?"
            params = [user_branch]
        
        # Pending approvals (for managers and admins)
        if user_role in ['admin', 'finance', 'branch']:
            cursor.execute(f"""
                SELECT COUNT(*) {base_expense_query} 
                {where_clause}{"AND" if where_clause else "WHERE"} e.status = 'pending'
            """, params)
            stats['pendingApprovals'] = cursor.fetchone()[0] or 0
        
        # Policy violations
        cursor.execute(f"""
            SELECT COUNT(*) {base_expense_query} 
            {where_clause}{"AND" if where_clause else "WHERE"} e.policy_violation = 1
        """, params)
        stats['policyViolations'] = cursor.fetchone()[0] or 0
        
        # Recent expenses
        cursor.execute(f"""
            SELECT TOP 5 e.id, e.date, e.description, e.amount, e.currency, e.status
            {base_expense_query} 
            {where_clause}
            ORDER BY e.created_at DESC
        """, params)
        
        recent_expenses = []
        for row in cursor.fetchall():
            recent_expenses.append({
                'id': row[0],
                'date': safe_datetime_format(row[1]),
                'description': row[2],
                'amount': decimal_to_float(row[3]),
                'currency': row[4],
                'status': row[5]
            })
        
        stats['recentExpenses'] = recent_expenses
        
        # Category breakdown
        cursor.execute(f"""
            SELECT e.category, COUNT(*), SUM(e.amount * e.exchange_rate)
            {base_expense_query}
            {where_clause}{"AND" if where_clause else "WHERE"} e.status IN ('approved', 'paid')
            GROUP BY e.category
        """, params)
        
        category_stats = []
        for row in cursor.fetchall():
            category_stats.append({
                'category': row[0],
                'count': row[1],
                'total': decimal_to_float(row[2]) if row[2] else 0
            })
        
        stats['categoryBreakdown'] = category_stats
        
        return jsonify({
            'message': 'Dashboard statistics retrieved successfully',
            'stats': stats
        }), 200
        
    except Exception as e:
        logging.error(f"Error retrieving dashboard stats: {str(e)}")
        return jsonify({'error': 'Failed to retrieve dashboard statistics'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@report_bp.route('/expenses', methods=['GET'])
@jwt_required
def get_expense_reports():
    """Get detailed expense reports with filtering options"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        category = request.args.get('category')
        location = request.args.get('location')
        status = request.args.get('status')
        
        # Get user role to filter data
        cursor.execute("SELECT role, branch_location FROM users WHERE id = ?", (request.current_user_id,))
        user_info = cursor.fetchone()
        
        if not user_info:
            return jsonify({'error': 'User not found'}), 404
        
        user_role, user_branch = user_info
        
        # Build dynamic query
        base_query = """
            SELECT e.*, 
                   u1.first_name + ' ' + u1.last_name as submitted_by_name,
                   u2.first_name + ' ' + u2.last_name as approved_by_name,
                   f.description as float_description
            FROM expenses e
            LEFT JOIN users u1 ON e.submitted_by = u1.id
            LEFT JOIN users u2 ON e.approved_by = u2.id
            LEFT JOIN floats f ON e.float_id = f.id
            WHERE 1=1
        """
        
        params = []
        
        # Role-based filtering
        if user_role == 'branch':
            base_query += " AND e.location = ?"
            params.append(user_branch)
        
        # Date filtering
        if start_date:
            base_query += " AND e.date >= ?"
            params.append(start_date)
        
        if end_date:
            base_query += " AND e.date <= ?"
            params.append(end_date)
        
        # Category filtering
        if category:
            base_query += " AND e.category = ?"
            params.append(category)
        
        # Location filtering (for non-branch users)
        if location and user_role != 'branch':
            base_query += " AND e.location = ?"
            params.append(location)
        
        # Status filtering
        if status:
            base_query += " AND e.status = ?"
            params.append(status)
        
        base_query += " ORDER BY e.created_at DESC"
        
        cursor.execute(base_query, params)
        
        expenses = []
        total_amount = 0
        for row in cursor.fetchall():
            amount_kes = decimal_to_float(row[4]) * decimal_to_float(row[9] or 1)
            total_amount += amount_kes
            
            expense_data = {
                'id': row[0],
                'date': safe_datetime_format(row[1]),
                'description': row[2],
                'category': row[3],
                'amount': decimal_to_float(row[4]),
                'floatId': row[5],
                'location': row[6],
                'status': row[7],
                'currency': row[8],
                'exchangeRate': decimal_to_float(row[9]) if row[9] else 1,
                'amountKES': amount_kes,
                'submittedByName': row[19],
                'approvedByName': row[20],
                'floatDescription': row[21]
            }
            expenses.append(expense_data)
        
        return jsonify({
            'message': 'Expense report generated successfully',
            'expenses': expenses,
            'summary': {
                'totalExpenses': len(expenses),
                'totalAmount': total_amount,
                'currency': 'KES'
            },
            'filters': {
                'startDate': start_date,
                'endDate': end_date,
                'category': category,
                'location': location,
                'status': status
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Error generating expense report: {str(e)}")
        return jsonify({'error': 'Failed to generate expense report'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@report_bp.route('/floats', methods=['GET'])
@jwt_required
def get_float_reports():
    """Get detailed float reports"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user role to filter data
        cursor.execute("SELECT role, branch_location FROM users WHERE id = ?", (request.current_user_id,))
        user_info = cursor.fetchone()
        
        if not user_info:
            return jsonify({'error': 'User not found'}), 404
        
        user_role, user_branch = user_info
        
        # Build query based on user role
        if user_role == 'branch':
            query = """
                SELECT f.*, 
                       u.first_name + ' ' + u.last_name as created_by_name,
                       (SELECT COUNT(*) FROM expenses WHERE float_id = f.id) as expense_count,
                       (SELECT SUM(amount * exchange_rate) FROM expenses WHERE float_id = f.id AND status = 'approved') as total_expenses
                FROM floats f
                LEFT JOIN users u ON f.created_by = u.id
                WHERE f.is_active = 1 AND f.location = ?
                ORDER BY f.created_at DESC
            """
            cursor.execute(query, (user_branch,))
        else:
            query = """
                SELECT f.*, 
                       u.first_name + ' ' + u.last_name as created_by_name,
                       (SELECT COUNT(*) FROM expenses WHERE float_id = f.id) as expense_count,
                       (SELECT SUM(amount * exchange_rate) FROM expenses WHERE float_id = f.id AND status = 'approved') as total_expenses
                FROM floats f
                LEFT JOIN users u ON f.created_by = u.id
                WHERE f.is_active = 1
                ORDER BY f.created_at DESC
            """
            cursor.execute(query)
        
        floats = []
        total_initial = 0
        total_used = 0
        total_balance = 0
        
        for row in cursor.fetchall():
            initial_amount = decimal_to_float(row[3])
            used_amount = decimal_to_float(row[4])
            balance = decimal_to_float(row[5])
            
            total_initial += initial_amount
            total_used += used_amount
            total_balance += balance
            
            float_data = {
                'id': row[0],
                'description': row[1],
                'location': row[2],
                'initialAmount': initial_amount,
                'usedAmount': used_amount,
                'balance': balance,
                'status': row[6],
                'currency': row[7],
                'createdByName': row[12],
                'createdAt': safe_datetime_format(row[9]),
                'expenseCount': row[13] or 0,
                'totalExpenses': decimal_to_float(row[14]) if row[14] else 0,
                'utilizationRate': round((used_amount / initial_amount * 100), 2) if initial_amount > 0 else 0
            }
            floats.append(float_data)
        
        return jsonify({
            'message': 'Float report generated successfully',
            'floats': floats,
            'summary': {
                'totalFloats': len(floats),
                'totalInitialAmount': total_initial,
                'totalUsedAmount': total_used,
                'totalBalance': total_balance,
                'overallUtilizationRate': round((total_used / total_initial * 100), 2) if total_initial > 0 else 0
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Error generating float report: {str(e)}")
        return jsonify({'error': 'Failed to generate float report'}), 500
    finally:
        if 'conn' in locals():
            conn.close()