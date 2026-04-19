import json
import time
import os
import subprocess
from datetime import datetime

# Configuration
SERIAL_PORT = '/dev/ttyUSB0'
BAUD_RATE = 115200
PUSH_INTERVAL = 300  # 5 minutes in seconds
INDEX_FILE = 'data/days.json'

def get_git_push():
    try:
        # Check if there are changes to commit in data/
        status = subprocess.run(['git', 'status', '--porcelain', 'data/'], capture_output=True, text=True)
        if not status.stdout.strip():
            print(f"[{datetime.now()}] No changes to push.")
            return

        subprocess.run(['git', 'add', 'data/'], check=True)
        subprocess.run(['git', 'commit', '-m', 'chore: update device data [skip ci]'], check=True)
        subprocess.run(['git', 'push', 'origin', 'main'], check=True)
        print(f"[{datetime.now()}] Data committed and pushed to GitHub.")
    except subprocess.CalledProcessError as e:
        print(f"[{datetime.now()}] Git operation failed: {e}")

def update_index_file(day_str):
    days = []
    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE, 'r') as f:
            try:
                days = json.load(f)
            except json.JSONDecodeError:
                days = []
    if day_str not in days:
        days.append(day_str)
        days.sort(reverse=True)
        with open(INDEX_FILE, 'w') as f:
            json.dump(days, f, indent=2)

def main():
    try:
        import serial
    except ImportError:
        print("pyserial not installed. Please run 'pip install pyserial'.")
        serial = None

    last_push_time = time.time()
    
    # Accumulators
    current_counts = {'pax': 0, 'wifi': 0, 'ble': 0, 'samples': 0}

    # Ensure data directory exists
    if not os.path.exists('data'):
        os.makedirs('data')

    print(f"Starting bridge on {SERIAL_PORT}...")
    
    ser = None
    if serial:
        try:
            ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        except Exception as e:
            print(f"Could not open serial port {SERIAL_PORT}: {e}")
            print("Running in simulation mode (waiting for manual input or timing out).")
    else:
        print("Running without serial support.")

    while True:
        try:
            line = ""
            if ser:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
            
            if line and "Sending count results:" in line:
                try:
                    parts = line.split('Sending count results: ')[1].split(' / ')
                    for p in parts:
                        k, v = p.split('=')
                        current_counts[k.strip()] += int(v)
                    current_counts['samples'] += 1
                    print(f"Read sample: {line}")
                except (IndexError, ValueError) as e:
                    print(f"Failed to parse line: {line}. Error: {e}")

            # Check if it's time to save and push
            now = time.time()
            if now - last_push_time >= PUSH_INTERVAL:
                if current_counts['samples'] > 0:
                    current_time = datetime.now()
                    day_str = current_time.strftime('%Y-%m-%d')
                    data_file = f'data/device_counts_{day_str}.json'
                    
                    update_index_file(day_str)
                    
                    if not os.path.exists(data_file):
                        with open(data_file, 'w') as f:
                            json.dump([], f)

                    # Calculate averages instead of sums
                    avg_pax = round(current_counts['pax'] / current_counts['samples'])
                    avg_wifi = round(current_counts['wifi'] / current_counts['samples'])
                    avg_ble = round(current_counts['ble'] / current_counts['samples'])

                    entry = {
                        'timestamp': current_time.isoformat(),
                        'pax': avg_pax,
                        'wifi': avg_wifi,
                        'ble': avg_ble,
                        'samples': current_counts['samples']
                    }
                    
                    # Load, Append, Save
                    with open(data_file, 'r+') as f:
                        try:
                            data = json.load(f)
                        except json.JSONDecodeError:
                            data = []
                        data.append(entry)
                        f.seek(0)
                        json.dump(data, f, indent=2)
                        f.truncate()
                    
                    print(f"[{entry['timestamp']}] Saved aggregated data to {data_file}: {entry}")
                    get_git_push()
                    
                    # Reset accumulators
                    current_counts = {'pax': 0, 'wifi': 0, 'ble': 0, 'samples': 0}
                
                last_push_time = now

            time.sleep(0.1)
        except KeyboardInterrupt:
            print("Shutting down...")
            break
        except Exception as e:
            print(f"Error in main loop: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
