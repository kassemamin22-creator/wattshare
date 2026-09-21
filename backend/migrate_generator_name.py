"""
One-time migration: update outdated generator_name values on subscription
documents to "AK Power". Only the generator_name field is touched.

Usage: python migrate_generator_name.py
"""

from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

NEW_GENERATOR_NAME = "AK Power"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
subscriptions_collection = db["subscriptions"]


def migrate():
    query = {"generator_name": {"$ne": NEW_GENERATOR_NAME}}

    found_count = subscriptions_collection.count_documents(query)
    print(f"Found {found_count} subscription document(s) with generator_name != '{NEW_GENERATOR_NAME}'")

    if found_count == 0:
        print("Nothing to update.")
        return

    result = subscriptions_collection.update_many(
        query,
        {"$set": {"generator_name": NEW_GENERATOR_NAME}},
    )
    print(f"Updated {result.modified_count} document(s) to generator_name = '{NEW_GENERATOR_NAME}'")


if __name__ == "__main__":
    migrate()
