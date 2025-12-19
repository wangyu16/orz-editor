const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Fallback

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('DB URL (env):', process.env.DATABASE_URL ? 'Defined' : 'Undefined');

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
});

async function migrate() {
    try {
        await client.connect();
        const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20231218000002_add_share_tokens.sql'), 'utf8');
        await client.query(sql);
        console.log('Migration applied successfully');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
