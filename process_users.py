import csv
import re

# Read the CSV file
users = {}
with open('attached_assets/devices-export-2025-07-08_1752032004646.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        assigned_to = row.get('AssignedTo', '').strip()
        department = row.get('Department', '').strip()
        
        if assigned_to and assigned_to not in ['', 'active', 'broken', 'retired']:
            users[assigned_to] = department

# Print unique users with their departments
for user, dept in sorted(users.items()):
    print(f"{user},{dept}")
