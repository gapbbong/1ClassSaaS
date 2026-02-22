import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// ESM 환경에서 __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. 초기 설정
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PHOTO_DIR = path.resolve(__dirname, process.env.PHOTO_DIR || './25 학생 사진');
const ACADEMIC_YEAR = process.env.ACADEMIC_YEAR || '2025';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateLocalPhotos() {
    console.log('🚀 로컬 사진 마이그레이션 시작 (ESM 버전)...');
    console.log(`📂 대상 폴더: ${PHOTO_DIR}`);

    if (!fs.existsSync(PHOTO_DIR)) {
        console.error('❌ 폴더를 찾을 수 없습니다. 경로를 확인해 주세요.');
        return;
    }

    try {
        // 0. 스토리지 버킷 존재 여부 확인 및 생성
        console.log('📦 스토리지 버킷 확인 중...');
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets.find(b => b.name === 'student-photos');

        if (!bucketExists) {
            console.log('🆕 [student-photos] 버킷이 없어 새로 생성합니다...');
            const { error: createError } = await supabase.storage.createBucket('student-photos', {
                public: true,
                fileSizeLimit: 52428800 // 50MB
            });
            if (createError) throw createError;
            console.log('✅ 버킷 생성 완료!');
        }

        // 1. 폴더 내 파일 목록 가져오기
        const files = fs.readdirSync(PHOTO_DIR).filter(file =>
            ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase())
        );

        if (files.length === 0) {
            console.log('📭 이관할 사진 파일이 없습니다.');
            return;
        }

        console.log(`📸 총 ${files.length}장의 사진을 발견했습니다.`);

        for (const file of files) {
            const filePath = path.join(PHOTO_DIR, file);
            const studentId = path.parse(file).name; // 파일명(학번) 추출

            try {
                console.log(`⌛ [${studentId}] 업로드 중 (원본 크기 유지)...`);

                // 2. 이미지 최적화 (사용자 요청: 원본 크기 유지, 고품질)
                // sharp를 쓰지 않고 fs.readFileSync로 바로 올려도 되지만, 
                // 포맷 통일이나 메타데이터 정리를 위해 품질 95%로 처리합니다.
                const optimizedBuffer = await sharp(filePath)
                    .jpeg({ quality: 95 })
                    .toBuffer();

                // 3. Supabase Storage 업로드
                const storagePath = `${ACADEMIC_YEAR}/${file}`;
                const { data, error: uploadError } = await supabase.storage
                    .from('student-photos')
                    .upload(storagePath, optimizedBuffer, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // 4. 공용 URL 생성
                const { data: { publicUrl } } = supabase.storage
                    .from('student-photos')
                    .getPublicUrl(storagePath);

                // 5. DB 업데이트 (students 테이블의 photo_url 컬럼)
                const { error: dbError } = await supabase
                    .from('students')
                    .update({ photo_url: publicUrl })
                    .eq('student_id', studentId);

                if (dbError) {
                    console.warn(`⚠️ [${studentId}] DB 업데이트 실패 (학번 확인 필요):`, dbError.message);
                } else {
                    console.log(`✅ [${studentId}] 이관 및 DB 연결 성공!`);
                }

            } catch (err) {
                console.error(`❌ [${file}] 처리 중 에러:`, err.message);
            }
        }

        console.log('\n✨ 모든 작업이 완료되었습니다!');

    } catch (err) {
        console.error('🔥 마이그레이션 중단:', err.message);
    }
}

migrateLocalPhotos();
