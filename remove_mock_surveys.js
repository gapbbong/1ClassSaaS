import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function removeMockSurveys() {
    console.log("🚀 테스트용 학생 기초조사서 삭제 시작...");

    try {
        // 1. 학생폰 번호가 '010-1111-2222'인 테스트 설문지 찾기
        const { data: mockSurveys, error: fetchError } = await supabase
            .from('surveys')
            .select('id, student_pid')
            .eq('data->>학생폰', '010-1111-2222');

        if (fetchError) throw fetchError;

        if (!mockSurveys || mockSurveys.length === 0) {
            console.log("❌ 삭제할 테스트 데이터(학생폰 '010-1111-2222')가 없습니다.");
            return;
        }

        console.log(`✅ 총 ${mockSurveys.length}개의 테스트 설문 데이터를 발견했습니다. 삭제를 진행합니다.`);

        const idsToDelete = mockSurveys.map(s => s.id);
        const pidsToDelete = mockSurveys.map(s => s.student_pid);

        // 2. 해당 기초조사 삭제
        const { error: deleteSurveysError } = await supabase
            .from('surveys')
            .delete()
            .in('id', idsToDelete);

        if (deleteSurveysError) throw deleteSurveysError;

        // 3. (선택) 테스트로 돌려진 AI 분석 결과도 삭제 (insight_type='omni' 이면서 해당 pid인 것)
        if (pidsToDelete.length > 0) {
            const { error: deleteInsightsError } = await supabase
                .from('student_insights')
                .delete()
                .eq('insight_type', 'omni')
                .in('student_pid', pidsToDelete);

            if (deleteInsightsError) {
                console.warn("⚠️ 테스트용 AI 분석 결과 삭제 중 일부 오류 발생 (혹은 이미 없을 수 있음):", deleteInsightsError.message);
            } else {
                console.log("✅ 연관된 테스트용 AI 분석(student_insights)도 함께 삭제 완료.");
            }
        }

        console.log("\n🎉 성공적으로 모든 테스트 기초조사서 및 분석 데이터가 삭제되었습니다!");
    } catch (e) {
        console.error("❌ 처리 중 오류 발생:", e);
    }
}

removeMockSurveys();
