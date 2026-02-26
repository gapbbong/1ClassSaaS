import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2026 -> 2025 복구용 매핑 데이터 (모두 합침)
const promotionTo2nd = [
    { name: "고광민", newGrade: 2, newClass: 1, newNum: 1, oldGrade: 1, oldClass: 2, oldNum: 1 },
    { name: "김용록", newGrade: 2, newClass: 1, newNum: 2, oldGrade: 1, oldClass: 1, oldNum: 3 },
    { name: "김민혁", newGrade: 2, newClass: 1, newNum: 3, oldGrade: 1, oldClass: 3, oldNum: 4 },
    { name: "김솔하", newGrade: 2, newClass: 1, newNum: 4, oldGrade: 1, oldClass: 1, oldNum: 5 },
    { name: "김준혁", newGrade: 2, newClass: 1, newNum: 5, oldGrade: 1, oldClass: 1, oldNum: 6 },
    { name: "김현우", newGrade: 2, newClass: 1, newNum: 6, oldGrade: 1, oldClass: 2, oldNum: 7 },
    { name: "박성현", newGrade: 2, newClass: 1, newNum: 7, oldGrade: 1, oldClass: 2, oldNum: 8 },
    { name: "성재원", newGrade: 2, newClass: 1, newNum: 8, oldGrade: 1, oldClass: 2, oldNum: 9 },
    { name: "신지후", newGrade: 2, newClass: 1, newNum: 9, oldGrade: 1, oldClass: 2, oldNum: 12 },
    { name: "안지환", newGrade: 2, newClass: 1, newNum: 10, oldGrade: 1, oldClass: 1, oldNum: 9 },
    { name: "이지현", newGrade: 2, newClass: 1, newNum: 11, oldGrade: 1, oldClass: 1, oldNum: 11 },
    { name: "임채민", newGrade: 2, newClass: 1, newNum: 12, oldGrade: 1, oldClass: 3, oldNum: 13 },
    { name: "전병필", newGrade: 2, newClass: 1, newNum: 13, oldGrade: 1, oldClass: 1, oldNum: 12 },
    { name: "전민영", newGrade: 2, newClass: 1, newNum: 14, oldGrade: 1, oldClass: 3, oldNum: 15 },
    { name: "최지우", newGrade: 2, newClass: 1, newNum: 15, oldGrade: 1, oldClass: 3, oldNum: 16 },
    { name: "최지우", newGrade: 2, newClass: 1, newNum: 16, oldGrade: 1, oldClass: 1, oldNum: 13 },
    { name: "김현승", newGrade: 2, newClass: 1, newNum: 17, oldGrade: 1, oldClass: 1, oldNum: 14 },
    { name: "주태평", newGrade: 2, newClass: 1, newNum: 18, oldGrade: 1, oldClass: 1, oldNum: 16 },
    { name: "하관", newGrade: 2, newClass: 1, newNum: 19, oldGrade: 1, oldClass: 1, oldNum: 20 },
    { name: "EBRAHIM RANALLAI", newGrade: 2, newClass: 2, newNum: 1, oldGrade: 1, oldClass: 1, oldNum: 1 },
    { name: "강태현", newGrade: 2, newClass: 2, newNum: 2, oldGrade: 1, oldClass: 1, oldNum: 2 },
    { name: "고현호", newGrade: 2, newClass: 2, newNum: 3, oldGrade: 1, oldClass: 3, oldNum: 1 },
    { name: "김우빈", newGrade: 2, newClass: 2, newNum: 4, oldGrade: 1, oldClass: 2, oldNum: 2 },
    { name: "김재완", newGrade: 2, newClass: 2, newNum: 5, oldGrade: 1, oldClass: 2, oldNum: 5 },
    { name: "김준혁", newGrade: 2, newClass: 2, newNum: 6, oldGrade: 1, oldClass: 3, oldNum: 5 },
    { name: "윤재민", newGrade: 2, newClass: 2, newNum: 7, oldGrade: 1, oldClass: 2, oldNum: 7 },
    { name: "박지훈", newGrade: 2, newClass: 2, newNum: 8, oldGrade: 1, oldClass: 2, oldNum: 8 },
    { name: "윤희정", newGrade: 2, newClass: 2, newNum: 9, oldGrade: 1, oldClass: 3, oldNum: 11 },
    { name: "이상빈", newGrade: 2, newClass: 2, newNum: 10, oldGrade: 1, oldClass: 1, oldNum: 10 },
    { name: "이채민", newGrade: 2, newClass: 2, newNum: 11, oldGrade: 1, oldClass: 3, oldNum: 14 },
    { name: "임현욱", newGrade: 2, newClass: 2, newNum: 12, oldGrade: 1, oldClass: 3, oldNum: 14 },
    { name: "전현욱", newGrade: 2, newClass: 2, newNum: 13, oldGrade: 1, oldClass: 3, oldNum: 15 },
    { name: "한유준", newGrade: 2, newClass: 2, newNum: 14, oldGrade: 1, oldClass: 3, oldNum: 16 },
    { name: "조서현", newGrade: 2, newClass: 2, newNum: 15, oldGrade: 1, oldClass: 3, oldNum: 18 },
    { name: "조재민", newGrade: 2, newClass: 2, newNum: 16, oldGrade: 1, oldClass: 1, oldNum: 15 },
    { name: "최동진", newGrade: 2, newClass: 2, newNum: 17, oldGrade: 1, oldClass: 1, oldNum: 18 },
    { name: "한서준", newGrade: 2, newClass: 2, newNum: 18, oldGrade: 1, oldClass: 1, oldNum: 19 },
    { name: "김건우", newGrade: 2, newClass: 3, newNum: 1, oldGrade: 1, oldClass: 3, oldNum: 2 },
    { name: "김민준", newGrade: 2, newClass: 3, newNum: 2, oldGrade: 1, oldClass: 1, oldNum: 4 },
    { name: "김범서", newGrade: 2, newClass: 3, newNum: 3, oldGrade: 1, oldClass: 2, oldNum: 3 },
    { name: "김성현", newGrade: 2, newClass: 3, newNum: 4, oldGrade: 1, oldClass: 2, oldNum: 4 },
    { name: "김우주", newGrade: 2, newClass: 3, newNum: 5, oldGrade: 1, oldClass: 3, oldNum: 5 },
    { name: "박예준", newGrade: 2, newClass: 3, newNum: 6, oldGrade: 1, oldClass: 1, oldNum: 7 },
    { name: "서범열", newGrade: 2, newClass: 3, newNum: 7, oldGrade: 1, oldClass: 1, oldNum: 8 },
    { name: "신현우", newGrade: 2, newClass: 3, newNum: 8, oldGrade: 1, oldClass: 2, oldNum: 10 },
    { name: "신경준", newGrade: 2, newClass: 3, newNum: 9, oldGrade: 1, oldClass: 3, oldNum: 10 },
    { name: "이서윤", newGrade: 2, newClass: 3, newNum: 10, oldGrade: 1, oldClass: 2, oldNum: 13 },
    { name: "이준석", newGrade: 2, newClass: 3, newNum: 11, oldGrade: 1, oldClass: 3, oldNum: 12 },
    { name: "이준석", newGrade: 2, newClass: 3, newNum: 12, oldGrade: 1, oldClass: 3, oldNum: 17 },
    { name: "임지원", newGrade: 2, newClass: 3, newNum: 13, oldGrade: 1, oldClass: 2, oldNum: 17 },
    { name: "주현우", newGrade: 2, newClass: 3, newNum: 14, oldGrade: 1, oldClass: 1, oldNum: 17 },
    { name: "최민혁", newGrade: 2, newClass: 3, newNum: 15, oldGrade: 1, oldClass: 2, oldNum: 18 },
    { name: "최현수", newGrade: 2, newClass: 3, newNum: 16, oldGrade: 1, oldClass: 3, oldNum: 19 },
    { name: "황보빈", newGrade: 2, newClass: 3, newNum: 17, oldGrade: 1, oldClass: 1, oldNum: 19 },
    { name: "강민성", newGrade: 2, newClass: 4, newNum: 1, oldGrade: 1, oldClass: 4, oldNum: 1 },
    { name: "강병윤", newGrade: 2, newClass: 4, newNum: 2, oldGrade: 1, oldClass: 6, oldNum: 1 },
    { name: "공성민", newGrade: 2, newClass: 4, newNum: 3, oldGrade: 1, oldClass: 5, oldNum: 3 },
    { name: "김도원", newGrade: 2, newClass: 4, newNum: 4, oldGrade: 1, oldClass: 6, oldNum: 3 },
    { name: "김동혁", newGrade: 2, newClass: 4, newNum: 5, oldGrade: 1, oldClass: 4, oldNum: 3 },
    { name: "김동헌", newGrade: 2, newClass: 4, newNum: 6, oldGrade: 1, oldClass: 6, oldNum: 4 },
    { name: "김영준", newGrade: 2, newClass: 4, newNum: 7, oldGrade: 1, oldClass: 5, oldNum: 5 },
    { name: "김현호", newGrade: 2, newClass: 4, newNum: 8, oldGrade: 1, oldClass: 6, oldNum: 7 },
    { name: "배원빈", newGrade: 2, newClass: 4, newNum: 9, oldGrade: 1, oldClass: 4, oldNum: 10 },
    { name: "배지민", newGrade: 2, newClass: 4, newNum: 10, oldGrade: 1, oldClass: 4, oldNum: 11 },
    { name: "안우진", newGrade: 2, newClass: 4, newNum: 11, oldGrade: 1, oldClass: 4, oldNum: 8 },
    { name: "이수호", newGrade: 2, newClass: 4, newNum: 12, oldGrade: 1, oldClass: 4, oldNum: 18 },
    { name: "이예찬", newGrade: 2, newClass: 4, newNum: 13, oldGrade: 1, oldClass: 4, oldNum: 19 },
    { name: "이찬준", newGrade: 2, newClass: 4, newNum: 14, oldGrade: 1, oldClass: 6, oldNum: 15 },
    { name: "장예찬", newGrade: 2, newClass: 4, newNum: 15, oldGrade: 1, oldClass: 5, oldNum: 15 },
    { name: "김민재", newGrade: 2, newClass: 5, newNum: 1, oldGrade: 1, oldClass: 5, oldNum: 5 },
    { name: "김예빈", newGrade: 2, newClass: 5, newNum: 2, oldGrade: 1, oldClass: 6, oldNum: 5 },
    { name: "김재원", newGrade: 2, newClass: 5, newNum: 3, oldGrade: 1, oldClass: 5, oldNum: 8 },
    { name: "김태윤", newGrade: 2, newClass: 5, newNum: 4, oldGrade: 1, oldClass: 5, oldNum: 9 },
    { name: "박기태", newGrade: 2, newClass: 5, newNum: 5, oldGrade: 1, oldClass: 6, oldNum: 10 },
    { name: "박지율", newGrade: 2, newClass: 5, newNum: 6, oldGrade: 1, oldClass: 4, oldNum: 9 },
    { name: "박태현", newGrade: 2, newClass: 5, newNum: 7, oldGrade: 1, oldClass: 5, oldNum: 11 },
    { name: "손윤후", newGrade: 2, newClass: 5, newNum: 8, oldGrade: 1, oldClass: 6, oldNum: 11 },
    { name: "손지후", newGrade: 2, newClass: 5, newNum: 9, oldGrade: 1, oldClass: 4, oldNum: 12 },
    { name: "오선용", newGrade: 2, newClass: 5, newNum: 10, oldGrade: 1, oldClass: 4, oldNum: 14 },
    { name: "오윤호", newGrade: 2, newClass: 5, newNum: 11, oldGrade: 1, oldClass: 5, oldNum: 15 },
    { name: "우주", newGrade: 2, newClass: 5, newNum: 12, oldGrade: 1, oldClass: 5, oldNum: 13 },
    { name: "이태헌", newGrade: 2, newClass: 5, newNum: 13, oldGrade: 1, oldClass: 6, oldNum: 16 },
    { name: "전지후", newGrade: 2, newClass: 5, newNum: 14, oldGrade: 1, oldClass: 6, oldNum: 18 },
    { name: "정효민", newGrade: 2, newClass: 5, newNum: 15, oldGrade: 1, oldClass: 4, oldNum: 20 },
    { name: "조준호", newGrade: 2, newClass: 5, newNum: 16, oldGrade: 1, oldClass: 5, oldNum: 17 },
    { name: "강태윤", newGrade: 2, newClass: 6, newNum: 1, oldGrade: 1, oldClass: 5, oldNum: 2 },
    { name: "김민준", newGrade: 2, newClass: 6, newNum: 2, oldGrade: 1, oldClass: 5, oldNum: 4 },
    { name: "권수지", newGrade: 2, newClass: 6, newNum: 3, oldGrade: 1, oldClass: 5, oldNum: 21 },
    { name: "권태리", newGrade: 2, newClass: 6, newNum: 4, oldGrade: 1, oldClass: 6, oldNum: 2 },
    { name: "김상윤", newGrade: 2, newClass: 6, newNum: 5, oldGrade: 1, oldClass: 4, oldNum: 5 },
    { name: "남현서", newGrade: 2, newClass: 6, newNum: 6, oldGrade: 1, oldClass: 6, oldNum: 8 },
    { name: "문주영", newGrade: 2, newClass: 6, newNum: 7, oldGrade: 1, oldClass: 6, oldNum: 9 },
    { name: "박기태", newGrade: 2, newClass: 6, newNum: 8, oldGrade: 1, oldClass: 5, oldNum: 10 },
    { name: "배재진", newGrade: 2, newClass: 6, newNum: 9, oldGrade: 1, oldClass: 5, oldNum: 12 },
    { name: "양민헌", newGrade: 2, newClass: 6, newNum: 10, oldGrade: 1, oldClass: 6, oldNum: 12 },
    { name: "오선준", newGrade: 2, newClass: 6, newNum: 11, oldGrade: 1, oldClass: 6, oldNum: 13 },
    { name: "윤다원", newGrade: 2, newClass: 6, newNum: 12, oldGrade: 1, oldClass: 5, oldNum: 14 },
    { name: "류영빈", newGrade: 2, newClass: 6, newNum: 13, oldGrade: 1, oldClass: 4, oldNum: 17 },
    { name: "이유진", newGrade: 2, newClass: 6, newNum: 14, oldGrade: 1, oldClass: 6, oldNum: 14 },
    { name: "장원호", newGrade: 2, newClass: 6, newNum: 15, oldGrade: 1, oldClass: 6, oldNum: 19 },
    { name: "현재윤", newGrade: 2, newClass: 6, newNum: 16, oldGrade: 1, oldClass: 5, oldNum: 18 },
    { name: "최지훈", newGrade: 2, newClass: 6, newNum: 17, oldGrade: 1, oldClass: 5, oldNum: 19 }
];

const promotionTo3rd = [
    { name: "김현수", newGrade: 3, newClass: 1, newNum: 1, oldGrade: 2, oldClass: 1, oldNum: 1 },
    { name: "남강현", newGrade: 3, newClass: 1, newNum: 2, oldGrade: 2, oldClass: 1, oldNum: 2 },
    { name: "박영재", newGrade: 3, newClass: 1, newNum: 3, oldGrade: 2, oldClass: 1, oldNum: 3 },
    { name: "박우주", newGrade: 3, newClass: 1, newNum: 4, oldGrade: 2, oldClass: 1, oldNum: 4 },
    { name: "박태용", newGrade: 3, newClass: 1, newNum: 5, oldGrade: 2, oldClass: 1, oldNum: 5 },
    { name: "백건우", newGrade: 3, newClass: 1, newNum: 6, oldGrade: 2, oldClass: 1, oldNum: 6 },
    { name: "심호영", newGrade: 3, newClass: 1, newNum: 7, oldGrade: 2, oldClass: 1, oldNum: 8 },
    { name: "이우성", newGrade: 3, newClass: 1, newNum: 8, oldGrade: 2, oldClass: 1, oldNum: 9 },
    { name: "이지백", newGrade: 3, newClass: 1, newNum: 9, oldGrade: 2, oldClass: 1, oldNum: 10 },
    { name: "정규민", newGrade: 3, newClass: 1, newNum: 10, oldGrade: 2, oldClass: 1, oldNum: 11 },
    { name: "진정한", newGrade: 3, newClass: 1, newNum: 11, oldGrade: 2, oldClass: 1, oldNum: 12 },
    { name: "최진혁", newGrade: 3, newClass: 1, newNum: 12, oldGrade: 2, oldClass: 1, oldNum: 13 },
    { name: "김산", newGrade: 3, newClass: 2, newNum: 1, oldGrade: 2, oldClass: 2, oldNum: 1 },
    { name: "김시준", newGrade: 3, newClass: 2, newNum: 2, oldGrade: 2, oldClass: 2, oldNum: 2 },
    { name: "김지현", newGrade: 3, newClass: 2, newNum: 3, oldGrade: 2, oldClass: 2, oldNum: 3 },
    { name: "김진현", newGrade: 3, newClass: 2, newNum: 4, oldGrade: 2, oldClass: 2, oldNum: 4 },
    { name: "김태원", newGrade: 3, newClass: 2, newNum: 5, oldGrade: 2, oldClass: 2, oldNum: 5 },
    { name: "김하율", newGrade: 3, newClass: 2, newNum: 6, oldGrade: 2, oldClass: 2, oldNum: 6 },
    { name: "김하진", newGrade: 3, newClass: 2, newNum: 7, oldGrade: 2, oldClass: 2, oldNum: 7 },
    { name: "문채린", newGrade: 3, newClass: 2, newNum: 8, oldGrade: 2, oldClass: 2, oldNum: 8 },
    { name: "박고영", newGrade: 3, newClass: 2, newNum: 9, oldGrade: 2, oldClass: 2, oldNum: 9 },
    { name: "박상규", newGrade: 3, newClass: 2, newNum: 10, oldGrade: 2, oldClass: 2, oldNum: 10 },
    { name: "배은찬", newGrade: 3, newClass: 2, newNum: 11, oldGrade: 2, oldClass: 2, oldNum: 11 },
    { name: "백승준", newGrade: 3, newClass: 2, newNum: 12, oldGrade: 2, oldClass: 2, oldNum: 12 },
    { name: "손민준", newGrade: 3, newClass: 2, newNum: 13, oldGrade: 2, oldClass: 2, oldNum: 13 },
    { name: "이도형", newGrade: 3, newClass: 2, newNum: 14, oldGrade: 2, oldClass: 2, oldNum: 14 },
    { name: "이영준", newGrade: 3, newClass: 2, newNum: 15, oldGrade: 2, oldClass: 2, oldNum: 15 },
    { name: "이채율", newGrade: 3, newClass: 2, newNum: 16, oldGrade: 2, oldClass: 2, oldNum: 16 },
    { name: "이지연", newGrade: 3, newClass: 2, newNum: 17, oldGrade: 2, oldClass: 2, oldNum: 17 },
    { name: "정다은", newGrade: 3, newClass: 2, newNum: 18, oldGrade: 2, oldClass: 2, oldNum: 18 },
    { name: "정원석", newGrade: 3, newClass: 2, newNum: 19, oldGrade: 2, oldClass: 2, oldNum: 19 },
    { name: "HAN PANGWEN", newGrade: 3, newClass: 3, newNum: 1, oldGrade: 2, oldClass: 3, oldNum: 1 },
    { name: "김범석", newGrade: 3, newClass: 3, newNum: 2, oldGrade: 2, oldClass: 3, oldNum: 3 },
    { name: "김시율", newGrade: 3, newClass: 3, newNum: 3, oldGrade: 2, oldClass: 3, oldNum: 4 },
    { name: "김어진", newGrade: 3, newClass: 3, newNum: 4, oldGrade: 2, oldClass: 3, oldNum: 5 },
    { name: "김현준", newGrade: 3, newClass: 3, newNum: 5, oldGrade: 2, oldClass: 3, oldNum: 6 },
    { name: "문승민", newGrade: 3, newClass: 3, newNum: 6, oldGrade: 2, oldClass: 3, oldNum: 7 },
    { name: "박동현", newGrade: 3, newClass: 3, newNum: 7, oldGrade: 2, oldClass: 3, oldNum: 8 },
    { name: "박준배", newGrade: 3, newClass: 3, newNum: 8, oldGrade: 2, oldClass: 3, oldNum: 9 },
    { name: "손민영", newGrade: 3, newClass: 3, newNum: 9, oldGrade: 2, oldClass: 1, oldNum: 7 },
    { name: "이종혁", newGrade: 3, newClass: 3, newNum: 10, oldGrade: 2, oldClass: 3, oldNum: 10 },
    { name: "유수민", newGrade: 3, newClass: 3, newNum: 11, oldGrade: 2, oldClass: 3, oldNum: 11 },
    { name: "이은서", newGrade: 3, newClass: 3, newNum: 12, oldGrade: 2, oldClass: 3, oldNum: 13 },
    { name: "장우찬", newGrade: 3, newClass: 3, newNum: 13, oldGrade: 2, oldClass: 3, oldNum: 14 },
    { name: "정성희", newGrade: 3, newClass: 3, newNum: 14, oldGrade: 2, oldClass: 3, oldNum: 15 },
    { name: "최강", newGrade: 3, newClass: 3, newNum: 15, oldGrade: 2, oldClass: 3, oldNum: 16 },
    { name: "양서진", newGrade: 3, newClass: 4, newNum: 1, oldGrade: 2, oldClass: 4, oldNum: 1 },
    { name: "강선", newGrade: 3, newClass: 4, newNum: 2, oldGrade: 2, oldClass: 4, oldNum: 2 },
    { name: "김민준", newGrade: 3, newClass: 4, newNum: 3, oldGrade: 2, oldClass: 4, oldNum: 3 },
    { name: "김서영", newGrade: 3, newClass: 4, newNum: 4, oldGrade: 2, oldClass: 4, oldNum: 4 },
    { name: "김서율", newGrade: 3, newClass: 4, newNum: 5, oldGrade: 2, oldClass: 4, oldNum: 5 },
    { name: "남한진", newGrade: 3, newClass: 4, newNum: 6, oldGrade: 2, oldClass: 4, oldNum: 20 },
    { name: "노민규", newGrade: 3, newClass: 4, newNum: 7, oldGrade: 2, oldClass: 4, oldNum: 6 },
    { name: "박인혁", newGrade: 3, newClass: 4, newNum: 8, oldGrade: 2, oldClass: 4, oldNum: 7 },
    { name: "박승호", newGrade: 3, newClass: 4, newNum: 9, oldGrade: 2, oldClass: 4, oldNum: 8 },
    { name: "배건우", newGrade: 3, newClass: 4, newNum: 10, oldGrade: 2, oldClass: 4, oldNum: 9 },
    { name: "배유진", newGrade: 3, newClass: 4, newNum: 11, oldGrade: 2, oldClass: 4, oldNum: 10 },
    { name: "송유찬", newGrade: 3, newClass: 4, newNum: 12, oldGrade: 2, oldClass: 4, oldNum: 11 },
    { name: "신지유", newGrade: 3, newClass: 4, newNum: 13, oldGrade: 2, oldClass: 4, oldNum: 12 },
    { name: "안준식", newGrade: 3, newClass: 4, newNum: 14, oldGrade: 2, oldClass: 4, oldNum: 13 },
    { name: "이용민", newGrade: 3, newClass: 4, newNum: 15, oldGrade: 2, oldClass: 4, oldNum: 14 },
    { name: "이유준", newGrade: 3, newClass: 4, newNum: 16, oldGrade: 2, oldClass: 4, oldNum: 15 },
    { name: "임도현", newGrade: 3, newClass: 4, newNum: 17, oldGrade: 2, oldClass: 4, oldNum: 16 },
    { name: "지유찬", newGrade: 3, newClass: 4, newNum: 18, oldGrade: 2, oldClass: 4, oldNum: 17 },
    { name: "한승빈", newGrade: 3, newClass: 4, newNum: 19, oldGrade: 2, oldClass: 4, oldNum: 18 },
    { name: "황동호", newGrade: 3, newClass: 4, newNum: 20, oldGrade: 2, oldClass: 4, oldNum: 19 },
    { name: "강시환", newGrade: 3, newClass: 5, newNum: 1, oldGrade: 2, oldClass: 6, oldNum: 1 },
    { name: "김우찬", newGrade: 3, newClass: 5, newNum: 2, oldGrade: 2, oldClass: 6, oldNum: 5 },
    { name: "김주원", newGrade: 3, newClass: 5, newNum: 3, oldGrade: 2, oldClass: 6, oldNum: 6 },
    { name: "박건하", newGrade: 3, newClass: 5, newNum: 4, oldGrade: 2, oldClass: 5, oldNum: 4 },
    { name: "박건우", newGrade: 3, newClass: 5, newNum: 5, oldGrade: 2, oldClass: 6, oldNum: 7 },
    { name: "박태율", newGrade: 3, newClass: 5, newNum: 6, oldGrade: 2, oldClass: 6, oldNum: 8 },
    { name: "배자민", newGrade: 3, newClass: 5, newNum: 7, oldGrade: 2, oldClass: 6, oldNum: 10 },
    { name: "송시창", newGrade: 3, newClass: 5, newNum: 8, oldGrade: 2, oldClass: 6, oldNum: 12 },
    { name: "심유공", newGrade: 3, newClass: 5, newNum: 9, oldGrade: 2, oldClass: 5, oldNum: 7 },
    { name: "양준헌", newGrade: 3, newClass: 5, newNum: 10, oldGrade: 2, oldClass: 6, oldNum: 13 },
    { name: "이도윤", newGrade: 3, newClass: 5, newNum: 11, oldGrade: 2, oldClass: 6, oldNum: 14 },
    { name: "이유후", newGrade: 3, newClass: 5, newNum: 12, oldGrade: 2, oldClass: 5, oldNum: 11 },
    { name: "이지호", newGrade: 3, newClass: 5, newNum: 13, oldGrade: 2, oldClass: 5, oldNum: 12 },
    { name: "전보민", newGrade: 3, newClass: 5, newNum: 14, oldGrade: 2, oldClass: 6, oldNum: 16 },
    { name: "장하윤", newGrade: 3, newClass: 5, newNum: 15, oldGrade: 2, oldClass: 5, oldNum: 15 },
    { name: "최민준", newGrade: 3, newClass: 5, newNum: 16, oldGrade: 2, oldClass: 6, oldNum: 17 },
    { name: "황치현", newGrade: 3, newClass: 5, newNum: 17, oldGrade: 2, oldClass: 5, oldNum: 18 },
    { name: "김다희", newGrade: 3, newClass: 6, newNum: 1, oldGrade: 2, oldClass: 5, oldNum: 1 },
    { name: "김서환", newGrade: 3, newClass: 6, newNum: 2, oldGrade: 2, oldClass: 6, oldNum: 4 },
    { name: "김유린", newGrade: 3, newClass: 6, newNum: 3, oldGrade: 2, oldClass: 5, oldNum: 2 },
    { name: "박지웅", newGrade: 3, newClass: 6, newNum: 4, oldGrade: 2, oldClass: 5, oldNum: 5 },
    { name: "박지헌", newGrade: 3, newClass: 6, newNum: 5, oldGrade: 2, oldClass: 6, oldNum: 9 },
    { name: "박현희", newGrade: 3, newClass: 6, newNum: 6, oldGrade: 2, oldClass: 5, oldNum: 6 },
    { name: "배지영", newGrade: 3, newClass: 6, newNum: 7, oldGrade: 2, oldClass: 6, oldNum: 11 },
    { name: "송지성", newGrade: 3, newClass: 6, newNum: 8, oldGrade: 2, oldClass: 5, oldNum: 8 },
    { name: "이동호", newGrade: 3, newClass: 6, newNum: 9, oldGrade: 2, oldClass: 5, oldNum: 9 },
    { name: "이승준", newGrade: 3, newClass: 6, newNum: 10, oldGrade: 2, oldClass: 5, oldNum: 19 },
    { name: "이용재", newGrade: 3, newClass: 6, newNum: 11, oldGrade: 2, oldClass: 5, oldNum: 10 },
    { name: "이한결", newGrade: 3, newClass: 6, newNum: 12, oldGrade: 2, oldClass: 5, oldNum: 13 },
    { name: "이희성", newGrade: 3, newClass: 6, newNum: 13, oldGrade: 2, oldClass: 6, oldNum: 15 },
    { name: "전민지", newGrade: 3, newClass: 6, newNum: 14, oldGrade: 2, oldClass: 5, oldNum: 14 },
    { name: "조한승", newGrade: 3, newClass: 6, newNum: 15, oldGrade: 2, oldClass: 5, oldNum: 16 },
    { name: "차주원", newGrade: 3, newClass: 6, newNum: 16, oldGrade: 2, oldClass: 5, oldNum: 17 },
    { name: "최서준", newGrade: 3, newClass: 6, newNum: 17, oldGrade: 2, oldClass: 6, oldNum: 18 }
];

async function revertAllTo2025() {
    console.log("🚀 2026학년도 진급 관련 모든 이력 롤백 시작...");

    try {
        // 1. 임시로 삽입한 복원학생 삭제 및 그들의 2026 history 삭제
        console.log("🧹 1. 임시 복구 데이터(복원학생 등) 및 신입생 삭제...");
        await supabase.from('student_history').delete().eq('academic_year', 2026);
        await supabase.from('students').delete().like('name', '복원학생_%');
        await supabase.from('students').delete().eq('academic_year', 2026).like('class_info', '1-%');
        console.log("✅ 임시 복원데이터, 신입생, 2026학년도 student_history 삭제 완료.");

        // 2. 2학년 -> 1학년 및 3학년 -> 2학년 구 학번 롤백
        console.log("🔄 2. 2026학년도로 진급된 2, 3학년의 학번/학급 원상복구...");
        const allPromotions = [...promotionTo2nd, ...promotionTo3rd];
        let revertedCount = 0;

        for (const item of allPromotions) {
            const oldId = `${item.oldGrade}${item.oldClass}${String(item.oldNum).padStart(2, '0')}`;
            const newId = `${item.newGrade}${item.newClass}${String(item.newNum).padStart(2, '0')}`;

            const { error: updateError } = await supabase
                .from('students')
                .update({
                    academic_year: 2025,
                    student_id: oldId,
                    class_info: `${item.oldGrade}-${item.oldClass}`,
                    updated_at: new Date().toISOString()
                })
                .eq('academic_year', 2026) // 현재 2026년으로 된 사람만
                .eq('student_id', newId);

            if (!updateError) revertedCount++;
        }
        console.log(`✅ 총 ${revertedCount}명의 학생 학번/학급/학년도(2025) 복구 완료.`);

        // 3. 졸업 처리(3학년) 취소
        console.log("🔄 3. 2025학년도 3학년 학생의 졸업 상태 취소...");
        const { error: gradError } = await supabase
            .from('students')
            .update({ status: 'active' })
            .eq('academic_year', 2025)
            .like('class_info', '3-%')
            .eq('status', 'graduated');

        if (gradError) console.error("졸업 상태 롤백 중 에러:", gradError.message);
        else console.log("✅ 3학년 학생 졸업 취소 및 active 상태 복구 완료.");

        // 4. 잘못 생성된 2025년도 아카이브 내역 파기
        console.log("🧹 4. 아카이브 내역(2025년 history) 파기...");
        await supabase.from('student_history').delete().eq('academic_year', 2025);
        await supabase.from('teacher_history').delete().eq('academic_year', 2025);
        console.log("✅ 2025학년도 history 데이터 파기 완료.");

        console.log("\n🎉 모든 롤백(진급 전 상태로 되돌리기)이 완료되었습니다!");

    } catch (error) {
        console.error("💥 롤백 중 에러 발생:", error.message);
    }
}

revertAllTo2025();
