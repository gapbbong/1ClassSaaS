import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        student: resolve(__dirname, 'stu-list.html'),
        record: resolve(__dirname, 'record.html'),
        search: resolve(__dirname, 'search.html'),
        bulk: resolve(__dirname, 'bulk-record.html'),
        total: resolve(__dirname, 'total-records.html'),
        survey: resolve(__dirname, 'class-survey.html'),
        check_survey: resolve(__dirname, 'check-survey.html'),
        analysis: resolve(__dirname, 'analysis.html'),
        class_analysis: resolve(__dirname, 'class-analysis.html'),
        keeper: resolve(__dirname, 'keeper.html'),
        quiz: resolve(__dirname, 'quiz.html'),
        quiz_start: resolve(__dirname, 'quiz-start.html'),
        index_2025: resolve(__dirname, 'index-2025.html'),
        photo_quiz: resolve(__dirname, 'photo-quiz.html'),
        quiz_photo: resolve(__dirname, 'quiz-photo.html'),
        random_photo: resolve(__dirname, 'random-photo.html'),
        show_one_photo: resolve(__dirname, 'show-one-photo.html'),
        select_range: resolve(__dirname, 'select-range.html'),
        admin: resolve(__dirname, 'admin.html'),
        calendar: resolve(__dirname, 'calendar.html'),
        room_search: resolve(__dirname, 'room-search.html')
      }
    }
  },
  server: {
    host: '127.0.0.1', // 로컬 접속 전용 (외부 침입 방지)
    open: true
  }
});
