// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    "https://cylmfazipzdvkpmxkgea.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bG1mYXppcHpkdmtwbXhrZ2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjM5NTEsImV4cCI6MjA2NjE5OTk1MX0.yePSDojyhV-I30fCI5o-pe4OpE81kYcdC9-lF4s1vJg"
);
