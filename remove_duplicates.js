import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDuplicates() {
    const { data: records, error } = await supabase
        .from('life_records')
        .select('*');

    if (error) {
        console.error('Error fetching records:', error);
        return;
    }

    console.log(`Total records in DB: ${records.length}`);

    // Find broken records by looking for "" or "?" or just records created recently
    const brokenRecords = records.filter(r =>
        r.content.includes('?') ||
        r.teacher_email_prefix.includes('?') ||
        r.category.includes('?')
    );

    console.log(`Broken records count: ${brokenRecords.length}`);

    // We can also find pure duplicates (same student, same category, same positive) that might have been imported with correct encoding and then broken encoding.
    // Let's just delete the broken ones first.

    const idsToDelete = brokenRecords.map(r => r.id);

    // Check for exact duplicates among NON-broken records
    const goodRecords = records.filter(r => !idsToDelete.includes(r.id));
    const grouped = {};
    goodRecords.forEach(r => {
        const key = `${r.student_pid}_${r.content}_${r.category}_${r.is_positive}`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(r);
    });

    for (const key in grouped) {
        if (grouped[key].length > 1) {
            // Keep the first one, delete the rest
            for (let i = 1; i < grouped[key].length; i++) {
                idsToDelete.push(grouped[key][i].id);
            }
        }
    }

    console.log(`Records to delete (broken + dupes): ${idsToDelete.length}`);

    if (idsToDelete.length > 0) {
        const { error: delError } = await supabase
            .from('life_records')
            .delete()
            .in('id', idsToDelete);

        if (delError) {
            console.error('Error deleting duplicates:', delError);
        } else {
            console.log(`Successfully deleted ${idsToDelete.length} duplicate/broken records.`);
        }
    }
}

checkDuplicates();
