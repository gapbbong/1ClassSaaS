import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log("Teacher Data Debug Started...");
    const { data: teachers, error } = await supabase.from('teachers').select('*');
    if (error) {
        console.error("Error fetching teachers:", error);
        return;
    }

    console.log(`Total Teachers: ${teachers.length}`);

    const missingClasses = ['2-2', '2-6', '3-4'];
    console.log("\n--- Checking Missing Classes ---");
    teachers.forEach(t => {
        if (missingClasses.includes(t.assigned_class)) {
            console.log(`Matched: ${t.name} (${t.email}) | Class: ${t.assigned_class} | Role: ${t.role} | SubClass: ${t.sub_grade}-${t.sub_class}`);
        }
    });

    console.log("\n--- Checking Teachers with Sub Classes ---");
    let subCount = 0;
    teachers.forEach(t => {
        if (t.sub_grade || t.sub_class) {
            subCount++;
            console.log(`Sub: ${t.name} | SubClass: ${t.sub_grade}-${t.sub_class}`);
        }
    });
    console.log(`Total Teachers with Sub Grade/Class: ${subCount}`);

    console.log("\n--- Checking Jang Hyo-yoon ---");
    const jang = teachers.find(t => t.name && t.name.includes("장효윤"));
    if (jang) {
        console.log(`Found Jang: ${JSON.stringify(jang)}`);
    } else {
        console.log("Jang Hyo-yoon not found by name.");
    }
}

debug();
