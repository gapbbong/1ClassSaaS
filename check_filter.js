
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwyflwjtafarkwbejoen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3eWZsd2p0YWZhcmt3YmVqb2VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYzNTIzMSwiZXhwIjoyMDg3MjExMjMxfQ.DWtKZHpkM9D-mR26mG1ncrVHi2vxIre3l7-9bH4IVEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const studentIds = ['3418', '3419', '3420', '3209', '1310'];
    
    const { data: students } = await supabase.from('students').select('pid, student_id, name').in('student_id', studentIds);
    const pids = students.map(s => s.pid);
    const { data: records } = await supabase.from('life_records').select('*').in('student_pid', pids);

    students.forEach(s => {
        const studentRecs = records.filter(r => r.student_pid === s.pid);
        console.log(`\n--- Student: ${s.student_id} ${s.name} ---`);
        
        const goodRecords = studentRecs.filter(r => r.is_positive === true);
        console.log(`Total Positive Records: ${goodRecords.length}`);
        
        goodRecords.forEach(r => {
            const isCounseling = r.category?.includes('상담');
            const isAttendance = r.category?.includes('근태');
            const wouldBeIncluded = r.is_positive === true && !isAttendance && !isCounseling;
            
            console.log(`  [${wouldBeIncluded ? 'KEEP' : 'SKIP'}] Cat: "${r.category}", Content: "${r.content.substring(0, 30)}..."`);
        });
    });
}

check();
