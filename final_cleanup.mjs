import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pwyflwjtafarkwbejoen.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3eWZsd2p0YWZhcmt3YmVqb2VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYzNTIzMSwiZXhwIjoyMDg3MjExMjMxfQ.DWtKZHpkM9D-mR26mG1ncrVHi2vxIre3l7-9bH4IVEE');
async function run() {
    console.log('--- FINAL CLEANUP 3401 ---');
    const pids = ['4a75fe5a-9986-46f1-91f6-c74097b4db125', '92837f61-71fb-4813-8197-b2a74a7a6367'];
    const { data, error } = await supabase
        .from('life_records')
        .delete()
        .in('student_pid', pids)
        .gte('created_at', '2026-03-10T15:00:00Z')
        .select();
    
    if (error) {
        console.log('ERROR:', error);
    } else {
        console.log('DELETED_COUNT:', data.length);
        data.forEach(r => console.log('DELETED:', r.id, r.category));
    }
}
run();
