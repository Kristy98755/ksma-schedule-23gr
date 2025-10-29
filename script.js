document.addEventListener("DOMContentLoaded", function() {
    const groupId = 51; // ID группы
    const currWeekEl = document.getElementById("CurrWeek");
    const nextWeekEl = document.getElementById("NextWeek");

    // 🔹 Overrides: ключ → значение
    const overrides = {

        // GLOBAL
        "Большой морфологич.лекц.зал": "БМЗ",
        "311 (фак.тер.)": "",
		"(фак.тер.)": "",
        "Учебная ауд.-": "кабинет №",
        "РДЛЦ при КГМА, 3 этаж, Учебный каб.- 311 (фак.тер.)": "Медцентр КГМА (по Тыныстанова), 401 кабинет",
        "клин.Ахунбаева, 3 этаж, Каб.зав.каф.-301 (проп.хир)": "Национальный госпиталь (Тоголок Молдо 1/13)",
        "клин.Ахунбаева, 2 этаж, Лекц.зал-БХЗ (проп.хир.)": "Национальный госпиталь (Тоголок Молдо 1/13)",
		// "клин.Ахунбаева, 3 этаж, Каб.зав.каф.-301 (проп.хир)": "<a href='https://go.2gis.com/vTyEj' style='color:green; text-shadow:none; -webkit-text-stroke:0;'>Национальный госпиталь (Тоголок Молдо 1/13)</a>",
        // "клин.Ахунбаева, 2 этаж, Лекц.зал-БХЗ (проп.хир.)": "<a href='https://go.2gis.com/vTyEj' style='color:green; text-shadow:none; -webkit-text-stroke:0;'>Национальный госпиталь (Тоголок Молдо 1/13)</a>",
        "(общ.г.)": "",
		"Пропедевтика внутренних болезней (фак.тер)":"Пропедевтика внутренних болезней",
		"Мед.центр при КГМА, 1 этаж, кабинет № 109 (луч.д.)":"Медцентр КГМА, 1 этаж, кабинет №109",
        "Кафедра: Общей гигиены": "4 корпус (вход справа), кабинет №325",
        "Гл. корпус, 4 этаж, кабинет №425 (биохим.)": "Главный корпус, кабинет №432",
        "ЦТиРК, 5 этаж, Учеб.ауд.-516 (мни)": "Центр тестирования, цокольный этаж",
        "Гл.корпус, 1эт., Лекц.зал №1": "ЛЗ1",
        "Морфо.корпус, 1 этаж, кабинет №114 (пат.анат.)": "Морфокорпус, кабинет №114",
        "Кафедра: Нормальной и топографической анатомии": "Морфокорпус, кабинет №409",
		"Мед.центр при КГМА, 1 этаж, Учебная ауд.- 109 (луч.д.)": "Медцентр КГМА (вход возле флюорографии), кабинет №109",
		"Мед.центр при КГМА, 2 этаж, секц.204, Учеб.каб.-204б (кл.ф.)":"Главный корпус, 325 кабинет",
		"Кафедра: Патологической физиологии":"Морфокорпус, аудитория №214",
		"(№1)":"",
		"Кафедра: Пропедевтики детских болезней":"Третья детская больница",

        // TARGETED

        // CURRENT WEEK
        "Клиническая биохимия|Практика|CurrWeek": "<a href='biohimia.html'>Клиническая биохимия</a>",
        // "Общая гигиена|Практика|NextWeek": "<a href='https://jumpshare.com/share/UjFJkBnEZi11mMdmuFls'>Общая гигиена</a>",
		"Пропедевтика детских болезней|Практика|CurrWeek":"<a href='https://jumpshare.com/share/2XQAo3Z7vOH7BqQ2oZGL'>Пропедевтика детских болезней</a>",
        // "Топографическая анатомия|Практика|CurrWeek": "<a href='https://chatgpt.com/share/68da1b47-05b8-800b-a282-c820fbc39c90'>Топографическая анатомия</a>",
        // "Пропедевтика хирургических болезней|Практика|CurrWeek": "<a href='https://jumpshare.com/share/syI8ek5svsVR2PXNsERj'>Пропедхирургия</a>",
		// "Лучевая диагностика|Практика|CurrWeek":"<a href='https://chatgpt.com/s/t_68de359569408191b94740fafc98bcbb'>Лучевая диагностика</a>",
		// "Пропедевтика внутренних болезней|Практика|CurrWeek":"<a href='https://jumpshare.com/share/ayqIVZ1CivFZARyipbfa' target='_blank'>Пропедевтика внутренних болезней</a>",
		// "Патологическая анатомия|Практика|CurrWeek":"<a href='https://jumpshare.com/share/RpGtVgDaPKqKDDnbaWvS'>Патологическая анатомия</a>",
		// "Патофизиология|Практика|CurrWeek":"<a href='https://jumpshare.com/share/bFouq17EaDhboPQnckgz'>Патфиз</a>",
		// "Клиническая биохимия|Практика|NextWeek": "<a href='https://jumpshare.com/share/Vtj3G9a2IRZP3lIKZ0sB'>Клиническая биохимия</a>",
        // "Общая гигиена|Практика|NextWeek": "<a href='https://jumpshare.com/share/gdZygLaXlUUUKpbJ1pzm'>Общая гигиена</a>",
		"Топографическая анатомия|Практика|CurrWeek": "<a href='topan.html'>Топографическая анатомия</a><br><span style='font-size: 12px;'>Повторите прошлую тему!</span>",
		// "Пропедевтика хирургических болезней|Практика|CurrWeek": "<a href='https://jumpshare.com/share/jxMVck4Xdbi0XTRvhkWV'>Пропедхирургия</a>",
		// "Базисная фармакология|Практика|CurrWeek": "<a href='https://jumpshare.com/share/UGfIe6k9n6tZhBEm7Yye'>Базисная фармакология</a>",
		// "Лучевая диагностика|Практика|CurrWeek":"<a href='luch.html'>Лучевая диагностика</a>",
		// "Патологическая анатомия|Практика|NextWeek":"<a href='https://jumpshare.com/share/zrUZiGuQWqKXtCVVJYpM'>Патологическая анатомия</a>"
        // NEXT WEEK
		// "Акушерство  и гинекология|Практика|NextWeek": "<a href='https://jumpshare.com/share/htKOZeERaKmApodQWhxp'>Акушерство и гинекология</a>",

		
		
		
		
		
		
		
		// ЗАГЛУШКА
		"ЗАГЛУШКА":""

    };

    // --- Утилиты ---
    function getMonday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    function formatDate(d) {
        let month = d.getMonth() + 1;
        let day = d.getDate();
        return `${d.getFullYear()}-${month<10?"0"+month:month}-${day<10?"0"+day:day}`;
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // --- Overrides ---
    function applyOverride(span, weekId) {
        const text = span.textContent.trim();
        const typeSpan = span.parentElement.querySelector(".lesson__type");
        const type = typeSpan ? typeSpan.textContent.trim() : "";

        console.log(`[CHECK OVERRIDE] "${text}" | type="${type}" | week="${weekId}"`);

        const keysToCheck = [
            `${text}|${type}|${weekId}`,
            `${text}|${type}`,
            `${text}`
        ];

        for (const key of keysToCheck) {
            if (overrides[key]) {
                console.log(`[APPLY OVERRIDE] ${key} → ${overrides[key]}`);
                span.innerHTML = overrides[key];
                return;
            }
        }
        console.log(`[NO MATCH] "${text}"`);
    }

    function applyOverrideToPlace(span) {
        if (!span) return;
        const text = span.textContent.replace(/\s*^<i.*<\/i>/, '').trim(); // убираем иконку
        const keysToCheck = [text, text.replace(/\./g, '')]; // можно расширить под нужные варианты

        for (const key of keysToCheck) {
            if (overrides[key]) {
                console.log(`[PLACE OVERRIDE] "${text}" → ${overrides[key]}`);
                span.innerHTML = overrides[key];
                return;
            }
        }
    }

    function applyOverridesToWeek(container, weekId) {
        const lessons = container.querySelectorAll(".lesson__name");
        lessons.forEach(span => applyOverride(span, weekId));

        const places = container.querySelectorAll(".lesson__place");
        places.forEach(span => applyOverrideToPlace(span));
    }

    // 🔹 Глобальные текстовые замены
    function applyGlobalOverrides(container) {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            for (const key in overrides) {
                const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const regex = new RegExp(safeKey, "g");

                if (regex.test(node.nodeValue)) {
                    const replacement = overrides[key];
                    if (replacement.includes("<")) {
                        console.log(`[GLOBAL HTML] "${node.nodeValue}" → "${replacement}"`);
                        const range = document.createRange();
                        range.selectNodeContents(node);
                        const frag = range.createContextualFragment(node.nodeValue.replace(regex, replacement));
                        node.parentNode.replaceChild(frag, node);
                    } else {
                        console.log(`[GLOBAL TEXT] "${node.nodeValue}" → "${replacement}"`);
                        node.nodeValue = node.nodeValue.replace(regex, replacement);
                    }
                }
            }
        }
    }

    // --- Загрузка недели ---
    function loadWeek(monday, container, weekId) {
    const url = `https://ksma-schedule.itismynickname9.workers.dev/proxy/${groupId}/${formatDate(monday)}/get`;
    const cookieKey = `schedule_${groupId}_${formatDate(monday)}`;

    async function fetchWithCookieCache(url, cookieKey, maxAgeSeconds = 60 * 60 * 24) {
        try {
            const response = await fetch(url, { cache: 'no-store' });
            const contentType = response.headers.get('content-type') || '';

            // Проверка: Cloudflare-ошибка или HTML-страница вместо JSON
            if (!response.ok || !contentType.includes('application/json')) {
                throw new Error(`Bad response: ${response.status}`);
            }

            const data = await response.json();
            document.cookie = `${cookieKey}=${encodeURIComponent(JSON.stringify(data))};path=/;max-age=${maxAgeSeconds}`;
            console.info(`[cache] saved ${cookieKey}`);
            return data;

        } catch (error) {
            console.warn(`[cache] ${cookieKey}: loading from cookies due to error:`, error.message);
            const match = document.cookie.match(new RegExp(`(?:^|; )${cookieKey}=([^;]*)`));
            if (match) {
                try {
                    const cachedData = JSON.parse(decodeURIComponent(match[1]));
                    console.info(`[cache] using cached data for ${cookieKey}`);
                    return cachedData;
                } catch (parseError) {
                    console.error(`[cache] failed to parse cookie for ${cookieKey}:`, parseError);
                }
            }
            console.error(`[cache] no cached data available for ${cookieKey}`);
            return null;
        }
    }

    // Загружаем данные (с сервера или из cookie)
    fetchWithCookieCache(url, cookieKey).then(data => {
        if (!data) {
            container.innerHTML = "<p style='color:red; text-align:center;'>Не удалось загрузить расписание</p>";
            return;
        }

        container.innerHTML = "";
        const scheduleTable = document.createElement("ul");
        scheduleTable.className = "schedule__table";

        for (const dayKey in data) {
            const day = data[dayKey];
            const liDay = document.createElement("li");
            liDay.className = "schedule__day";

            const dateSpan = document.createElement("span");
            dateSpan.className = "schedule__date";
            const dateObj = new Date(day.d);
            const options = { weekday: "long", day: "numeric", month: "long" };
            dateSpan.textContent = capitalizeFirst(dateObj.toLocaleDateString("ru-RU", options));
            liDay.appendChild(dateSpan);

            const lessonsUl = document.createElement("ul");
            lessonsUl.className = "schedule__lessons";

            for (const lessonKey in day.l) {
                const lesson = day.l[lessonKey];
                const lessonLi = document.createElement("li");
                lessonLi.className = "lesson";

                const timeDiv = document.createElement("div");
                timeDiv.className = "lesson__time";
                timeDiv.textContent = lesson.tm;
                lessonLi.appendChild(timeDiv);

                const paramsDiv = document.createElement("div");
                paramsDiv.className = "lesson__params";

                const nameSpan = document.createElement("span");
                nameSpan.className = "lesson__name";
                nameSpan.textContent = lesson.d;
                paramsDiv.appendChild(nameSpan);

                const typeSpan = document.createElement("span");
                typeSpan.className = "lesson__type";
                typeSpan.textContent = lesson.t;
                paramsDiv.appendChild(typeSpan);

                if (lesson.r) {
                    const placeSpan = document.createElement("span");
                    placeSpan.className = "lesson__place";
                    placeSpan.innerHTML = `<i class="icon-marker"></i>${lesson.r}`;
                    paramsDiv.appendChild(placeSpan);
                }

                lessonLi.appendChild(paramsDiv);
                lessonsUl.appendChild(lessonLi);
            }

            liDay.appendChild(lessonsUl);
            scheduleTable.appendChild(liDay);
        }

        container.appendChild(scheduleTable);

        setTimeout(() => {
            applyGlobalOverrides(container);
            applyOverridesToWeek(container, weekId);
        }, 300);
    });
}

    const monday = getMonday(new Date());
    const nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);

    loadWeek(monday, currWeekEl, "CurrWeek");
    loadWeek(nextMonday, nextWeekEl, "NextWeek");
    nextWeekEl.style.display = "none";

    document.getElementById("cur").onclick = () => {
        currWeekEl.style.display = "block";
        cur.style.backgroundColor = "#27a8e7dd";
        nextWeekEl.style.display = "none";
        next.style.backgroundColor = "#bbdd";
    };
    document.getElementById("next").onclick = () => {
        currWeekEl.style.display = "none";
        next.style.backgroundColor = "#27a8e7dd";
        nextWeekEl.style.display = "block";
        cur.style.backgroundColor = "#bbdd";
    };
	
	
	
	
	// Обработка открытия ссылок
		// Анимация загрузки
	document.addEventListener('click', e => {
	  const link = e.target.closest('a');
	  if (link && link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
		const loader = document.querySelector('.loadinganim');
		    if (loader) {
			  loader.classList.add('popup');
			}
	  }
	});

});
