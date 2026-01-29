import { createClient } from '@supabase/supabase-js';

// Substitua pelas suas chaves REAIS do painel do Supabase
const SUPABASE_URL = "https://yvinqxbyuhmhamigsawz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2aW5xeGJ5dWhtaGFtaWdzYXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjExNjcsImV4cCI6MjA4MzI5NzE2N30.nEWPN-TCyef2x3kTSPUEoeusbkfbJzgzMIotOLRjFRI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);