#!/usr/bin/env python3
"""
Script to fetch hometown data from IITK OA API and add state mapping

Usage:
    python scripts/populateHometownState.py

This script:
1. Reads students.json from public folder
2. Fetches hometown for each student from the API
3. Maps hometown/city to Indian state (using static mapping + Nominatim API fallback)
4. Writes back to students.json with hometown and homestate fields
"""

import json
import os
import re
import time
import urllib.request
import urllib.error
import urllib.parse
import ssl
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Path to students.json
SCRIPT_DIR = Path(__file__).parent
STUDENTS_FILE = SCRIPT_DIR.parent / "public" / "students.json"
CACHE_FILE = SCRIPT_DIR / "city_state_cache.json"

# Rate limiting
API_DELAY = 0.05  # 50ms between batches
CONCURRENT_LIMIT = 10  # Concurrent requests
NOMINATIM_DELAY = 1.0  # Nominatim requires 1 second between requests

# Create SSL context that doesn't verify certificates (for IITK's certificate)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Cache for geocoding results (to avoid repeated API calls)
geocode_cache = {}
geocode_cache_lock = threading.Lock()
nominatim_lock = threading.Lock()  # Ensure only one Nominatim request at a time
last_nominatim_call = 0

# Indian cities/towns to state mapping (comprehensive list)
CITY_STATE_MAP = {
    # Andhra Pradesh
    'visakhapatnam': 'Andhra Pradesh',
    'vizag': 'Andhra Pradesh',
    'vijayawada': 'Andhra Pradesh',
    'guntur': 'Andhra Pradesh',
    'nellore': 'Andhra Pradesh',
    'kurnool': 'Andhra Pradesh',
    'rajahmundry': 'Andhra Pradesh',
    'tirupati': 'Andhra Pradesh',
    'kakinada': 'Andhra Pradesh',
    'kadapa': 'Andhra Pradesh',
    'anantapur': 'Andhra Pradesh',
    'eluru': 'Andhra Pradesh',
    'ongole': 'Andhra Pradesh',
    'nandyal': 'Andhra Pradesh',
    'machilipatnam': 'Andhra Pradesh',
    'adoni': 'Andhra Pradesh',
    'tenali': 'Andhra Pradesh',
    'proddatur': 'Andhra Pradesh',
    'chittoor': 'Andhra Pradesh',
    'hindupur': 'Andhra Pradesh',
    'bhimavaram': 'Andhra Pradesh',
    'madanapalle': 'Andhra Pradesh',
    'guntakal': 'Andhra Pradesh',
    'dharmavaram': 'Andhra Pradesh',
    'gudivada': 'Andhra Pradesh',
    'srikakulam': 'Andhra Pradesh',
    'narasaraopet': 'Andhra Pradesh',
    'tadepalligudem': 'Andhra Pradesh',
    'chilakaluripet': 'Andhra Pradesh',
    'amaravati': 'Andhra Pradesh',

    # Arunachal Pradesh
    'itanagar': 'Arunachal Pradesh',
    'naharlagun': 'Arunachal Pradesh',
    'pasighat': 'Arunachal Pradesh',
    'tawang': 'Arunachal Pradesh',
    'ziro': 'Arunachal Pradesh',
    'bomdila': 'Arunachal Pradesh',
    'tezu': 'Arunachal Pradesh',
    'aalo': 'Arunachal Pradesh',
    'along': 'Arunachal Pradesh',

    # Assam
    'guwahati': 'Assam',
    'silchar': 'Assam',
    'dibrugarh': 'Assam',
    'jorhat': 'Assam',
    'nagaon': 'Assam',
    'tinsukia': 'Assam',
    'tezpur': 'Assam',
    'karimganj': 'Assam',
    'hailakandi': 'Assam',
    'diphu': 'Assam',
    'goalpara': 'Assam',
    'bongaigaon': 'Assam',
    'sibsagar': 'Assam',
    'sivasagar': 'Assam',
    'dhubri': 'Assam',
    'golaghat': 'Assam',
    'lakhimpur': 'Assam',
    'north lakhimpur': 'Assam',
    'barpeta': 'Assam',
    'mangaldoi': 'Assam',
    'nalbari': 'Assam',
    'dhemaji': 'Assam',

    # Bihar
    'patna': 'Bihar',
    'gaya': 'Bihar',
    'bhagalpur': 'Bihar',
    'muzaffarpur': 'Bihar',
    'purnia': 'Bihar',
    'darbhanga': 'Bihar',
    'bihar sharif': 'Bihar',
    'arrah': 'Bihar',
    'begusarai': 'Bihar',
    'katihar': 'Bihar',
    'munger': 'Bihar',
    'chhapra': 'Bihar',
    'danapur': 'Bihar',
    'saharsa': 'Bihar',
    'sasaram': 'Bihar',
    'hajipur': 'Bihar',
    'dehri': 'Bihar',
    'siwan': 'Bihar',
    'motihari': 'Bihar',
    'nawada': 'Bihar',
    'bagaha': 'Bihar',
    'buxar': 'Bihar',
    'kishanganj': 'Bihar',
    'sitamarhi': 'Bihar',
    'jamalpur': 'Bihar',
    'jehanabad': 'Bihar',
    'aurangabad': 'Bihar',
    'lakhisarai': 'Bihar',
    'madhubani': 'Bihar',
    'samastipur': 'Bihar',
    'vaishali': 'Bihar',
    'nalanda': 'Bihar',
    'gopalganj': 'Bihar',
    'bettiah': 'Bihar',
    'khagaria': 'Bihar',
    'madhepura': 'Bihar',
    'supaul': 'Bihar',
    'araria': 'Bihar',
    'forbesganj': 'Bihar',
    'banka': 'Bihar',
    'jamui': 'Bihar',
    'sheikhpura': 'Bihar',
    'rohtas': 'Bihar',
    'kaimur': 'Bihar',
    'bhojpur': 'Bihar',
    'saran': 'Bihar',
    'east champaran': 'Bihar',
    'west champaran': 'Bihar',

    # Chhattisgarh
    'raipur': 'Chhattisgarh',
    'bhilai': 'Chhattisgarh',
    'bilaspur': 'Chhattisgarh',
    'korba': 'Chhattisgarh',
    'durg': 'Chhattisgarh',
    'rajnandgaon': 'Chhattisgarh',
    'raigarh': 'Chhattisgarh',
    'jagdalpur': 'Chhattisgarh',
    'ambikapur': 'Chhattisgarh',
    'dhamtari': 'Chhattisgarh',
    'mahasamund': 'Chhattisgarh',
    'chirmiri': 'Chhattisgarh',
    'dalli rajhara': 'Chhattisgarh',
    'naila janjgir': 'Chhattisgarh',
    'tilda newra': 'Chhattisgarh',
    'kanker': 'Chhattisgarh',
    'kondagaon': 'Chhattisgarh',
    'mungeli': 'Chhattisgarh',
    'bemetara': 'Chhattisgarh',
    'balod': 'Chhattisgarh',
    'janjgir': 'Chhattisgarh',
    'champa': 'Chhattisgarh',
    'sakti': 'Chhattisgarh',

    # Goa
    'panaji': 'Goa',
    'margao': 'Goa',
    'vasco da gama': 'Goa',
    'mapusa': 'Goa',
    'ponda': 'Goa',
    'bicholim': 'Goa',
    'curchorem': 'Goa',
    'sanquelim': 'Goa',
    'cuncolim': 'Goa',
    'valpoi': 'Goa',
    'goa': 'Goa',

    # Gujarat
    'ahmedabad': 'Gujarat',
    'surat': 'Gujarat',
    'vadodara': 'Gujarat',
    'rajkot': 'Gujarat',
    'bhavnagar': 'Gujarat',
    'jamnagar': 'Gujarat',
    'junagadh': 'Gujarat',
    'gandhinagar': 'Gujarat',
    'gandhidham': 'Gujarat',
    'anand': 'Gujarat',
    'navsari': 'Gujarat',
    'morbi': 'Gujarat',
    'nadiad': 'Gujarat',
    'surendranagar': 'Gujarat',
    'bharuch': 'Gujarat',
    'mehsana': 'Gujarat',
    'bhuj': 'Gujarat',
    'porbandar': 'Gujarat',
    'palanpur': 'Gujarat',
    'valsad': 'Gujarat',
    'vapi': 'Gujarat',
    'gondal': 'Gujarat',
    'veraval': 'Gujarat',
    'godhra': 'Gujarat',
    'patan': 'Gujarat',
    'botad': 'Gujarat',
    'amreli': 'Gujarat',
    'deesa': 'Gujarat',
    'jetpur': 'Gujarat',
    'wadhwan': 'Gujarat',
    'ankleshwar': 'Gujarat',
    'dahod': 'Gujarat',
    'kalol': 'Gujarat',
    'modasa': 'Gujarat',
    'khambhat': 'Gujarat',
    'kadi': 'Gujarat',
    'dwarka': 'Gujarat',

    # Haryana
    'faridabad': 'Haryana',
    'gurgaon': 'Haryana',
    'gurugram': 'Haryana',
    'panipat': 'Haryana',
    'ambala': 'Haryana',
    'yamunanagar': 'Haryana',
    'rohtak': 'Haryana',
    'hisar': 'Haryana',
    'karnal': 'Haryana',
    'sonipat': 'Haryana',
    'panchkula': 'Haryana',
    'bhiwani': 'Haryana',
    'sirsa': 'Haryana',
    'bahadurgarh': 'Haryana',
    'jind': 'Haryana',
    'thanesar': 'Haryana',
    'kaithal': 'Haryana',
    'rewari': 'Haryana',
    'palwal': 'Haryana',
    'pinjore': 'Haryana',
    'mahendragarh': 'Haryana',
    'hansi': 'Haryana',
    'narnaul': 'Haryana',
    'fatehabad': 'Haryana',
    'tohana': 'Haryana',
    'charkhi dadri': 'Haryana',
    'hodal': 'Haryana',
    'narwana': 'Haryana',
    'kurukshetra': 'Haryana',

    # Himachal Pradesh
    'shimla': 'Himachal Pradesh',
    'mandi': 'Himachal Pradesh',
    'solan': 'Himachal Pradesh',
    'nahan': 'Himachal Pradesh',
    'kullu': 'Himachal Pradesh',
    'hamirpur': 'Himachal Pradesh',
    'una': 'Himachal Pradesh',
    'palampur': 'Himachal Pradesh',
    'baddi': 'Himachal Pradesh',
    'sundernagar': 'Himachal Pradesh',
    'paonta sahib': 'Himachal Pradesh',
    'dharamshala': 'Himachal Pradesh',
    'manali': 'Himachal Pradesh',
    'chamba': 'Himachal Pradesh',
    'kangra': 'Himachal Pradesh',
    'kinnaur': 'Himachal Pradesh',
    'lahaul': 'Himachal Pradesh',
    'spiti': 'Himachal Pradesh',
    'sirmaur': 'Himachal Pradesh',

    # Jharkhand
    'ranchi': 'Jharkhand',
    'jamshedpur': 'Jharkhand',
    'dhanbad': 'Jharkhand',
    'bokaro': 'Jharkhand',
    'bokaro steel city': 'Jharkhand',
    'deoghar': 'Jharkhand',
    'hazaribagh': 'Jharkhand',
    'giridih': 'Jharkhand',
    'ramgarh': 'Jharkhand',
    'medininagar': 'Jharkhand',
    'daltonganj': 'Jharkhand',
    'chirkunda': 'Jharkhand',
    'dumka': 'Jharkhand',
    'chaibasa': 'Jharkhand',
    'phusro': 'Jharkhand',
    'adityapur': 'Jharkhand',
    'chas': 'Jharkhand',
    'chatra': 'Jharkhand',
    'godda': 'Jharkhand',
    'koderma': 'Jharkhand',
    'lohardaga': 'Jharkhand',
    'pakur': 'Jharkhand',
    'sahibganj': 'Jharkhand',
    'gumla': 'Jharkhand',
    'simdega': 'Jharkhand',
    'khunti': 'Jharkhand',
    'seraikela': 'Jharkhand',

    # Karnataka
    'bengaluru': 'Karnataka',
    'bangalore': 'Karnataka',
    'mysuru': 'Karnataka',
    'mysore': 'Karnataka',
    'hubli': 'Karnataka',
    'dharwad': 'Karnataka',
    'mangaluru': 'Karnataka',
    'mangalore': 'Karnataka',
    'belgaum': 'Karnataka',
    'belagavi': 'Karnataka',
    'gulbarga': 'Karnataka',
    'kalaburagi': 'Karnataka',
    'davanagere': 'Karnataka',
    'bellary': 'Karnataka',
    'ballari': 'Karnataka',
    'bijapur': 'Karnataka',
    'vijayapura': 'Karnataka',
    'shimoga': 'Karnataka',
    'shivamogga': 'Karnataka',
    'tumkur': 'Karnataka',
    'tumakuru': 'Karnataka',
    'raichur': 'Karnataka',
    'bidar': 'Karnataka',
    'hospet': 'Karnataka',
    'hosapete': 'Karnataka',
    'gadag': 'Karnataka',
    'gadag betageri': 'Karnataka',
    'robertsonpet': 'Karnataka',
    'hassan': 'Karnataka',
    'bhadravati': 'Karnataka',
    'chitradurga': 'Karnataka',
    'kolar': 'Karnataka',
    'mandya': 'Karnataka',
    'chikmagalur': 'Karnataka',
    'chikkamagaluru': 'Karnataka',
    'gangavati': 'Karnataka',
    'bagalkot': 'Karnataka',
    'ranebennur': 'Karnataka',
    'udupi': 'Karnataka',
    'yelahanka': 'Karnataka',

    # Kerala
    'thiruvananthapuram': 'Kerala',
    'trivandrum': 'Kerala',
    'kochi': 'Kerala',
    'cochin': 'Kerala',
    'ernakulam': 'Kerala',
    'kozhikode': 'Kerala',
    'calicut': 'Kerala',
    'thrissur': 'Kerala',
    'kollam': 'Kerala',
    'quilon': 'Kerala',
    'kannur': 'Kerala',
    'alappuzha': 'Kerala',
    'alleppey': 'Kerala',
    'kottayam': 'Kerala',
    'palakkad': 'Kerala',
    'malappuram': 'Kerala',
    'manjeri': 'Kerala',
    'thalassery': 'Kerala',
    'kasaragod': 'Kerala',
    'kayamkulam': 'Kerala',
    'nedumangad': 'Kerala',
    'attingal': 'Kerala',
    'neyyattinkara': 'Kerala',
    'mattancherry': 'Kerala',
    'edappal': 'Kerala',
    'palai': 'Kerala',
    'vadakara': 'Kerala',
    'punalur': 'Kerala',
    'perinthalmanna': 'Kerala',
    'pathanamthitta': 'Kerala',
    'idukki': 'Kerala',
    'wayanad': 'Kerala',

    # Madhya Pradesh
    'bhopal': 'Madhya Pradesh',
    'indore': 'Madhya Pradesh',
    'jabalpur': 'Madhya Pradesh',
    'gwalior': 'Madhya Pradesh',
    'ujjain': 'Madhya Pradesh',
    'sagar': 'Madhya Pradesh',
    'dewas': 'Madhya Pradesh',
    'satna': 'Madhya Pradesh',
    'ratlam': 'Madhya Pradesh',
    'rewa': 'Madhya Pradesh',
    'murwara': 'Madhya Pradesh',
    'katni': 'Madhya Pradesh',
    'singrauli': 'Madhya Pradesh',
    'burhanpur': 'Madhya Pradesh',
    'khandwa': 'Madhya Pradesh',
    'morena': 'Madhya Pradesh',
    'bhind': 'Madhya Pradesh',
    'chhindwara': 'Madhya Pradesh',
    'guna': 'Madhya Pradesh',
    'shivpuri': 'Madhya Pradesh',
    'vidisha': 'Madhya Pradesh',
    'damoh': 'Madhya Pradesh',
    'mandsaur': 'Madhya Pradesh',
    'khargone': 'Madhya Pradesh',
    'neemuch': 'Madhya Pradesh',
    'pithampur': 'Madhya Pradesh',
    'hoshangabad': 'Madhya Pradesh',
    'itarsi': 'Madhya Pradesh',
    'seoni': 'Madhya Pradesh',
    'datia': 'Madhya Pradesh',
    'betul': 'Madhya Pradesh',
    'nagda': 'Madhya Pradesh',
    'shahdol': 'Madhya Pradesh',
    'dhar': 'Madhya Pradesh',
    'mhow': 'Madhya Pradesh',
    'balaghat': 'Madhya Pradesh',
    'tikamgarh': 'Madhya Pradesh',
    'chhatarpur': 'Madhya Pradesh',
    'panna': 'Madhya Pradesh',
    'ashoknagar': 'Madhya Pradesh',
    'rajgarh': 'Madhya Pradesh',
    'sehore': 'Madhya Pradesh',
    'harda': 'Madhya Pradesh',
    'mandla': 'Madhya Pradesh',
    'dindori': 'Madhya Pradesh',
    'umaria': 'Madhya Pradesh',
    'anuppur': 'Madhya Pradesh',
    'sidhi': 'Madhya Pradesh',
    'sheopur': 'Madhya Pradesh',
    'barwani': 'Madhya Pradesh',
    'jhabua': 'Madhya Pradesh',
    'alirajpur': 'Madhya Pradesh',
    'agar': 'Madhya Pradesh',

    # Maharashtra
    'mumbai': 'Maharashtra',
    'pune': 'Maharashtra',
    'nagpur': 'Maharashtra',
    'thane': 'Maharashtra',
    'pimpri chinchwad': 'Maharashtra',
    'nashik': 'Maharashtra',
    'kalyan dombivli': 'Maharashtra',
    'kalyan': 'Maharashtra',
    'dombivli': 'Maharashtra',
    'vasai virar': 'Maharashtra',
    'vasai': 'Maharashtra',
    'virar': 'Maharashtra',
    'navi mumbai': 'Maharashtra',
    'solapur': 'Maharashtra',
    'mira bhayandar': 'Maharashtra',
    'bhiwandi': 'Maharashtra',
    'amravati': 'Maharashtra',
    'nanded': 'Maharashtra',
    'sangli': 'Maharashtra',
    'kolhapur': 'Maharashtra',
    'akola': 'Maharashtra',
    'latur': 'Maharashtra',
    'dhule': 'Maharashtra',
    'ahmednagar': 'Maharashtra',
    'chandrapur': 'Maharashtra',
    'parbhani': 'Maharashtra',
    'jalna': 'Maharashtra',
    'ichalkaranji': 'Maharashtra',
    'jalgaon': 'Maharashtra',
    'ambarnath': 'Maharashtra',
    'ulhasnagar': 'Maharashtra',
    'panvel': 'Maharashtra',
    'badlapur': 'Maharashtra',
    'beed': 'Maharashtra',
    'gondia': 'Maharashtra',
    'satara': 'Maharashtra',
    'yavatmal': 'Maharashtra',
    'osmanabad': 'Maharashtra',
    'nandurbar': 'Maharashtra',
    'wardha': 'Maharashtra',
    'hinganghat': 'Maharashtra',
    'udgir': 'Maharashtra',
    'ratnagiri': 'Maharashtra',
    'shirdi': 'Maharashtra',
    'sindhudurg': 'Maharashtra',
    'buldana': 'Maharashtra',
    'washim': 'Maharashtra',

    # Manipur
    'imphal': 'Manipur',
    'thoubal': 'Manipur',
    'bishnupur': 'Manipur',
    'churachandpur': 'Manipur',
    'kakching': 'Manipur',
    'senapati': 'Manipur',
    'ukhrul': 'Manipur',
    'tamenglong': 'Manipur',
    'chandel': 'Manipur',

    # Meghalaya
    'shillong': 'Meghalaya',
    'tura': 'Meghalaya',
    'nongstoin': 'Meghalaya',
    'jowai': 'Meghalaya',
    'baghmara': 'Meghalaya',
    'williamnagar': 'Meghalaya',
    'cherrapunji': 'Meghalaya',
    'sohra': 'Meghalaya',

    # Mizoram
    'aizawl': 'Mizoram',
    'lunglei': 'Mizoram',
    'champhai': 'Mizoram',
    'serchhip': 'Mizoram',
    'kolasib': 'Mizoram',
    'lawngtlai': 'Mizoram',
    'mamit': 'Mizoram',
    'saiha': 'Mizoram',

    # Nagaland
    'kohima': 'Nagaland',
    'dimapur': 'Nagaland',
    'mokokchung': 'Nagaland',
    'tuensang': 'Nagaland',
    'wokha': 'Nagaland',
    'zunheboto': 'Nagaland',
    'mon': 'Nagaland',
    'phek': 'Nagaland',

    # Odisha
    'bhubaneswar': 'Odisha',
    'cuttack': 'Odisha',
    'rourkela': 'Odisha',
    'berhampur': 'Odisha',
    'brahmapur': 'Odisha',
    'sambalpur': 'Odisha',
    'puri': 'Odisha',
    'balasore': 'Odisha',
    'baleshwar': 'Odisha',
    'bhadrak': 'Odisha',
    'baripada': 'Odisha',
    'jharsuguda': 'Odisha',
    'jeypore': 'Odisha',
    'bargarh': 'Odisha',
    'paradip': 'Odisha',
    'bhawanipatna': 'Odisha',
    'dhenkanal': 'Odisha',
    'barbil': 'Odisha',
    'kendrapara': 'Odisha',
    'sunabeda': 'Odisha',
    'jatani': 'Odisha',
    'angul': 'Odisha',
    'rajgangpur': 'Odisha',
    'jajpur': 'Odisha',
    'keonjhar': 'Odisha',
    'koraput': 'Odisha',
    'rayagada': 'Odisha',
    'kendujhar': 'Odisha',
    'nayagarh': 'Odisha',
    'khordha': 'Odisha',
    'ganjam': 'Odisha',
    'mayurbhanj': 'Odisha',
    'sundargarh': 'Odisha',

    # Punjab
    'ludhiana': 'Punjab',
    'amritsar': 'Punjab',
    'jalandhar': 'Punjab',
    'patiala': 'Punjab',
    'bathinda': 'Punjab',
    'hoshiarpur': 'Punjab',
    'batala': 'Punjab',
    'pathankot': 'Punjab',
    'moga': 'Punjab',
    'abohar': 'Punjab',
    'malerkotla': 'Punjab',
    'khanna': 'Punjab',
    'phagwara': 'Punjab',
    'muktsar': 'Punjab',
    'barnala': 'Punjab',
    'rajpura': 'Punjab',
    'firozpur': 'Punjab',
    'kapurthala': 'Punjab',
    'mansa': 'Punjab',
    'sangrur': 'Punjab',
    'faridkot': 'Punjab',
    'mohali': 'Punjab',
    'rupnagar': 'Punjab',
    'ropar': 'Punjab',
    'fatehgarh sahib': 'Punjab',
    'nawanshahr': 'Punjab',
    'shaheed bhagat singh nagar': 'Punjab',
    'tarn taran': 'Punjab',
    'fazilka': 'Punjab',
    'gurdaspur': 'Punjab',

    # Rajasthan
    'jaipur': 'Rajasthan',
    'jodhpur': 'Rajasthan',
    'kota': 'Rajasthan',
    'bikaner': 'Rajasthan',
    'ajmer': 'Rajasthan',
    'udaipur': 'Rajasthan',
    'bhilwara': 'Rajasthan',
    'alwar': 'Rajasthan',
    'bharatpur': 'Rajasthan',
    'sikar': 'Rajasthan',
    'pali': 'Rajasthan',
    'sri ganganagar': 'Rajasthan',
    'ganganagar': 'Rajasthan',
    'beawar': 'Rajasthan',
    'hanumangarh': 'Rajasthan',
    'dhaulpur': 'Rajasthan',
    'dholpur': 'Rajasthan',
    'gangapur city': 'Rajasthan',
    'sawai madhopur': 'Rajasthan',
    'churu': 'Rajasthan',
    'jhunjhunu': 'Rajasthan',
    'kishangarh': 'Rajasthan',
    'tonk': 'Rajasthan',
    'nagaur': 'Rajasthan',
    'makrana': 'Rajasthan',
    'sujangarh': 'Rajasthan',
    'bundi': 'Rajasthan',
    'chittorgarh': 'Rajasthan',
    'banswara': 'Rajasthan',
    'dungarpur': 'Rajasthan',
    'pratapgarh': 'Rajasthan',
    'rajsamand': 'Rajasthan',
    'barmer': 'Rajasthan',
    'jaisalmer': 'Rajasthan',
    'jalore': 'Rajasthan',
    'sirohi': 'Rajasthan',
    'mount abu': 'Rajasthan',
    'dausa': 'Rajasthan',
    'karauli': 'Rajasthan',
    'baran': 'Rajasthan',
    'jhalawar': 'Rajasthan',

    # Sikkim
    'gangtok': 'Sikkim',
    'namchi': 'Sikkim',
    'mangan': 'Sikkim',
    'gyalshing': 'Sikkim',
    'geyzing': 'Sikkim',
    'rangpo': 'Sikkim',
    'singtam': 'Sikkim',
    'jorethang': 'Sikkim',

    # Tamil Nadu
    'chennai': 'Tamil Nadu',
    'coimbatore': 'Tamil Nadu',
    'madurai': 'Tamil Nadu',
    'tiruchirappalli': 'Tamil Nadu',
    'trichy': 'Tamil Nadu',
    'salem': 'Tamil Nadu',
    'tirunelveli': 'Tamil Nadu',
    'tiruppur': 'Tamil Nadu',
    'erode': 'Tamil Nadu',
    'vellore': 'Tamil Nadu',
    'thoothukkudi': 'Tamil Nadu',
    'tuticorin': 'Tamil Nadu',
    'thoothukudi': 'Tamil Nadu',
    'dindigul': 'Tamil Nadu',
    'thanjavur': 'Tamil Nadu',
    'ranipet': 'Tamil Nadu',
    'sivakasi': 'Tamil Nadu',
    'karur': 'Tamil Nadu',
    'udhagamandalam': 'Tamil Nadu',
    'ooty': 'Tamil Nadu',
    'hosur': 'Tamil Nadu',
    'nagercoil': 'Tamil Nadu',
    'kanchipuram': 'Tamil Nadu',
    'kumarapalayam': 'Tamil Nadu',
    'karaikkudi': 'Tamil Nadu',
    'neyveli': 'Tamil Nadu',
    'cuddalore': 'Tamil Nadu',
    'kumbakonam': 'Tamil Nadu',
    'tiruvannamalai': 'Tamil Nadu',
    'pollachi': 'Tamil Nadu',
    'rajapalayam': 'Tamil Nadu',
    'gudiyatham': 'Tamil Nadu',
    'pudukkottai': 'Tamil Nadu',
    'vaniyambadi': 'Tamil Nadu',
    'ambur': 'Tamil Nadu',
    'nagapattinam': 'Tamil Nadu',
    'kanyakumari': 'Tamil Nadu',
    'tiruvallur': 'Tamil Nadu',
    'villupuram': 'Tamil Nadu',
    'ariyalur': 'Tamil Nadu',
    'perambalur': 'Tamil Nadu',
    'krishnagiri': 'Tamil Nadu',
    'dharmapuri': 'Tamil Nadu',
    'namakkal': 'Tamil Nadu',
    'virudhunagar': 'Tamil Nadu',
    'sivaganga': 'Tamil Nadu',
    'ramnad': 'Tamil Nadu',
    'ramanathapuram': 'Tamil Nadu',
    'theni': 'Tamil Nadu',
    'tenkasi': 'Tamil Nadu',
    'tirupattur': 'Tamil Nadu',
    'chengalpattu': 'Tamil Nadu',
    'kallakurichi': 'Tamil Nadu',
    'mayiladuthurai': 'Tamil Nadu',

    # Telangana
    'hyderabad': 'Telangana',
    'warangal': 'Telangana',
    'nizamabad': 'Telangana',
    'karimnagar': 'Telangana',
    'ramagundam': 'Telangana',
    'khammam': 'Telangana',
    'mahbubnagar': 'Telangana',
    'nalgonda': 'Telangana',
    'adilabad': 'Telangana',
    'suryapet': 'Telangana',
    'siddipet': 'Telangana',
    'miryalaguda': 'Telangana',
    'jagtial': 'Telangana',
    'mancherial': 'Telangana',
    'nirmal': 'Telangana',
    'kamareddy': 'Telangana',
    'bodhan': 'Telangana',
    'armoor': 'Telangana',
    'kothagudem': 'Telangana',
    'sangareddy': 'Telangana',
    'medak': 'Telangana',
    'vikarabad': 'Telangana',
    'wanaparthy': 'Telangana',
    'gadwal': 'Telangana',
    'narayanpet': 'Telangana',
    'secunderabad': 'Telangana',
    'rangareddy': 'Telangana',
    'medchal': 'Telangana',

    # Tripura
    'agartala': 'Tripura',
    'dharmanagar': 'Tripura',
    'kailashahar': 'Tripura',
    'belonia': 'Tripura',
    'ambassa': 'Tripura',
    'khowai': 'Tripura',
    'teliamura': 'Tripura',
    'sabroom': 'Tripura',

    # Uttar Pradesh
    'lucknow': 'Uttar Pradesh',
    'kanpur': 'Uttar Pradesh',
    'ghaziabad': 'Uttar Pradesh',
    'agra': 'Uttar Pradesh',
    'varanasi': 'Uttar Pradesh',
    'banaras': 'Uttar Pradesh',
    'meerut': 'Uttar Pradesh',
    'prayagraj': 'Uttar Pradesh',
    'allahabad': 'Uttar Pradesh',
    'bareilly': 'Uttar Pradesh',
    'aligarh': 'Uttar Pradesh',
    'moradabad': 'Uttar Pradesh',
    'saharanpur': 'Uttar Pradesh',
    'gorakhpur': 'Uttar Pradesh',
    'noida': 'Uttar Pradesh',
    'greater noida': 'Uttar Pradesh',
    'firozabad': 'Uttar Pradesh',
    'jhansi': 'Uttar Pradesh',
    'muzaffarnagar': 'Uttar Pradesh',
    'mathura': 'Uttar Pradesh',
    'budaun': 'Uttar Pradesh',
    'badaun': 'Uttar Pradesh',
    'rampur': 'Uttar Pradesh',
    'shahjahanpur': 'Uttar Pradesh',
    'farrukhabad': 'Uttar Pradesh',
    'mau': 'Uttar Pradesh',
    'hapur': 'Uttar Pradesh',
    'etawah': 'Uttar Pradesh',
    'mirzapur': 'Uttar Pradesh',
    'bulandshahr': 'Uttar Pradesh',
    'sambhal': 'Uttar Pradesh',
    'amroha': 'Uttar Pradesh',
    'hardoi': 'Uttar Pradesh',
    'fatehpur': 'Uttar Pradesh',
    'raebareli': 'Uttar Pradesh',
    'orai': 'Uttar Pradesh',
    'sitapur': 'Uttar Pradesh',
    'bahraich': 'Uttar Pradesh',
    'modinagar': 'Uttar Pradesh',
    'unnao': 'Uttar Pradesh',
    'jaunpur': 'Uttar Pradesh',
    'hathras': 'Uttar Pradesh',
    'banda': 'Uttar Pradesh',
    'pilibhit': 'Uttar Pradesh',
    'barabanki': 'Uttar Pradesh',
    'khurja': 'Uttar Pradesh',
    'gonda': 'Uttar Pradesh',
    'mainpuri': 'Uttar Pradesh',
    'lalitpur': 'Uttar Pradesh',
    'etah': 'Uttar Pradesh',
    'deoria': 'Uttar Pradesh',
    'sultanpur': 'Uttar Pradesh',
    'azamgarh': 'Uttar Pradesh',
    'bijnor': 'Uttar Pradesh',
    'basti': 'Uttar Pradesh',
    'chandausi': 'Uttar Pradesh',
    'akbarpur': 'Uttar Pradesh',
    'ballia': 'Uttar Pradesh',
    'ghazipur': 'Uttar Pradesh',
    'faizabad': 'Uttar Pradesh',
    'ayodhya': 'Uttar Pradesh',
    'kasganj': 'Uttar Pradesh',
    'shikohabad': 'Uttar Pradesh',
    'kheri': 'Uttar Pradesh',
    'lakhimpur kheri': 'Uttar Pradesh',
    'sonbhadra': 'Uttar Pradesh',
    'bhadohi': 'Uttar Pradesh',
    'sant ravidas nagar': 'Uttar Pradesh',
    'chandauli': 'Uttar Pradesh',
    'ambedkar nagar': 'Uttar Pradesh',
    'amethi': 'Uttar Pradesh',
    'auraiya': 'Uttar Pradesh',
    'kannauj': 'Uttar Pradesh',
    'kanpur dehat': 'Uttar Pradesh',
    'kaushambi': 'Uttar Pradesh',
    'kushinagar': 'Uttar Pradesh',
    'mahoba': 'Uttar Pradesh',
    'shamli': 'Uttar Pradesh',
    'shrawasti': 'Uttar Pradesh',

    # Uttarakhand
    'dehradun': 'Uttarakhand',
    'haridwar': 'Uttarakhand',
    'roorkee': 'Uttarakhand',
    'haldwani': 'Uttarakhand',
    'kashipur': 'Uttarakhand',
    'rudrapur': 'Uttarakhand',
    'rishikesh': 'Uttarakhand',
    'pithoragarh': 'Uttarakhand',
    'kotdwar': 'Uttarakhand',
    'ramnagar': 'Uttarakhand',
    'almora': 'Uttarakhand',
    'nainital': 'Uttarakhand',
    'mussoorie': 'Uttarakhand',
    'pauri': 'Uttarakhand',
    'tehri': 'Uttarakhand',
    'chamoli': 'Uttarakhand',
    'champawat': 'Uttarakhand',
    'bageshwar': 'Uttarakhand',
    'uttarkashi': 'Uttarakhand',
    'udham singh nagar': 'Uttarakhand',

    # West Bengal
    'kolkata': 'West Bengal',
    'calcutta': 'West Bengal',
    'howrah': 'West Bengal',
    'asansol': 'West Bengal',
    'siliguri': 'West Bengal',
    'durgapur': 'West Bengal',
    'bardhaman': 'West Bengal',
    'burdwan': 'West Bengal',
    'malda': 'West Bengal',
    'baharampur': 'West Bengal',
    'habra': 'West Bengal',
    'kharagpur': 'West Bengal',
    'shantipur': 'West Bengal',
    'dankuni': 'West Bengal',
    'dhulian': 'West Bengal',
    'ranaghat': 'West Bengal',
    'haldia': 'West Bengal',
    'raiganj': 'West Bengal',
    'krishnanagar': 'West Bengal',
    'nabadwip': 'West Bengal',
    'medinipur': 'West Bengal',
    'midnapore': 'West Bengal',
    'jalpaiguri': 'West Bengal',
    'balurghat': 'West Bengal',
    'basirhat': 'West Bengal',
    'bankura': 'West Bengal',
    'barrackpore': 'West Bengal',
    'barasat': 'West Bengal',
    'kalyani': 'West Bengal',
    'bongaon': 'West Bengal',
    'alipurduar': 'West Bengal',
    'cooch behar': 'West Bengal',
    'purulia': 'West Bengal',
    'darjeeling': 'West Bengal',
    'kalimpong': 'West Bengal',
    'hooghly': 'West Bengal',
    'serampore': 'West Bengal',
    'chandannagar': 'West Bengal',
    'north 24 parganas': 'West Bengal',
    'south 24 parganas': 'West Bengal',
    'murshidabad': 'West Bengal',
    'nadia': 'West Bengal',
    'birbhum': 'West Bengal',
    'jhargram': 'West Bengal',

    # Union Territories
    # Delhi
    'delhi': 'Delhi',
    'new delhi': 'Delhi',
    'north delhi': 'Delhi',
    'south delhi': 'Delhi',
    'east delhi': 'Delhi',
    'west delhi': 'Delhi',
    'central delhi': 'Delhi',
    'shahdara': 'Delhi',
    'rohini': 'Delhi',

    # Jammu & Kashmir
    'srinagar': 'Jammu & Kashmir',
    'jammu': 'Jammu & Kashmir',
    'anantnag': 'Jammu & Kashmir',
    'sopore': 'Jammu & Kashmir',
    'baramulla': 'Jammu & Kashmir',
    'kathua': 'Jammu & Kashmir',
    'udhampur': 'Jammu & Kashmir',
    'poonch': 'Jammu & Kashmir',
    'rajouri': 'Jammu & Kashmir',
    'kupwara': 'Jammu & Kashmir',
    'pulwama': 'Jammu & Kashmir',
    'budgam': 'Jammu & Kashmir',
    'ganderbal': 'Jammu & Kashmir',
    'bandipora': 'Jammu & Kashmir',
    'kulgam': 'Jammu & Kashmir',
    'shopian': 'Jammu & Kashmir',
    'doda': 'Jammu & Kashmir',
    'kishtwar': 'Jammu & Kashmir',
    'ramban': 'Jammu & Kashmir',
    'reasi': 'Jammu & Kashmir',
    'samba': 'Jammu & Kashmir',

    # Ladakh
    'leh': 'Ladakh',
    'kargil': 'Ladakh',

    # Chandigarh
    'chandigarh': 'Chandigarh',

    # Puducherry
    'puducherry': 'Puducherry',
    'pondicherry': 'Puducherry',
    'karaikal': 'Puducherry',
    'mahe': 'Puducherry',
    'yanam': 'Puducherry',

    # Andaman and Nicobar Islands
    'port blair': 'Andaman and Nicobar Islands',

    # Lakshadweep
    'kavaratti': 'Lakshadweep',
    'lakshadweep': 'Lakshadweep',

    # Dadra and Nagar Haveli and Daman and Diu
    'silvassa': 'Dadra and Nagar Haveli and Daman and Diu',
    'daman': 'Dadra and Nagar Haveli and Daman and Diu',
    'diu': 'Dadra and Nagar Haveli and Daman and Diu',
    'dadra': 'Dadra and Nagar Haveli and Daman and Diu',
    'nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
}

# Additional district-based mappings
DISTRICT_STATE_MAP = {
    'kanpur nagar': 'Uttar Pradesh',
    'kanpur dehat': 'Uttar Pradesh',
    'gautam buddha nagar': 'Uttar Pradesh',
    'gautam buddh nagar': 'Uttar Pradesh',
    'sant kabir nagar': 'Uttar Pradesh',
    'maharajganj': 'Uttar Pradesh',
    'siddharthnagar': 'Uttar Pradesh',
    'balrampur': 'Uttar Pradesh',
    'bilaspur': 'Chhattisgarh',  # Note: Also in HP but more common for CG
}

# Merge all mappings
ALL_MAPPINGS = {**CITY_STATE_MAP, **DISTRICT_STATE_MAP}

# Indian state name variations for normalization
STATE_NAME_VARIATIONS = {
    'andhra pradesh': 'Andhra Pradesh',
    'arunachal pradesh': 'Arunachal Pradesh',
    'assam': 'Assam',
    'bihar': 'Bihar',
    'chhattisgarh': 'Chhattisgarh',
    'chattisgarh': 'Chhattisgarh',
    'goa': 'Goa',
    'gujarat': 'Gujarat',
    'haryana': 'Haryana',
    'himachal pradesh': 'Himachal Pradesh',
    'jharkhand': 'Jharkhand',
    'karnataka': 'Karnataka',
    'kerala': 'Kerala',
    'madhya pradesh': 'Madhya Pradesh',
    'maharashtra': 'Maharashtra',
    'manipur': 'Manipur',
    'meghalaya': 'Meghalaya',
    'mizoram': 'Mizoram',
    'nagaland': 'Nagaland',
    'odisha': 'Odisha',
    'orissa': 'Odisha',
    'punjab': 'Punjab',
    'rajasthan': 'Rajasthan',
    'sikkim': 'Sikkim',
    'tamil nadu': 'Tamil Nadu',
    'tamilnadu': 'Tamil Nadu',
    'telangana': 'Telangana',
    'tripura': 'Tripura',
    'uttar pradesh': 'Uttar Pradesh',
    'uttarakhand': 'Uttarakhand',
    'uttaranchal': 'Uttarakhand',
    'west bengal': 'West Bengal',
    'delhi': 'Delhi',
    'new delhi': 'Delhi',
    'nct of delhi': 'Delhi',
    'national capital territory of delhi': 'Delhi',
    'jammu and kashmir': 'Jammu & Kashmir',
    'jammu & kashmir': 'Jammu & Kashmir',
    'jammu kashmir': 'Jammu & Kashmir',
    'ladakh': 'Ladakh',
    'chandigarh': 'Chandigarh',
    'puducherry': 'Puducherry',
    'pondicherry': 'Puducherry',
    'andaman and nicobar islands': 'Andaman and Nicobar Islands',
    'andaman and nicobar': 'Andaman and Nicobar Islands',
    'andaman & nicobar islands': 'Andaman and Nicobar Islands',
    'lakshadweep': 'Lakshadweep',
    'dadra and nagar haveli and daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
    'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
    'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
    'daman & diu': 'Dadra and Nagar Haveli and Daman and Diu',
}


def load_geocode_cache():
    """Load geocode cache from file"""
    global geocode_cache
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                geocode_cache = json.load(f)
            print(f'Loaded {len(geocode_cache)} cached city-state mappings')
        except Exception:
            geocode_cache = {}


def save_geocode_cache():
    """Save geocode cache to file"""
    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(geocode_cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f'\nWarning: Could not save cache: {e}')


def normalize_state_name(state: str) -> str:
    """Normalize state name to standard format"""
    if not state:
        return ''
    normalized = state.lower().strip()
    return STATE_NAME_VARIATIONS.get(normalized, state.title())


def geocode_with_nominatim(query: str) -> str:
    """
    Use Nominatim (OpenStreetMap) API to geocode a location and extract state.
    Rate limited to 1 request per second as per Nominatim usage policy.
    """
    global last_nominatim_call
    
    if not query or query.strip() == '':
        return ''
    
    # Check cache first
    cache_key = query.lower().strip()
    with geocode_cache_lock:
        if cache_key in geocode_cache:
            return geocode_cache[cache_key]
    
    # Rate limiting for Nominatim (1 request per second)
    with nominatim_lock:
        current_time = time.time()
        time_since_last = current_time - last_nominatim_call
        if time_since_last < NOMINATIM_DELAY:
            time.sleep(NOMINATIM_DELAY - time_since_last)
        
        try:
            # Add "India" to improve accuracy
            search_query = f"{query}, India"
            encoded_query = urllib.parse.quote(search_query)
            url = f"https://nominatim.openstreetmap.org/search?q={encoded_query}&format=json&addressdetails=1&limit=1&countrycodes=in"
            
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'IITK-Student-Directory/1.0 (Educational Purpose)',
                    'Accept': 'application/json'
                }
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                if data and len(data) > 0:
                    address = data[0].get('address', {})
                    
                    # Try to get state from different fields
                    state = (
                        address.get('state') or 
                        address.get('state_district') or 
                        address.get('region') or
                        ''
                    )
                    
                    if state:
                        normalized_state = normalize_state_name(state)
                        
                        # Cache the result
                        with geocode_cache_lock:
                            geocode_cache[cache_key] = normalized_state
                        
                        last_nominatim_call = time.time()
                        return normalized_state
            
            # Cache empty result to avoid repeated lookups
            with geocode_cache_lock:
                geocode_cache[cache_key] = ''
            
            last_nominatim_call = time.time()
            return ''
            
        except Exception as e:
            last_nominatim_call = time.time()
            return ''


def get_state_from_hometown(hometown: str, use_api_fallback: bool = True) -> str:
    """Map hometown/city to state using static mapping and API fallback"""
    if not hometown or hometown.strip() == '':
        return ''
    
    # Normalize: lowercase, remove special chars
    normalized = re.sub(r'[^a-z0-9\s]', '', hometown.lower()).strip()
    
    # Check cache first
    with geocode_cache_lock:
        if normalized in geocode_cache:
            return geocode_cache[normalized]
    
    # Direct match in static mapping
    if normalized in ALL_MAPPINGS:
        return ALL_MAPPINGS[normalized]
    
    # Try to find partial match
    for city, state in ALL_MAPPINGS.items():
        if city in normalized or normalized in city:
            return state
    
    # Try splitting by comma (format: "City, State" or "City, District, State")
    parts = [re.sub(r'[^a-z0-9\s]', '', p.strip().lower()) for p in hometown.split(',')]
    for part in parts:
        if part in ALL_MAPPINGS:
            return ALL_MAPPINGS[part]
    
    # Check if any part is a state name directly
    for part in parts:
        normalized_part = normalize_state_name(part)
        if normalized_part in STATE_NAME_VARIATIONS.values():
            return normalized_part
    
    # Check if last part is a state name
    if len(parts) > 1:
        last_part = parts[-1].strip()
        if last_part in STATE_NAME_VARIATIONS:
            return STATE_NAME_VARIATIONS[last_part]
        
        state_names = list(set(ALL_MAPPINGS.values()))
        for state in state_names:
            if last_part in state.lower() or state.lower() in last_part:
                return state
    
    # Use Nominatim API as fallback
    if use_api_fallback:
        state = geocode_with_nominatim(hometown)
        if state:
            return state
        
        # Try with just the first part (city name)
        if parts and parts[0]:
            state = geocode_with_nominatim(parts[0])
            if state:
                return state
    
    return ''


def fetch_hometown(roll_no: str) -> str:
    """Fetch hometown from IITK OA API"""
    url = f"https://oa.iitk.ac.in/Oa/servlet/AutocompleteServlet?action=complete&id={roll_no}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10, context=ssl_context) as response:
            data = response.read().decode('utf-8')
            
            # Parse XML response to extract Home_town
            match = re.search(r'<Home_town>(.*?)</Home_town>', data)
            if match:
                return match.group(1).strip()
            return ''
    except Exception as e:
        return ''


def process_student(student: dict, use_api_fallback: bool = False) -> dict:
    """Process a single student - fetch hometown and map state"""
    roll_no = student.get('roll', '')
    
    # Skip if no roll number
    if not roll_no:
        return {**student, 'hometown': '', 'homestate': ''}
    
    hometown = fetch_hometown(roll_no)
    homestate = get_state_from_hometown(hometown, use_api_fallback=use_api_fallback)
    
    return {**student, 'hometown': hometown, 'homestate': homestate}


def main():
    global geocode_cache
    
    print('=' * 60)
    print('IITK Student Hometown & State Population Script')
    print('=' * 60)
    print()

    # Load geocode cache
    load_geocode_cache()

    # Read students.json
    print('Reading students.json...')
    try:
        with open(STUDENTS_FILE, 'r', encoding='utf-8') as f:
            students = json.load(f)
        print(f'Loaded {len(students)} students')
    except Exception as e:
        print(f'Error reading students.json: {e}')
        return

    # Stats
    total_students = len(students)
    processed = 0
    hometown_found = 0
    state_mapped = 0

    print()
    print('Phase 1: Fetching hometown data from IITK OA API...')
    print('(Using static mapping only)')
    print()

    updated_students = []

    # Phase 1: Process with thread pool for concurrency (static mapping only)
    with ThreadPoolExecutor(max_workers=CONCURRENT_LIMIT) as executor:
        # Submit all tasks
        future_to_student = {executor.submit(process_student, student, False): i 
                           for i, student in enumerate(students)}
        
        # Process results as they complete
        for future in as_completed(future_to_student):
            idx = future_to_student[future]
            try:
                result = future.result()
                updated_students.append((idx, result))
                
                processed += 1
                if result.get('hometown'):
                    hometown_found += 1
                if result.get('homestate'):
                    state_mapped += 1
                
                # Progress update every 100 students
                if processed % 100 == 0 or processed == total_students:
                    pct = (processed / total_students) * 100
                    print(f'\rProgress: {processed}/{total_students} ({pct:.1f}%) | '
                          f'Hometown found: {hometown_found} | State mapped: {state_mapped}', 
                          end='', flush=True)
                
                # Small delay for rate limiting
                time.sleep(API_DELAY)
                
            except Exception as e:
                print(f'\nError processing student {idx}: {e}')
                updated_students.append((idx, {**students[idx], 'hometown': '', 'homestate': ''}))

    # Sort by original index to maintain order
    updated_students.sort(key=lambda x: x[0])
    phase1_students = [s[1] for s in updated_students]

    print('\n')
    print(f'Phase 1 complete: {state_mapped} of {hometown_found} hometowns mapped')
    
    # Phase 2: Use Nominatim API for unmapped hometowns
    unmapped = [(i, s) for i, s in enumerate(phase1_students) 
                if s.get('hometown') and not s.get('homestate')]
    
    if unmapped:
        print()
        print(f'Phase 2: Using Nominatim API for {len(unmapped)} unmapped cities...')
        print('(This will be slower due to API rate limiting - 1 req/sec)')
        print()
        
        nominatim_mapped = 0
        for idx, (orig_idx, student) in enumerate(unmapped):
            hometown = student.get('hometown', '')
            homestate = get_state_from_hometown(hometown, use_api_fallback=True)
            
            if homestate:
                phase1_students[orig_idx]['homestate'] = homestate
                nominatim_mapped += 1
                state_mapped += 1
            
            # Progress update
            if (idx + 1) % 10 == 0 or idx + 1 == len(unmapped):
                print(f'\rNominatim progress: {idx + 1}/{len(unmapped)} | '
                      f'Newly mapped: {nominatim_mapped}', 
                      end='', flush=True)
        
        print('\n')
        print(f'Phase 2 complete: {nominatim_mapped} additional cities mapped')
        
        # Save cache after Nominatim lookups
        save_geocode_cache()

    final_students = phase1_students
    
    # Find still unmapped
    still_unmapped = [(s.get('roll'), s.get('hometown')) 
                      for s in final_students 
                      if s.get('hometown') and not s.get('homestate')]
    
    print()
    print('=' * 60)
    print('Summary:')
    print('=' * 60)
    print(f'Total students processed: {processed}')
    print(f'Hometown found: {hometown_found} ({(hometown_found / processed) * 100:.1f}%)')
    print(f'State mapped: {state_mapped} ({(state_mapped / hometown_found) * 100:.1f}% of found hometowns)' if hometown_found else 'State mapped: 0')
    
    if still_unmapped:
        print(f'\nStill unmapped ({len(still_unmapped)}):')
        for roll, hometown in still_unmapped[:20]:  # Show first 20
            print(f'  - {roll}: {hometown}')
        if len(still_unmapped) > 20:
            print(f'  ... and {len(still_unmapped) - 20} more')
    
    print()

    # Write back to file
    print('Writing updated students.json...')
    try:
        with open(STUDENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(final_students, f, indent=4, ensure_ascii=False)
        print('Successfully wrote students.json')
    except Exception as e:
        print(f'Error writing students.json: {e}')
        return

    print()
    print('Done!')


if __name__ == '__main__':
    main()
