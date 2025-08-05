from flask import Blueprint, jsonify
from utils.auth import jwt_required

location_bp = Blueprint('locations', __name__)

@location_bp.route('', methods=['GET'])
@jwt_required
def get_locations():
    """Get list of all available locations"""
    locations = [
        "SALES - CORPORATE SALES",
        "HEAD OFFICE FINANCE LOCATION", 
        "SALES EXPORTS",
        "ENGINEERING INSTALLATIONS - NAIROBI",
        "ENGINEERING INSTALLATIONS - MOMBASA",
        "BONDED WAREHOUSE RUIRU NO. 577 - BW3",
        "WAREHOUSE RUIRU - RHW1",
        "SALES - ONLINE SALES",
        "SHOWROOM SARIT CENTRE - SCR",
        "SHOWROOM LIKONI MALL MOMBASA - MSR",
        "CLEARANCE SALE",
        "SHOWROOM GARDEN CITY - GCS",
        "SHOWROOM VILLAGE MARKET - VMR",
        "SHOWROOM NYALI CENTRE MOMBASA - MSN",
        "SHOWROOM RUIRU D02 SALES - RHSR2",
        "SHOWROOM IMARA MALL - IMR",
        "SHOWROOM BINAA COMPLEX KAREN - KRN",
        "SHOWROOM CBD 680 HOTEL - CBD",
        "SHOWROOM ELDORET RUPAS MALL - ELD",
        "SHOWROOM YAYA CENTER - YCR",
        "SHOWROOM VICTORIA SQUARE RIARA - RSR",
        "SHOWROOM MEGA CITY KISUMU - KSM",
        "SERVICE CENTRE LIKONI MOMBASA - MSS",
        "SERVICE SARIT CENTRE - SCP",
        "SERVICE HEAD OFFICE RUIRU - SCS"
    ]
    
    return jsonify({
        'message': 'Locations retrieved successfully',
        'locations': locations
    }), 200