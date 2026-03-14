
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwyflwjtafarkwbejoen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3eWZsd2p0YWZhcmt3YmVqb2VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYzNTIzMSwiZXhwIjoyMDg3MjExMjMxfQ.DWtKZHpkM9D-mR26mG1ncrVHi2vxIre3l7-9bH4IVEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: records } = await supabase.from('life_records')
        .select('*')
        .is('category', null)
        .eq('is_positive', true);
    
    console.log("Positive records with NULL category:", records.length);
    records.forEach(r => {
        console.log(`ID: ${r.id}, Content: ${r.content.substring(0, 50)}...`);
    });
}

check();
