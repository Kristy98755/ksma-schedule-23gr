//redeploy_please
document.addEventListener("DOMContentLoaded", function() {
	
	const DEBUG_FAKE_SCHEDULE = false;

        async function getLatestVersion() {
                const res = await fetch("https://api.github.com/repos/kristy98755/ksma-schedule/releases/latest");
                const json = await res.json();
                console.log("Fetched latest release:", json.tag_name); // логируем прямо здесь
                return json.tag_name.replace(/[^\d]/g, ''); 
        }

		async function checkUpdate() {
			const isAndroid = /Android/i.test(navigator.userAgent);

			let build = null;
			let hasInterface = false;

			try {
				if (window.KsmaApp && typeof window.KsmaApp.getBuildNumber === "function") {
					hasInterface = true;
					build = window.KsmaApp.getBuildNumber();
					if (window.KsmaApp.reportBuild) {
						window.KsmaApp.reportBuild(build);
					}
				}
			} catch (e) {
				console.error("Error reading build number:", e);
			}

			// 4️⃣ Интерфейс не найден и это не Android → просто ОК
			if (!isAndroid && !hasInterface) {
				console.log("Non-Android browser, skipping update logic");
				return;
			}

			// 1️⃣ Интерфейс не найден, но Android → редирект на APK
			if (isAndroid && !hasInterface) {
				console.log("Android detected, but no KsmaApp interface → redirect to APK");
				window.location.href = "https://kristy98755.github.io/ksma-schedule/update.html";
				return;
			}

			// Ниже — только если интерфейс найден
			const latest = await getLatestVersion();
			console.log("App build:", build, "Latest GitHub:", latest);

			// 2️⃣ Интерфейс найден, версия устарела → редирект + intent
			if (Number(build) < Number(latest)) {
				console.log("App outdated → redirect and trigger update");

				window.location.href = "https://kristy98755.github.io/ksma-schedule/update.html";

				try {
					if (window.KsmaApp && typeof window.KsmaApp.triggerUpdate === "function") {
						window.KsmaApp.triggerUpdate();
					}
				} catch (e) {
					console.error("Failed to call triggerUpdate:", e);
				}

				return;
			}

			// 3️⃣ Интерфейс найден и версия актуальна → ОК
			console.log("App is up-to-date");
		}


checkUpdate();
		
/* ============================================================
   Schedule Patcher Engine (v2.0 - Multi-week support)
   ============================================================ */

/* ---------- DOM ready helper ---------- */
function onScheduleReady(cb) {
    const timer = setInterval(() => {
        const currOk = document.querySelector('#CurrWeek .lesson');
        const nextOk = document.querySelector('#NextWeek .lesson');
        
        // Ждем, пока в обоих блоках появятся уроки
        if (currOk && nextOk) {
            clearInterval(timer);
            // Даем еще 50мс на завершение внутренних отрисовок (погода и т.д.)
            setTimeout(cb, 50);
        }
    }, 100);
}

/* ---------- Time utils ---------- */
function parseTimeRange(str) {
    if (!str) return null;
    const m = str.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
    if (!m) return null;
    return {
        start: parseInt(m[1]) * 60 + parseInt(m[2]),
        end:   parseInt(m[3]) * 60 + parseInt(m[4])
    };
}

/* ---------- Day resolver ---------- */
// week: 'cw' (current), 'nw' (next), 'bw' (both), or 'DD.MM'
function getDayElements(dayName, week = 'cw') {
    const allDays = [...document.querySelectorAll('.schedule__day')];
    return allDays.filter(d => {
        const isDatePattern = /^\d{2}\.\d{2}$/.test(week);
        const dayDate = d.getAttribute('data-date');

        if (isDatePattern) {
            if (dayDate !== week) return false;
            if (dayName) {
                const matchesDay = d.querySelector('.schedule__date')
                                    ?.textContent.toLowerCase()
                                    .includes(dayName.toLowerCase());
                if (!matchesDay) return false;
            }
            return true;
        }

        if (dayName) {
            const matchesDay = d.querySelector('.schedule__date')
                                ?.textContent.toLowerCase()
                                .includes(dayName.toLowerCase());
            if (!matchesDay) return false;
        } else {
            return false;
        }

        const isCurr = d.closest('#CurrWeek');
        const isNext = d.closest('#NextWeek');

        if (week === 'cw') return isCurr;
        if (week === 'nw') return isNext;
        if (week === 'bw') return isCurr || isNext;
        return true;
    });
}

/* ---------- Lesson matcher ---------- */
function lessonMatches(lesson, { subject, type, time }) {
    const name = lesson.querySelector('.lesson__name')?.textContent.trim() || '';
    const lType = lesson.querySelector('.lesson__type')?.textContent.trim() || '';
    const lTime = lesson.querySelector('.lesson__time')?.textContent.trim() || '';

    if (subject && !name.includes(subject)) return false;
    if (type && type !== '0' && lType !== type) return false;
    if (time && time !== '0' && !lTime.includes(time)) return false;

    return true;
}

/* ---------- Actions ---------- */

function shiftLessonTime({ subject, type = '0', day, oldTime = '0', newTime, week = 'cw' }) {
    const dayEls = getDayElements(day, week);
    dayEls.forEach(dayEl => {
        const lesson = [...dayEl.querySelectorAll('.lesson')]
            .find(l => lessonMatches(l, { subject, type, time: oldTime }));

        if (lesson) {
            const timeEl = lesson.querySelector('.lesson__time');
            if (timeEl) {
                const br = timeEl.querySelector('br');
                timeEl.innerHTML = newTime;
                if (br) {
                    timeEl.appendChild(document.createElement('br'));
                    const span = lesson.querySelector('.lesson__weather');
                    if (span) timeEl.appendChild(span);
                }
            }
        }
    });
}

function removeLesson({ subject, type = '0', day, time = '0', week = 'cw' }) {
    const dayEls = getDayElements(day, week);
    let lastRemoved = null;

    dayEls.forEach(dayEl => {
        const target = [...dayEl.querySelectorAll('.lesson')]
            .find(l => lessonMatches(l, { subject, type, time }));
        if (target) {
            lastRemoved = target.cloneNode(true);
            target.remove();
        }
    });
    return lastRemoved; // Возвращает клон последнего удаленного элемента
}

function insertLesson({ day, lessonHTML, time, week = 'cw' }) {
    const dayEls = getDayElements(day, week);

    dayEls.forEach(dayEl => {
        const lessonsUl = dayEl.querySelector('.schedule__lessons');
        if (!lessonsUl) return;

        const temp = document.createElement('div');
        temp.innerHTML = lessonHTML.trim();
        const newLesson = temp.firstElementChild;

        const newTime = parseTimeRange(time);
        const lessons = [...lessonsUl.querySelectorAll('.lesson')];

        let inserted = false;
        for (const lesson of lessons) {
            const t = parseTimeRange(lesson.querySelector('.lesson__time')?.textContent);
            if (t && newTime && newTime.start < t.start) {
                lessonsUl.insertBefore(newLesson.cloneNode(true), lesson);
                inserted = true;
                break;
            }
        }
        if (!inserted) lessonsUl.appendChild(newLesson.cloneNode(true));
    });
}

function moveLesson(removeSpec, insertSpec) {
    // Если в removeSpec не указана неделя, по умолчанию 'cw'
    const week = removeSpec.week || 'cw';
    const lesson = removeLesson({ ...removeSpec, week });

    if (!lesson) return;

    if (insertSpec.time) {
        const timeEl = lesson.querySelector('.lesson__time');
        if (timeEl) timeEl.innerHTML = insertSpec.time;
    }

    insertLesson({
        day: insertSpec.day,
        lessonHTML: lesson.outerHTML,
        time: insertSpec.time,
        week: insertSpec.week || week
    });
}

function removeEmptyDays() {
    document.querySelectorAll('.schedule__day').forEach(day => {
        const lessons = day.querySelectorAll('.lesson');
        if (lessons.length === 0) {
            day.style.display = 'none'; // Скрываем, но оставляем в DOM для движка
        } else {
            day.style.display = ''; // Показываем, если скрывали
        }
    });
}


		
    const groupId = 51; // ID группы
    const currWeekEl = document.getElementById("CurrWeek");
    const nextWeekEl = document.getElementById("NextWeek");

    // 🔹 Overrides: ключ → значение
    const overrides = {

        // GLOBAL
        "Большой морфологич.лекц.зал": "БМЗ",
        "311 (фак.тер.)": "",
		"(фак.тер.)": "",
// 'Invalid Date':"",
        "Учебная ауд.-": "кабинет №",
        "РДЛЦ при КГМА, 3 этаж, Учебный каб.- 311 (фак.тер.)": "Медцентр КГМА (по Тыныстанова), 401 кабинет",
        "клин.Ахунбаева, 3 этаж, Каб.зав.каф.-301 (проп.хир)": "Национальный госпиталь (Тоголок Молдо 1/13)",
        "клин.Ахунбаева, 2 этаж, Лекц.зал-БХЗ (проп.хир.)": "Национальный госпиталь (Тоголок Молдо 1/13)",
		// "клин.Ахунбаева, 3 этаж, Каб.зав.каф.-301 (проп.хир)": "<a href='https://go.2gis.com/vTyEj' style='color:green; text-shadow:none; -webkit-text-stroke:0;'>Национальный госпиталь (Тоголок Молдо 1/13)</a>",
        // "клин.Ахунбаева, 2 этаж, Лекц.зал-БХЗ (проп.хир.)": "<a href='https://go.2gis.com/vTyEj' style='color:green; text-shadow:none; -webkit-text-stroke:0;'>Национальный госпиталь (Тоголок Молдо 1/13)</a>",
        // "(общ.г.)": "",
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
		"НГ МЗ КР, подвал, Учебная ауд.-02 (лор)":"Национальный госпиталь (Тоголок Молдо, 1к)",
		"РНЦУ, 2 этаж, кабинет №202 (урол.)":"Корпус урологии у нацгоспиталя (Тоголок Молдо, 1/13), 3 этаж<br>Сменка обязательна!",
		"клин.Ахунбаева, подвал, Учеб.ауд.-04 (проп.хир.)":"<img src='pin.png' class='loc-icon'>Клиника «Ренато», мкр. Джал",
		"НГ МЗ КР, 3эт., Каб.завуча-4 (энд.)":"Национальный госпиталь, подвал",
		"Общежитие-1, 1 этаж, Учеб.ауд.-101а (ВМП)":"Общежитие №1",
		"Гл.корпус, 3эт., Лекц.зал №2":"ЛЗ2",
		"Пропедевтика внутренних болезней (гос.тер)":"Госпитальная терапия",
		// "Лучевая диагностика":"Лучевая диагностика ❤️",
		"ГКБ-1, 2 этаж, отд.мед.реабил., Учебная комн.-201 (госп.тер.)":"<a href='https://go.2gis.com/uVfqd' style='color:green; text-shadow:none; -webkit-text-stroke:0;'>Больница №1, ул. Ю. Фучика 15/1а",
		"Корпус 4, 3 этаж, Учебная ауд.-325 (общ.г.)": "<img src='pin.png' class='loc-icon'>4 корпус, кабинет №325",
		"НГ МЗ КР, подвал, Учебная ауд.-03 (невр.)": "<img src='pin.png' class='loc-icon'>Морфокорпус, 104 кабинет",
		"(общ.г.)":" ",
		"РДЛЦ при КГМА, 1 этаж, Уч.ауд.-3 (травм.)":"<a href='https://go.2gis.com/QuZmo'>Городская больница №4</a>",
		"НГ МЗ КР, подвал, Учебная ауд.-01 (лор)":"<img src='pin.png' class='loc-icon'><a href='https://go.2gis.com/32nZA'>Клиника «MEDCENTER.KG»</a>",
        // TARGETED

        // CURRENT WEEK
        // "Клиническая биохимия|Практика|CurrWeek": "<a href='biohimia.html'>Клиническая биохимия</a>",
        // "Общая гигиена (общ.г.)|Практика|CurrWeek": "<a href='https://jumpshare.com/share/7dWdzrh9R1LteeuLCqTg'>Общая гигиена</a>",
		// "Пропедевтика детских болезней|Практика|CurrWeek":"<a href='https://jumpshare.com/share/3h4W81v2OYwlIUZnUuWI'>Пропедевтика детских болезней</a>",
        // "Пропедевтика хирургических болезней|Практика|CurrWeek": "<a href='https://jumpshare.com/share/syI8ek5svsVR2PXNsERj'>Пропедхирургия</a>",
		// "Лучевая диагностика|Практика|CurrWeek":"<a href='https://jumpshare.com/share/VbBtEPKphYjpniI9JAR4'>Лучевая диагностика</a>",
		// "Пропедевтика внутренних болезней|Практика|CurrWeek":"<a href='https://jumpshare.com/share/Ankzu2ICG1AADExhXCja'>Пропедевтика внутренних болезней</a>",
		// "Лучевая диагностика|Практика|CurrWeek":"<a href='https://jumpshare.com/folder/IimrKHH7hN6hUMSHVsjg'>Лучевая диагностика</a>",
		// "Пропедевтика внутренних болезней|Практика|CurrWeek":"<a href='https://jumpshare.com/share/Ankzu2ICG1AADExhXCja'>Пропедевтика внутренних болезней</a>",
		// "Патологическая анатомия|Практика|CurrWeek":"<a href='https://jumpshare.com/share/RpGtVgDaPKqKDDnbaWvS'>Патологическая анатомия</a>",
		// "Патологическая физиология|Практика|CurrWeek":"Патологическая физиология",
		// "Клиническая биохимия|Практика|NextWeek": "<a href='https://jumpshare.com/share/Vtj3G9a2IRZP3lIKZ0sB'>Клиническая биохимия</a>",
        // "Общая гигиена|Практика|NextWeek": "<a href='https://jumpshare.com/share/gdZygLaXlUUUKpbJ1pzm'>Общая гигиена</a>",
		// "Топографическая анатомия|Практика|CurrWeek": "<a href='https://meduniver.com/Medical/Topochka/235.html'>Топографическая анатомия</a>",
		// "Пропедевтика хирургических болезней|Практика|CurrWeek": "<a href='https://jumpshare.com/share/jxMVck4Xdbi0XTRvhkWV'>Пропедхирургия</a>",
		// "Базисная фармакология|Практика|CurrWeek": "<a href='https://jumpshare.com/share/q0mUpyh1NGYBn2YzP9Zz'>Базисная фармакология</a>",
		// "Лучевая диагностика и терапия|Практика|CurrWeek":"<a href='https://jumpshare.com/share/MfQjXwgBcFY0aa7Vchr4'>Лучевая диагностика</a>",
		// "НИРС|Практика|CurrWeek": "<a href='https://jumpshare.com/share/GbUW87yUWiPTBeQzL2z3'>НИРС</a>",
		// "Урология|Практика|CurrWeek":"<a href='urology.html'>Урология</a>",
		// "Оториноларингология|Практика|CurrWeek":"<a href='lor.html'>Оториноларингология</a>",
		// "ВМП-ОТМС|Практика|CurrWeek":"<a href='https://jumpshare.com/share/W378sP6WnSnSTv5mmMUr'>ВМП-ОТМС</a>",
		// "Пропедхирургия|Практика|CurrWeek":"<a href='propedhir.html'>Пропедхирургия</a>",
		// "Госпитальная терапия|Практика|CurrWeek":"<a href='https://jumpshare.com/share/wBntWG89GumPmcLZdrP4'>Госпитальная терапия</a>",
		// "Неврология|Практика|CurrWeek":"<a href='https://jumpshare.com/share/q7ZsnqWSqCnQgL1OCCxs'>Неврология</a>",
		// "Оториноларингология|Практика|CurrWeek":"<a href='https://jumpshare.com/share/Cj7gtnPvcTdfs3gsKpCx'>Оториноларингология</a>",
		// "ВМП-ОТМС|Практика|CurrWeek":"<a href='https://jumpshare.com/share/W378sP6WnSnSTv5mmMUr'>ВМП-ОТМС</a>",
		// "Пропедхирургия|Практика|CurrWeek":"<a href='propedhir.html'>Пропедхирургия</a>",
		// "Госпитальная терапия|Практика|CurrWeek":"<a href='https://jumpshare.com/share/s3UZR2XCU8qzzTapHaeN'>Госпитальная терапия</a>",
		// "Неврология|Практика|CurrWeek":"<a href='https://jumpshare.com/share/q7ZsnqWSqCnQgL1OCCxs'>Неврология</a>",
		"Травматология|Практика|CurrWeek":"<a href='https://jumpshare.com/share/v4sTWxUcvna8Ucze0Bzj'>Травматология</a><br><i><span style='font-size:14; color:red'>Не забудьте сменку!</i></span>",

        // NEXT WEEK
		// "Акушерство и гинекология|Практика|CurrWeek": "<a href='ginecology.html'>Акушерство и гинекология</a>",
		// "Пропедевтика внутренних болезней|Практика|NextWeek":"<a href='https://jumpshare.com/share/Ankzu2ICG1AADExhXCja'>Пропедевтика внутренних болезней</a>",


		
		
		
		
		
		
		
		// ЗАГЛУШКА
		"ЗАГЛУШКА":""


    };


	// ПЕРЕНОС ЗАНЯТИЙ
	onScheduleReady(() => {
		console.log("Both weeks ready, applying patches...");

		// moveLesson(
			// {
				// subject: 'Патологическая физиология',
				// type: 'Практика',
				// day: 'Вторник',
				// week: 'cw' 
			// },
			// {
				// day: 'Четверг',
				// time: '12:45-14:20',
				// week: 'cw' 
			// }
		// );
		// moveLesson(
			// {
				// subject: 'Общая гигиена ',
				// type: 'Практика',
				// day: 'Суббота',
				// week: 'cw' // Искать на обеих неделях
			// },
			// {
				// day: 'Вторник',
				// time: '10:10-11:45',
				// week: 'cw' // Перенести на обеих неделях
			// }
		// );

		shiftLessonTime({
			subject: 'Травматология',
			type: 'Практика',
			day: 'Среда',
			oldTime: '07:40-09:15',
			newTime: '08:00-09:15',
			week: 'cw' // Применить к обеим неделям
		});		
		
		// shiftLessonTime({
			// subject: 'Госпитальная терапия',
			// type: 'Практика',
			// day: 'Четверг',
			// oldTime: '07:00-09:15',
			// newTime: '07:30-09:45',
			// week: 'bw' // Применить к обеим неделям
		// });
		insertLesson({
			// day: 'Среда',          
			week: '17.04',                  // 'cw' = текущая, 'nw' = следующая, 'bw' = обе
			time: '14:00-15:00',         // время — для определения позиции вставки
			lessonHTML: `<li class="lesson" style="background-color:#f217;"><div class="lesson__time">14:00-15:00<br></div><div class="lesson__params"><span class="lesson__name">Отработка по оториноларингологии</span><span class="lesson__type">Практика</span><span class="lesson__place"><img src="pin.png" class="loc-icon"><a href='https://go.2gis.com/32nZA'>Клиника «MEDCENTER.KG»</a></span></div></li>`
		});


		removeEmptyDays();

	});

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
        const dayEl = span.closest('.schedule__day');
        const ddmm = dayEl ? dayEl.getAttribute('data-date') : null;

        console.log(`[CHECK OVERRIDE] "${text}" | type="${type}" | week="${weekId}" | date="${ddmm}"`);

        const keysToCheck = [
            `${text}|${type}|${ddmm}`,
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
		
		
		document.querySelectorAll('.schedule__date').forEach(el => {
			if (el.textContent.trim() === 'Invalid Date') {
				el.closest('.schedule__day')?.remove();
			}
		});

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
    const key = `schedule_${groupId}_${formatDate(monday)}`;

    // --- Хранилище ---
    function saveCache(name, data, maxAgeSeconds) {
        const json = JSON.stringify(data);
        try {
				localStorage.setItem(name, json);
                console.info(`[cache] saved ${name} in localStorage (${(json.length / 1024).toFixed(1)} KB)`);
            
        } catch (e) {
            console.error(`[cache] failed to save ${name}:`, e);
        }
    }
	window.saveCache = saveCache;
    function loadCache(name) {
        const ls = localStorage.getItem(name);
        if (ls) {
            try {
                return JSON.parse(ls);
            } catch {
                console.warn(`[cache] localStorage parse error for ${name}`);
            }
        }
        return null;
    }
	window.loadCache = loadCache;

	function isScheduleStructurallyValid(data) {
		if (!data || typeof data !== 'object') return false;

		// проверяем, что есть хотя бы один день с валидной датой
		for (const dayKey in data) {
			const day = data[dayKey];
			if (!day || !day.d) continue; // дата отсутствует
			const dateObj = new Date(day.d);
			if (!isNaN(dateObj.getTime())) {
				// валидная дата найдена
				return true;
			}
		}
		// не нашли ни одной валидной даты
		return false;
	}
	window.isScheduleStructurallyValid = isScheduleStructurallyValid;
	
	
	async function fetchWithHybridCache(url, cacheKey, maxAgeSeconds = 60*60*168) {
		try {
			const resp = await fetch(url, { cache: 'no-store' });
			const contentType = resp.headers.get('content-type') || '';
			if (!resp.ok || !contentType.includes('application/json')) {
				throw new Error(`Bad response: ${resp.status}`);
			}

			let data;
			try { data = await resp.json(); } 
			catch(e) { throw new Error("Worker response is not valid JSON"); }

			if (!isScheduleStructurallyValid(data)) throw new Error("Worker returned invalid schedule structure");

			saveCache(cacheKey, data, maxAgeSeconds);
			data._source = 'online';
			return data;
		} catch (workerError) {
			console.warn(`[cache] ${cacheKey}: ${workerError.message}`);

			// fallback на vercel
			try {
				const vercelUrl = url.replace(
					"https://ksma-schedule.itismynickname9.workers.dev/proxy", 
					"https://ksma-schedule.vercel.app/api/proxy"
				);
				const vResp = await fetch(vercelUrl, { cache: 'no-store' });
				if (!vResp.ok) throw new Error(`Vercel response: ${vResp.status}`);
				const vData = await vResp.json();
				if (!isScheduleStructurallyValid(vData)) throw new Error("Vercel returned invalid schedule");
				vData._source = 'online';
				console.log(`[cache] ${cacheKey} loaded from Vercel`);
				saveCache(cacheKey, vData, maxAgeSeconds);
				return vData;
			} catch (vErr) {
				console.warn(`[cache] Vercel fallback failed: ${vErr.message}`);
			}

			// проверка кэша
			const cached = loadCache(cacheKey);
			if (cached && isScheduleStructurallyValid(cached)) {
				cached._source = 'offline';
				console.info(`[cache] restored ${cacheKey} (offline mode)`);
				return cached;
			}

			// fallback.json
			try {
				const fallbackResp = await fetch("fallback.json", { cache: 'no-store' });
				const fallbackData = await fallbackResp.json();
				if (!isScheduleStructurallyValid(fallbackData)) throw new Error("Fallback.json invalid");
				fallbackData._source = 'offline';
				saveCache(cacheKey, fallbackData, maxAgeSeconds);
				console.log("[cache] fallback.json used");
				return fallbackData;
			} catch (fe) {
				console.warn(`[cache] fallback.json failed: ${fe.message}`);
			}

			// если совсем ничего нет
			return { message: `Не удалось загрузить расписание.<br>Worker: ${workerError.message}` };
		}
	}




    // --- Основная логика отрисовки ---
    fetchWithHybridCache(url, key).then(data => {
        if (!data) {
            container.innerHTML = "<p style='color:red; text-align:center;'>Не удалось загрузить расписание</p>";
            return;
        };
		if (data.message) {
			container.innerHTML = `<p style="color:red; text-align:center;">${data.message}</p>`;
        return;
		};
		if (data.message) {
				container.innerHTML = `
					<p style="
						text-align:center;
					">
						${data.message}
					</p>
				`;
				alert(`${data.message}`);
				return;
		};
        container.innerHTML = "";
        const scheduleTable = document.createElement("ul");
        scheduleTable.className = "schedule__table";

        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(monday);
            currentDate.setDate(currentDate.getDate() + i);

            let dayData = null;
            for (const dayKey in data) {
                if (dayKey === "_source" || dayKey === "message") continue;
                const dObj = data[dayKey];
                if (dObj && dObj.d) {
                    const dataDate = new Date(dObj.d);
                    if (dataDate.getFullYear() === currentDate.getFullYear() &&
                        dataDate.getMonth() === currentDate.getMonth() &&
                        dataDate.getDate() === currentDate.getDate()) {
                        dayData = dObj;
                        break;
                    }
                }
            }

            const liDay = document.createElement("li");
            liDay.className = "schedule__day";

            const dd = String(currentDate.getDate()).padStart(2, '0');
            const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
            liDay.setAttribute("data-date", `${dd}.${mm}`);

            const dateSpan = document.createElement("span");
            dateSpan.className = "schedule__date";
            const options = { weekday: "long", day: "numeric", month: "long" };
            dateSpan.textContent = capitalizeFirst(currentDate.toLocaleDateString("ru-RU", options));
            liDay.appendChild(dateSpan);

            const lessonsUl = document.createElement("ul");
            lessonsUl.className = "schedule__lessons";

            if (dayData && dayData.l) {
                for (const lessonKey in dayData.l) {
                    const lesson = dayData.l[lessonKey];
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
					placeSpan.innerHTML = `<img src="pin.png" class="loc-icon">${lesson.r}`;

                    paramsDiv.appendChild(placeSpan);
                }

                lessonLi.appendChild(paramsDiv);
                lessonsUl.appendChild(lessonLi);
                }
            }

            liDay.appendChild(lessonsUl);
            scheduleTable.appendChild(liDay);
        }

        container.appendChild(scheduleTable);

        // --- Статус сервера ---
const statusP = document.createElement("p");
statusP.style.textAlign = "center";
statusP.innerHTML =
    `<b>kgma.kg is <span style="color:${data._source === 'online' ? 'limegreen' : 'red'}">${data._source}</span></b>`;

// Вставляем в конец контейнера расписания
	container.appendChild(statusP);




			setTimeout(() => {
    // Сначала применяем твои overrides
			applyGlobalOverrides(container);
			applyOverridesToWeek(container, weekId);

			// --- Вставка погоды под каждой парой ---
			(async function() {
				try {
					console.log("[WEATHER] Загружаем данные погоды...");
					const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=42.875&longitude=74.5&hourly=temperature_2m,precipitation,snowfall,cloudcover&timezone=Asia/Bishkek`);
					const weatherData = await response.json();
					console.log("[WEATHER] Данные получены");

					const lessonsTimeDivs = container.querySelectorAll(".lesson__time");
					console.log("[WEATHER] Найдено уроков:", lessonsTimeDivs.length);

					lessonsTimeDivs.forEach(div => {
						const times = div.textContent.trim().split("-");
						if (times.length !== 2) {
							console.warn("[WEATHER] Не удалось распознать время пары:", div.textContent);
							return;
						}
						const startTime = times[0];

						const dateLi = div.closest(".schedule__day").querySelector(".schedule__date")?.textContent.trim();
						if (!dateLi) {
							console.warn("[WEATHER] Не удалось найти дату для пары:", div.textContent);
							return;
						}

						// Преобразуем дату в YYYY-MM-DD
						const dateParts = dateLi.match(/(\d+)\s+([а-я]+)/i);
						if (!dateParts) {
							console.warn("[WEATHER] Не удалось распознать дату:", dateLi);
							return;
						}
						const day = dateParts[1].padStart(2, "0");
						const monthNames = {
							"января":"01","февраля":"02","марта":"03","апреля":"04","мая":"05","июня":"06",
							"июля":"07","августа":"08","сентября":"09","октября":"10","ноября":"11","декабря":"12"
						};
						const month = monthNames[dateParts[2].toLowerCase()];
						if (!month) {
							console.warn("[WEATHER] Не удалось найти номер месяца для:", dateParts[2]);
							return;
						}

						// Берём только час начала пары
						const [h, m] = startTime.split(":").map(Number);
						const hour = h; // игнорируем минуты

						const isoDate = `${new Date().getFullYear()}-${month}-${day}`;

						// Находим индекс ближайшего часа в API
						const index = weatherData.hourly.time.findIndex(t => t.startsWith(isoDate + `T${hour.toString().padStart(2,'0')}:`));
						if (index === -1) {
							console.warn("[WEATHER] Не найден индекс времени для", isoDate, hour);
							return;
						}

						const temp = weatherData.hourly.temperature_2m[index];
						const precip = weatherData.hourly.precipitation[index];
						const snow = weatherData.hourly.snowfall[index];
						const cloud = weatherData.hourly.cloudcover[index];

						console.log(`[WEATHER] Для ${isoDate} ${startTime}: temp=${temp}, precip=${precip}, snow=${snow}, cloud=${cloud}`);


						// Выбираем иконку
						let icon = "☀️";

						if (snow > 0.1) icon = "❄️";                // снег
						else if (precip > 0.1) icon = "🌧️";         // дождь
						else if (cloud >= 85) icon = "☁️";          // пасмурно
						else if (cloud >= 40) icon = "⛅️";          // облачно
						else if (cloud >= 20) icon = "🌤️";          // переменная облачность
						else icon = "☀️";                            // ясно
                       // ясно


						const weatherSpan = document.createElement("span");
						weatherSpan.className = "lesson__weather";
						weatherSpan.style.marginLeft = "6px";
						weatherSpan.textContent = `${icon} ${temp}°C`;

						const br = document.createElement("br"); // перенос строки
						div.appendChild(br);
						div.appendChild(weatherSpan);

					});

				} catch(e) {
					console.error("[WEATHER] Ошибка загрузки погоды:", e);
				}
			})();

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



