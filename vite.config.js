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
        class_analysis: resolve(__dirname, 'class-analysis.html')
      }
    }
  },
  server: {
    open: true
  }
});
