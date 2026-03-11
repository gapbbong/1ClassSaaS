import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data: student } = await supabase.from('students').select('pid').eq('student_id', '3401').eq('academic_year', 2026).single();
    if (!student) { console.log('Student not found'); return; }
    
    // 2026-03-11 기록 중 '오류' 또는 테스트 기록 삭제
    const { data: deleted, error } = await supabase
        .from('life_records')
        .delete()
        .eq('student_pid', student.pid)
        .gte('created_at', '2026-03-11T00:00:00Z')
        .lte('created_at', '2026-03-11T23:59:59Z')
        .select();
    
    if (error) {
        console.error('Delete error:', error);
    } else {
        console.log('Deleted records count:', deleted?.length || 0);
        deleted.forEach(r => console.log('Deleted ID:', r.id, 'Category:', r.category));
    }
}
run();
