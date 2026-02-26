import fs from 'fs';

function testParser() {
    const rawData = fs.readFileSync('freshmen_2026_raw.txt', 'utf-8');
    const lines = rawData.split('\n');
    let count = 0;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const match = line.match(/^1학년\s+([^\t\n\r]+)\s+(\d+)\s+(\d+)\s+([\s\S]+?)\s+(\d{4}\.\d{2}\.\d{2}\.)\s+([남여])/);

        if (match) {
            const [_, dept, classNum, sNum, name, birth, gender] = match;
            const student_id = `1${classNum}${sNum.padStart(2, '0')}`;
            const formattedBirth = birth.replace(/\./g, '-').replace(/-$/, '');

            count++;
            if (count <= 3 || count >= 130) {
                console.log(`Parsed [${count}]: ${student_id} | ${name.trim()} | ${formattedBirth} | ${gender}`);
            }
        } else {
            console.warn("FAILED Match:", line);
        }
    }
    console.log(`\nTotal Parsed: ${count}`);
}

testParser();
