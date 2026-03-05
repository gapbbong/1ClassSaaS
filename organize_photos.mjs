import fs from 'fs';
import path from 'path';

const srcDir = 'D:/App/1cl/25 학생 사진/25 학생';
const baseDestDir = 'D:/App/1cl/26 학생 사진/2학년';

async function organize() {
    try {
        if (!fs.existsSync(baseDestDir)) {
            fs.mkdirSync(baseDestDir, { recursive: true });
            console.log(`Created base directory: ${baseDestDir}`);
        }

        const files = fs.readdirSync(srcDir);
        let count = 0;

        files.forEach(filename => {
            // Check for 1st grade students: 1[class][num].jpg (e.g. 1101.jpg)
            if (filename.startsWith('1') && filename.endsWith('.jpg')) {
                const studentId = filename.split('.')[0];
                if (studentId.length === 4) {
                    const classNum = studentId[1];

                    const newId = '2' + studentId.substring(1);
                    const newFilename = newId + '.jpg';
                    const destSubDirName = `2학년${classNum}반`;
                    const destSubDir = path.join(baseDestDir, destSubDirName);

                    if (!fs.existsSync(destSubDir)) {
                        fs.mkdirSync(destSubDir, { recursive: true });
                        console.log(`Created subdirectory: ${destSubDirName}`);
                    }

                    const srcPath = path.join(srcDir, filename);
                    const destPath = path.join(destSubDir, newFilename);

                    fs.copyFileSync(srcPath, destPath);
                    count++;
                }
            }
        });

        console.log(`Successfully copied and organized ${count} photos.`);
    } catch (err) {
        console.error('Error during organization:', err);
    }
}

organize();
