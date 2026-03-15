const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const EDUCATION_OFFICES = [
    { name: '동래교육지원청', url: 'https://home.pen.go.kr/dongnae/na/ntt/selectNttList.do?mi=11258&bbsId=3629', baseUrl: 'https://home.pen.go.kr' },
    { name: '북부교육지원청', url: 'https://home.pen.go.kr/bukbu/na/ntt/selectNttList.do?mi=12811&bbsId=3715', baseUrl: 'https://home.pen.go.kr' },
    { name: '남부교육지원청', url: 'https://home.pen.go.kr/nambu/na/ntt/selectNttList.do?mi=11858&bbsId=3840', baseUrl: 'https://home.pen.go.kr' },
    { name: '해운대교육지원청', url: 'https://home.pen.go.kr/haeundae/na/ntt/selectNttList.do?mi=11321&bbsId=4290', baseUrl: 'https://home.pen.go.kr' },
    { name: '서부교육지원청', url: 'https://home.pen.go.kr/seobu/na/ntt/selectNttList.do?mi=9479&bbsId=3602', baseUrl: 'https://home.pen.go.kr' }
];

const DAYS_FILTER = 10;

function parseDate(dateStr) {
    const cleaned = dateStr.trim().replace(/\./g, '-').replace(/-$/, '');
    return new Date(cleaned);
}

function getDaysDiff(dateStr) {
    const noticeDate = parseDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    noticeDate.setHours(0, 0, 0, 0);
    const diffTime = today - noticeDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

async function fetchNotices(office) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(office.url, { waitUntil: 'networkidle2', timeout: 30000 });

        const notices = await page.evaluate((baseUrl) => {
            const rows = document.querySelectorAll('tbody tr');
            const results = [];
            
            rows.forEach(row => {
                const titleEl = row.querySelector('.ta_l a');
                const dateEl = row.querySelector('td:nth-child(4)');
                const writerEl = row.querySelector('td:nth-child(3)');
                
                if (titleEl && dateEl) {
                    const title = titleEl.textContent.trim();
                    const date = dateEl.textContent.trim();
                    const writer = writerEl ? writerEl.textContent.trim() : '';
                    const link = titleEl.getAttribute('href');
                    
                    if (title && date) {
                        results.push({
                            title: title,
                            date: date,
                            writer: writer,
                            link: link ? (link.startsWith('http') ? link : baseUrl + link) : null
                        });
                    }
                }
            });
            
            return results;
        }, office.baseUrl);

        const filteredNotices = notices.map(notice => ({
            ...notice,
            daysAgo: getDaysDiff(notice.date)
        })).filter(notice => notice.daysAgo <= DAYS_FILTER);

        return {
            office: office.name,
            notices: filteredNotices,
            success: true
        };
    } catch (error) {
        console.error(`Error fetching ${office.name}:`, error.message);
        return {
            office: office.name,
            notices: [],
            success: false,
            error: error.message
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

app.get('/api/notices', async (req, res) => {
    try {
        const results = await Promise.all(
            EDUCATION_OFFICES.map(office => fetchNotices(office))
        );
        
        res.json({
            success: true,
            data: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/offices', (req, res) => {
    res.json({
        success: true,
        data: EDUCATION_OFFICES.map(o => ({ name: o.name, url: o.url }))
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/api/notices`);
});
