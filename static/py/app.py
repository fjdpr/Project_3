import pandas as pd
import sqlite3
from pathlib import Path
from flask import Flask, jsonify, render_template

# Define file paths
csv_file_path = Path('../data/Border_Crossing_Entry_Data.csv')
sqlite_db_path = Path('../sql/data.sqlite')
json_file_path = Path('../json/data.json')

# Read the CSV file into a pandas DataFrame
df = pd.read_csv(csv_file_path)

# Clean the data by converting 'Date' column to datetime, then extract 'Month' and 'Year'
df['Date'] = pd.to_datetime(df['Date'], format='%b %Y')
df['Month'] = df['Date'].dt.strftime('%B')
df['Year'] = df['Date'].dt.strftime('%Y')

# Extract latitude and longitude from the 'Point' column
df['Longitude'] = df['Point'].apply(lambda x: float(x.split(' ')[1][1:]))
df['Latitude'] = df['Point'].apply(lambda x: float(x.split(' ')[2][:-1]))

# Drop the 'Date' and 'Point' columns as they are no longer needed
df = df.drop(columns=['Date', 'Point'])

# Reorder the columns to the desired order
columns_order = ['Port Name', 'State', 'Port Code', 'Border', 'Month', 'Year', 'Measure', 'Value', 'Latitude', 'Longitude']
df = df[columns_order]

# Save the DataFrame to a SQLite database
with sqlite3.connect(sqlite_db_path) as conn:
    df.to_sql('data', conn, if_exists='replace', index=False)

print("The CSV file has been cleaned and successfully converted to an SQLite database.")

# Convert the SQLite database to JSON
with sqlite3.connect(sqlite_db_path) as conn:
    df = pd.read_sql('SELECT * FROM data', conn)
    df.to_json(json_file_path, orient='records')

print("The SQLite database has been converted to a JSON file.")