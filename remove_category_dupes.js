import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function removeCategoryDupes() {
    const { data: records, error } = await supabase
        .from('life_records')
        .select('*');

    if (error) {
        console.error('Error fetching records:', error);
        return;
    }

    console.log(`Total records in DB: ${records.length}`);

    const grouped = {};
    // Group records by student_pid and content exactly.
    records.forEach(r => {
        const key = `${r.student_pid}_${r.content.trim()}`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(r);
    });

    const idsToDelete = [];

    for (const key in grouped) {
        if (grouped[key].length > 1) {
            // Sort to keep '생활기록' category preferentially, or the latest created.
            grouped[key].sort((a, b) => {
                if (a.category === '생활기록' && b.category !== '생활기록') return -1;
                if (a.category !== '생활기록' && b.category === '생활기록') return 1;
                return new Date(b.created_at) - new Date(a.created_at);
            });

            // Keep the first one, delete the rest
            for (let i = 1; i < grouped[key].length; i++) {
                idsToDelete.push(grouped[key][i].id);
            }
        }
    }

    console.log(`Records to delete (category dupes): ${idsToDelete.length}`);
    const uniqueIdsToDelete = [...new Set(idsToDelete)];

    if (uniqueIdsToDelete.length > 0) {
        const { error: delError } = await supabase
            .from('life_records')
            .delete()
            .in('id', uniqueIdsToDelete);

        if (delError) {
            console.error('Error deleting duplicates:', delError);
        } else {
            console.log(`Successfully deleted ${uniqueIdsToDelete.length} duplicate records.`);
        }
    } else {
        console.log("No duplicates found ignoring differences in category name.");
    }
}

removeCategoryDupes();
