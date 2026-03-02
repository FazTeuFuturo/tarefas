// Script para configurar senhas dos usuários de seed via Supabase Admin API local
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0';

const users = [
    { id: 'aab9b08f-7f72-4a0b-8d89-4b693eb14f52', password: '1234' },
    { id: 'cdceb08f-7f72-4a0b-8d89-4b693eb14f53', password: '1234' },
];

async function setPasswords() {
    for (const user of users) {
        const url = `${SUPABASE_URL}/auth/v1/admin/users/${user.id}`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ password: user.password }),
        });

        const data = await res.json();
        if (res.ok) {
            console.log(`✅ User ${user.id}: senha '${user.password}' definida.`);
        } else {
            console.error(`❌ User ${user.id}: Falha`, JSON.stringify(data));
        }
    }
}

setPasswords().catch(console.error);
