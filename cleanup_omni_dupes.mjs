import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function cleanupDuplicates() {
    try {
        console.log("🧹 중복 분석 데이터 정리 시작...");

        // 1. 모든 omni 인사이트 가져오기 (ID 순으로 정렬하여 최신 것이 큰 ID를 갖게 함)
        const { data: insights, error } = await supabase
            .from('student_insights')
            .select('id, student_pid')
            .eq('insight_type', 'omni')
            .order('id', { ascending: true });

        if (error) throw error;

        const groups = {};
        insights.forEach(item => {
            if (!groups[item.student_pid]) groups[item.student_pid] = [];
            groups[item.student_pid].push(item.id);
        });

        const idsToDelete = [];
        let duplicateCount = 0;

        for (const pid in groups) {
            const ids = groups[pid];
            if (ids.length > 1) {
                // 마지막 하나(가장 최신)만 남기고 나머지 ID 추출
                const toDelete = ids.slice(0, ids.length - 1);
                idsToDelete.push(...toDelete);
                duplicateCount++;
            }
        }

        if (idsToDelete.length === 0) {
            console.log("✅ 정리할 중복 데이터가 없습니다.");
            return;
        }

        console.log(`⚠️ 총 ${duplicateCount}명의 학생으로부터 ${idsToDelete.length}개의 중복 데이터를 삭제합니다...`);

        // Supabase 삭제 (ID 리스트로 한 번에 삭제)
        // Note: 너무 많으면 나눠서 삭제해야 할 수도 있으나, 현재 인원이 적으므로 한 번에 진행
        const { error: deleteError } = await supabase
            .from('student_insights')
            .delete()
            .in('id', idsToDelete);

        if (deleteError) throw deleteError;

        console.log(`\n✨ 정리 완료! ${idsToDelete.length}개의 이전 분석 내역을 삭제하고 최신 기록만 남겼습니다.`);

    } catch (e) {
        console.error('❌ 정리 중 오류 발생:', e);
    }
}

cleanupDuplicates();
