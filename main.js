const API_URL = 'http://localhost:3000/api/notices';
const DAYS_FILTER = 10;

function getDaysDiff(dateStr) {
    const cleaned = dateStr.trim().replace(/\./g, '-').replace(/-$/, '');
    const noticeDate = new Date(cleaned);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    noticeDate.setHours(0, 0, 0, 0);
    const diffTime = today - noticeDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function isWithinDays(dateStr, days) {
    return getDaysDiff(dateStr) <= days;
}

async function fetchNotices() {
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error');
        }
        
        return result.data;
    } catch (error) {
        console.error('Error fetching notices:', error);
        throw error;
    }
}

function createNoticeItem(notice) {
    const li = document.createElement('li');
    li.className = 'notice-item' + (notice.daysAgo === 0 ? ' new' : '');
    
    const linkHtml = notice.link 
        ? `<a href="${notice.link}" target="_blank" rel="noopener noreferrer">${notice.title}</a>`
        : `<a href="#" onclick="alert('해당 공지사항은 원본 페이지를 확인해주세요.')">${notice.title}</a>`;
    
    li.innerHTML = `
        <div class="notice-title">
            ${linkHtml}
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
                <li class="no-notices">${DAYS_FILTER}일 내 공지사항이 없습니다</li>
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
        noData.textContent = `${DAYS_FILTER}일 내 등록된 공지사항이 없습니다`;
        container.appendChild(noData);
    }
}

async function fetchAllNotices() {
    const container = document.getElementById('noticesContainer');
    
    container.innerHTML = `
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>서버에서 데이터를 불러오는 중...</p>
        </div>
    `;
    
    try {
        const results = await fetchNotices();
        renderResults(results);
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        document.getElementById('lastUpdate').textContent = `마지막 업데이트: ${timeStr}`;
    } catch (error) {
        const container = document.getElementById('noticesContainer');
        container.innerHTML = `
            <div class="error-message">
                데이터 로드 실패: ${error.message}<br>
                서버가 실행 중인지 확인해주세요.<br>
                <small>npm start</small>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAllNotices();
    
    document.getElementById('refreshBtn').addEventListener('click', () => {
        fetchAllNotices();
    });
});
