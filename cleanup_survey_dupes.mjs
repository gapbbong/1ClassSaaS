
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function cleanupDuplicateSurveys() {
    console.log("🔍 Checking for duplicate surveys...");

    // 1. Get all survey entries grouped by student_pid
    const { data: surveys, error } = await supabase
        .from('surveys')
        .select('id, student_pid, submitted_at')
        .order('student_pid')
        .order('submitted_at', { ascending: false });

    if (error) {
        console.error("Error fetching surveys:", error);
        return;
    }

    const seenPids = new Set();
    const idsToDelete = [];

    for (const survey of surveys) {
        if (seenPids.has(survey.student_pid)) {
            // This is a duplicate (not the most recent one because of the sort order)
            idsToDelete.push(survey.id);
        } else {
            seenPids.add(survey.student_pid);
        }
    }

    if (idsToDelete.length === 0) {
        console.log("✅ No duplicate surveys found.");
        return;
    }

    console.log(`🧹 Found ${idsToDelete.length} duplicate survey entries. Cleaning up...`);

    // Delete in chunks to avoid URL length issues or other potential limits
    const chunkSize = 100;
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const { error: deleteError } = await supabase
            .from('surveys')
            .delete()
            .in('id', chunk);

        if (deleteError) {
            console.error(`Error deleting chunk ${i / chunkSize}:`, deleteError);
        } else {
            console.log(`Successfully deleted ${chunk.length} duplicates...`);
        }
    }

    console.log("✨ Survey cleanup complete.");
}

cleanupDuplicateSurveys();
