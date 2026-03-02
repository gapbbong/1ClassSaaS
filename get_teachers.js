import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: teachers, error } = await supabase.from('teachers').select('name, email, assigned_class').eq('role', 'homeroom_teacher').order('assigned_class');
    if (error) {
        console.error('Error fetching teachers', error);
        return;
    }

    teachers.forEach(t => {
        let email = t.email;
        let [id, domain] = email.split('@');
        let maskedId = id.substring(0, 3) + '*'.repeat(Math.max(1, id.length - 3));
        // pad End assigned_class for alignment
        console.log(`${t.assigned_class.padEnd(4, ' ')} 담임 ${t.name.padEnd(4, ' ')} 선생님: ${maskedId}@${domain}`);
    });
}
run();
