import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyfadmRNyOpRww3m13PVnx_E_6ft9gzrqleOx2q_8X9WXFpom31vYpgjzZg9MK01hcZ3Q/exec?action=getAllStudents";

async function restoreNames() {
    console.log("🚀 Fetching real student data from GAS...");
    try {
        const response = await fetch(SCRIPT_URL);
        const realData = await response.json();
        console.log(`✅ Loaded ${realData.length} students from GAS.`);

        console.log("⏳ Updating Supabase students table...");

        let successCount = 0;
        let errorCount = 0;

        for (const student of realData) {
            const studentId = String(student['학번']);
            const realName = student['이름'];
            const gender = student['성별'];
            const contact = student['학생폰'] || student['부(연락처)'] || "";
            const status = student['학적'] === '자퇴' ? 'withdrawn' : (student['학적'] === '전출' ? 'transferred' : 'active');

            if (!studentId || !realName) continue;

            const { data, error } = await supabase
                .from('students')
                .update({
                    name: realName,
                    gender: gender,
                    contact: contact,
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('student_id', studentId);

            if (error) {
                console.error(`❌ Error updating ${studentId}:`, error.message);
                errorCount++;
            } else {
                successCount++;
                if (successCount % 50 === 0) console.log(`... ${successCount} entries updated`);
            }
        }

        console.log("\n✨ Restoration Complete!");
        console.log(`- Total Success: ${successCount}`);
        console.log(`- Total Failed: ${errorCount}`);

    } catch (err) {
        console.error("💥 Critical Error:", err.message);
    }
}

restoreNames();
