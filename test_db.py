from pymongo import MongoClient
import os

client = MongoClient('mongodb+srv://indiagetyourresult_db_user:BNj1IThbrIW3fGYX@cluster0.ypswhpz.mongodb.net/?appName=Cluster')
db = client['indiagetyourresult']
insts = list(db['institutes'].find({}))
for inst in insts:
    history = inst.get("history", [])
    print(f"Email: {inst.get('email')} -> History items: {len(history)}")
    for h in history:
        payments = h.get("payments", {})
        phases = payments.get("phases", [])
        print(f"  - History date: {h.get('date')}, phases length: {len(phases)}")
