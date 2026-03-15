const EDUCATION_OFFICES = [
    { name: '동래교육지원청', url: 'https://home.pen.go.kr/dongnae/na/ntt/selectNttList.do?mi=11258&bbsId=3629' },
    { name: '북부교육지원청', url: 'https://home.pen.go.kr/bukbu/na/ntt/selectNttList.do?mi=12811&bbsId=3715' },
    { name: '남부교육지원청', url: 'https://home.pen.go.kr/nambu/na/ntt/selectNttList.do?mi=11858&bbsId=3840' },
    { name: '해운대교육지원청', url: 'https://home.pen.go.kr/haeundae/na/ntt/selectNttList.do?mi=11321&bbsId=4290' },
    { name: '서부교육지원청', url: 'https://home.pen.go.kr/seobu/na/ntt/selectNttList.do?mi=9479&bbsId=3602' }
];

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
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

function isWithinDays(dateStr, days) {
    return getDaysDiff(dateStr) <= days;
}

function extractNotices(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const notices = [];
    
    const rows = doc.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const titleEl = row.querySelector('.ta_l a');
        const dateEl = row.querySelector('td:nth-child(4)');
        
        if (titleEl && dateEl) {
            const title = titleEl.textContent.trim();
            const date = dateEl.textContent.trim();
            
            if (title && date) {
                notices.push({
                    title: title,
                    date: date,
                    daysAgo: getDaysDiff(date)
                });
            }
        }
    });
    
    return notices;
}

async function fetchNotices(office) {
    try {
        const response = await fetch(CORS_PROXY + encodeURIComponent(office.url));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const allNotices = extractNotices(html);
        
        const filteredNotices = allNotices.filter(notice => 
            isWithinDays(notice.date, DAYS_FILTER)
        );
        
        return {
            office: office.name,
            notices: filteredNotices,
            success: true
        };
    } catch (error) {
        console.error(`Error fetching ${office.name}:`, error);
        return {
            office: office.name,
            notices: [],
            success: false,
            error: error.message
        };
    }
}

function createNoticeItem(notice) {
    const li = document.createElement('li');
    li.className = 'notice-item' + (notice.daysAgo === 0 ? ' new' : '');
    
    li.innerHTML = `
        <div class="notice-title">
            <a href="#" onclick="alert('해당 공지사항은 원본 페이지를 확인해주세요.')">${notice.title}</a>
        </div>
        <div class="notice-meta">
            ${notice.daysAgo === 0 ? '<span class="notice-badge">NEW</span>' : ''}
            <span class="notice-date">${notice.date}</span>
        </div>
    `;
    
    return li;
}

function renderResults(results) {
    const container = document.getElementById('noticesContainer');
    const loading = document.getElementById('loading');
    
    if (loading) {
        loading.remove();
    }
    
    let hasAnyNotices = false;
    
    container.innerHTML = '';
    
    results.forEach(result => {
        const section = document.createElement('div');
        section.className = 'edu-office';
        
        const header = document.createElement('div');
        header.className = 'edu-office-header';
        header.innerHTML = `
            <h2>${result.office}</h2>
            <span class="notice-count">${result.notices.length}건</span>
        `;
        
        const list = document.createElement('ul');
        list.className = 'notice-list';
        
        if (!result.success) {
            list.innerHTML = `
                <li class="no-notices">
                    <div class="error-message">
                        데이터를 불러올 수 없습니다: ${result.error}
                    </div>
                </li>
            `;
        } else if (result.notices.length === 0) {
            list.innerHTML = `
                <li class="no-notices">최근 ${DAYS_FILTER}일 내 공지사항이 없습니다</li>
            `;
        } else {
            hasAnyNotices = true;
            result.notices.forEach(notice => {
                list.appendChild(createNoticeItem(notice));
            });
        }
        
        section.appendChild(header);
        section.appendChild(list);
        container.appendChild(section);
    });
    
    if (!hasAnyNotices) {
        const noData = document.createElement('div');
        noData.className = 'no-notices';
        noData.style.textAlign = 'center';
        noData.style.padding = '3rem';
        noData.textContent = '최근 10일 내 등록된 공지사항이 없습니다';
        container.appendChild(noData);
    }
}

async function fetchAllNotices() {
    const container = document.getElementById('noticesContainer');
    
    container.innerHTML = `
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>데이터를 불러오는 중...</p>
        </div>
    `;
    
    const results = await Promise.all(
        EDUCATION_OFFICES.map(office => fetchNotices(office))
    );
    
    renderResults(results);
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    document.getElementById('lastUpdate').textContent = `마지막 업데이트: ${timeStr}`;
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAllNotices();
    
    document.getElementById('refreshBtn').addEventListener('click', () => {
        fetchAllNotices();
    });
});
