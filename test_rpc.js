import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cgmpjzwtolnrwsctrerr.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbXBqend0b2xucndzY3RyZXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU1MjQwNzQsImV4cCI6MjAyMTEwMDA3NH0.hX9O9H5e... (missing the rest, let me fetch it properly from .env)';

try {
    const fs = require('fs');
    const dotenv = require('dotenv');
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log('No .env.local found');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    const token = 'dab1a9ef-4cfc-4bdb-ae20-47280e8b26aa';
    console.log('Testing RPC API for token:', token);

    // First, regular query (which is what we originally had and it failed)
    const { data: qData, error: qErr } = await supabase.from('profiles').select('nome, invite_token').eq('invite_token', token).single();
    if (qErr) console.error('Query Error:', qErr.message);
    else console.log('Query Data:', qData);

    // Now testing RPC
    const { data, error } = await supabase.rpc('get_hero_by_invite', { token });
    if (error) {
        console.error('RPC failed:', error);
    } else {
        console.log('RPC result:', data);
    }
}

testRpc();
