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
        // 0. 스토리지 버킷 확인 및 생성
        console.log('📦 스토리지 버킷 확인 중...');
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.find(b => b.name === 'student-photos');

        if (!bucketExists) {
            console.log('🆕 [student-photos] 버킷 생성...');
            const { error: createError } = await supabase.storage.createBucket('student-photos', {
                public: true,
                fileSizeLimit: 52428800
            });
            if (createError) throw createError;
        }

        // 1. 재귀적으로 모든 이미지 파일 찾기
        const allFiles = [];
        const walkSync = (dir) => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    walkSync(filePath);
                } else {
                    const ext = path.extname(file).toLowerCase();
                    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
                        allFiles.push(filePath);
                    }
                }
            });
        };
        walkSync(PHOTO_DIR);

        if (allFiles.length === 0) {
            console.log('📭 이관할 사진 파일이 없습니다.');
            return;
        }

        console.log(`📸 총 ${allFiles.length}장의 사진을 발견했습니다.`);

        for (const filePath of allFiles) {
            const fileName = path.basename(filePath);
            const ext = path.extname(fileName).toLowerCase();

            // 학번 추출: 파일명에서 숫자 4자리를 우선 찾습니다.
            const match = fileName.match(/\d{4,}/);
            if (!match) {
                console.warn(`⚠️ [${fileName}] 학번을 추출할 수 없어 건너뜁니다.`);
                continue;
            }
            const studentId = match[0];

            try {
                console.log(`⌛ [${studentId}] 업로드 중... (${fileName})`);
                const buffer = fs.readFileSync(filePath);

                const optimizedBuffer = await sharp(buffer)
                    .jpeg({ quality: 90 })
                    .toBuffer();

                const storagePath = `${ACADEMIC_YEAR}/${studentId}${ext}`;
                const { error: uploadError } = await supabase.storage
                    .from('student-photos')
                    .upload(storagePath, optimizedBuffer, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('student-photos')
                    .getPublicUrl(storagePath);

                // DB 업데이트
                const { error: dbError } = await supabase
                    .from('students')
                    .update({ photo_url: publicUrl })
                    .eq('student_id', studentId)
                    .eq('academic_year', ACADEMIC_YEAR);

                if (dbError) {
                    console.warn(`⚠️ [${studentId}] DB 업데이트 실패:`, dbError.message);
                } else {
                    console.log(`✅ [${studentId}] 이관 성공!`);
                }
            } catch (err) {
                console.error(`❌ [${fileName}] 처리 중 에러:`, err.message);
            }
        }

        console.log('\n✨ 모든 작업이 완료되었습니다!');

    } catch (err) {
        console.error('🔥 마이그레이션 중단:', err.message);
    }
}

migrateLocalPhotos();
