import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("SUPABASE_URL:", SUPABASE_URL)
print("SUPABASE_KEY EXISTS:", SUPABASE_KEY is not None)

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Supabase environment variables not set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)