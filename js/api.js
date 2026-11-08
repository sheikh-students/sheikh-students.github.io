// دوال مشتركة بين كل الصفحات.
// نعرض بيانات المستخدم دائماً بـ textContent وليس innerHTML.

// يجب أن تطابق قائمة التقديرات ملف src/config/constants.js
const GRADES = ["ممتاز", "جيد جداً", "جيد", "يحتاج مراجعة", "إعادة"];

// الأقسام: كل قسم له طلابه وجلساته فقط
const SECTIONS = {
    boys: {
        label: "قسم الأولاد",
        banner: "للرجال والشباب والأولاد فقط"
    },
    girls: {
        label: "قسم البنات",
        banner: "للنساء والبنات فقط"
    }
};

function read_section_from_url() {
    const value = new URLSearchParams(window.location.search).get("section");
    return Object.prototype.hasOwnProperty.call(SECTIONS, value) ? value : null;
}

// القسم الحالي من رابط الصفحة. بدونه نعود إلى صفحة اختيار القسم.
const current_section = read_section_from_url();

if (!current_section) {
    window.location.replace("../index.html");
} else {
    document.body.classList.add("section-" + current_section);
}

// ---------- الروابط ----------

function section_query() {
    return "section=" + encodeURIComponent(current_section);
}

function page_url(page, id) {
    let url = "./" + page + ".html?" + section_query();
    if (id) {
        url += "&id=" + encodeURIComponent(id);
    }
    return url;
}

// ---------- الطلبات ----------

// رابط أصل الباك إند مستقل عن مكان استضافة هذه الملفات.
const API_BASE_URL = String(
    window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL
        ? window.APP_CONFIG.API_BASE_URL
        : "https://7lf0bo0fngax-production-6spmgk0k.us-central1.suga.run"
).replace(/\/+$/, "");

function resolve_api_url(api_path) {
    return new URL(api_path, API_BASE_URL).toString();
}

// نرسل الطلب للسيرفر ونُرجع حقل data فقط. عند الخطأ نرمي Error برسالة عربية.
async function api_request(url, options) {
    const settings = options || {};
    const request_options = {
        method: settings.method || "GET",
        headers: {},
        mode: "cors",
        credentials: window.APP_CONFIG && window.APP_CONFIG.INCLUDE_CREDENTIALS === true
            ? "include"
            : "omit"
    };

    if (settings.body !== undefined) {
        request_options.headers["Content-Type"] = "application/json";
        request_options.body = JSON.stringify(settings.body);
    }

    let response;
    try {
        response = await fetch(resolve_api_url(url), request_options);
    } catch (network_error) {
        throw new Error("تعذر الاتصال بالسيرفر. تأكد من الاتصال وحاول مرة أخرى.");
    }

    let result = null;
    try {
        result = await response.json();
    } catch (parse_error) {
        result = null;
    }

    if (!response.ok || !result || result.success === false) {
        throw new Error((result && result.message) || "حدث خطأ غير متوقع");
    }

    return result.data;
}

// تحميل جميع صفحات القوائم مع الاحتفاظ بحد الصفحة الآمن في الـ API.
// هذا يحافظ على سلوك الواجهة السابق حتى عندما يتجاوز عدد السجلات 50 أو 100.
async function api_request_all(url, page_size) {
    const size = Math.min(100, Math.max(1, Number(page_size) || 100));
    const all_items = [];
    for (let skip = 0; skip <= 1000000; skip += size) {
        const separator = url.includes("?") ? "&" : "?";
        const items = await api_request(url + separator + "limit=" + size + "&skip=" + skip);
        if (!Array.isArray(items)) {
            throw new Error("استجابة القائمة غير صالحة");
        }
        all_items.push(...items);
        if (items.length < size) return all_items;
    }
    throw new Error("عدد السجلات تجاوز الحد الآمن للتحميل دفعة واحدة");
}

// ---------- عناصر الصفحة ----------

function create_element(tag_name, text, class_name) {
    const element = document.createElement(tag_name);
    if (text !== undefined && text !== null) {
        element.textContent = text;
    }
    if (class_name) {
        element.className = class_name;
    }
    return element;
}

let message_timer = null;

function show_message(text, type) {
    const box = document.getElementById("message");
    if (!box) {
        return;
    }

    box.textContent = text;
    box.className = "message " + (type === "error" ? "message-error" : "message-ok");
    box.hidden = false;

    clearTimeout(message_timer);
    if (type !== "error") {
        message_timer = setTimeout(function () {
            box.hidden = true;
        }, 4000);
    }
}

// الترويسة والتنقل: تُبنى هنا حتى تحمل رابط القسم في كل صفحة
function build_site_header(active_page) {
    const header = document.getElementById("site-header");
    if (!header || !current_section) {
        return;
    }

    const inner = create_element("div", null, "inner");

    const top = create_element("div", null, "site-top");
    top.appendChild(create_element("p", "دفتر المتابعة اليومية", "site-title"));
    top.appendChild(create_element("span", SECTIONS[current_section].label, "section-badge"));
    inner.appendChild(top);

    const nav = create_element("nav", null, "site-nav");
    nav.setAttribute("aria-label", "التنقل الرئيسي");

    const links = [
        { key: "section", text: "الرئيسية", href: page_url("section") },
        { key: "students", text: "الطلاب", href: page_url("students") },
        { key: "sessions", text: "الجلسات", href: page_url("sessions") },
        { key: "fields", text: "أقسام المتابعة", href: page_url("fields") },
        { key: "switch", text: "تغيير القسم", href: "../index.html" }
    ];

    links.forEach(function (item) {
        const link = create_element("a", item.text);
        link.href = item.href;
        if (item.key === active_page) {
            link.setAttribute("aria-current", "page");
        }
        nav.appendChild(link);
    });

    inner.appendChild(nav);
    header.replaceChildren(inner);
}

build_site_header(document.body.dataset.nav);

// ---------- التاريخ ----------

function today_string() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + day;
}

function date_from_text(date_text) {
    const parts = String(date_text).split("-");
    if (parts.length !== 3) {
        return null;
    }
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// "2026-11-07" -> "7 نوفمبر 2026"
function format_date(date_text) {
    const date = date_from_text(date_text);
    if (!date || Number.isNaN(date.getTime())) {
        return date_text;
    }
    return date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        numberingSystem: "latn"
    });
}

function session_title(session) {
    return session.title || "جلسة بدون عنوان";
}

function get_id_from_url() {
    return new URLSearchParams(window.location.search).get("id");
}

function make_grade_chip(grade) {
    return create_element("span", grade, "chip grade-" + GRADES.indexOf(grade));
}

// ---------- أقسام المتابعة (أعمدة الجدول) ----------

// نص خانة واحدة للعرض: المحتوى، و«من ... إلى ...» إن وُجدا. يُرجع نصاً فارغاً إن لم يوجد شيء.
function entry_text(entry) {
    if (!entry) {
        return "";
    }
    const parts = [];
    if (entry.content) {
        parts.push(entry.content);
    }
    if (entry.from || entry.to) {
        parts.push("من " + (entry.from || "—") + " إلى " + (entry.to || "—"));
    }
    return parts.join("\n");
}

// خانة جاهزة للعرض في جدول: النص + شارة التقدير. تُرجع عنصر td.
function make_entry_cell(entry, label) {
    const cell = document.createElement("td");
    cell.dataset.label = label;
    cell.className = "cell-entry";

    const text = entry_text(entry);
    if (text) {
        cell.appendChild(create_element("div", text, "entry-text"));
    }
    if (entry && entry.grade) {
        cell.appendChild(make_grade_chip(entry.grade));
    }
    if (!text && !(entry && entry.grade)) {
        cell.appendChild(create_element("span", "—", "entry-empty"));
    }
    return cell;
}

// نبني حقول الإدخال لكل قسم متابعة داخل container.
// fields: أقسام المتابعة، entries: الخانات الحالية (عند التعديل) أو مصفوفة فارغة.
// تُرجع دالة read() تعيد مصفوفة entries جاهزة للإرسال للسيرفر.
function build_entry_editor(container, fields, entries) {
    container.replaceChildren();

    const by_field = new Map();
    (entries || []).forEach(function (entry) {
        by_field.set(String(entry.fieldId), entry);
    });

    const readers = [];

    fields.forEach(function (field, index) {
        const current = by_field.get(String(field._id)) || {};
        const box = create_element("fieldset", null, "entry-box");
        box.appendChild(create_element("legend", field.name));

        const grid = create_element("div", null, "entry-grid");
        const prefix = "entry-" + index + "-" + Math.random().toString(36).slice(2, 7);

        function add_input(label_text, input, extra_class) {
            const wrap = create_element("div", null, "field " + (extra_class || ""));
            const label = create_element("label", label_text);
            input.id = prefix + "-" + label_text;
            label.htmlFor = input.id;
            wrap.appendChild(label);
            wrap.appendChild(input);
            grid.appendChild(wrap);
        }

        let content_input = null;
        let from_input = null;
        let to_input = null;

        if (field.kind === "range") {
            from_input = document.createElement("input");
            from_input.type = "text";
            from_input.maxLength = 100;
            from_input.autocomplete = "off";
            from_input.value = current.from || "";
            add_input("من", from_input, "entry-range");

            to_input = document.createElement("input");
            to_input.type = "text";
            to_input.maxLength = 100;
            to_input.autocomplete = "off";
            to_input.value = current.to || "";
            add_input("إلى", to_input, "entry-range");
        } else {
            content_input = document.createElement("textarea");
            content_input.rows = 2;
            content_input.maxLength = 300;
            content_input.value = current.content || "";
            add_input("ما الذي أحضره", content_input, "field-grow");
        }

        const grade_input = document.createElement("select");
        fill_select(grade_input, text_items(GRADES), "بدون تقدير");
        grade_input.value = current.grade || "";
        add_input("التقدير", grade_input, "entry-grade");

        box.appendChild(grid);
        container.appendChild(box);

        readers.push(function () {
            return {
                fieldId: field._id,
                content: content_input ? content_input.value : "",
                from: from_input ? from_input.value : "",
                to: to_input ? to_input.value : "",
                grade: grade_input.value
            };
        });
    });

    return function read() {
        return readers.map(function (reader) {
            return reader();
        });
    };
}

// نملأ قائمة منسدلة. العناصر: [{ value, label }]
function fill_select(select, items, placeholder) {
    select.replaceChildren();

    if (placeholder) {
        const first_option = create_element("option", placeholder);
        first_option.value = "";
        select.appendChild(first_option);
    }

    items.forEach(function (item) {
        const option = create_element("option", item.label);
        option.value = item.value;
        select.appendChild(option);
    });
}

function text_items(texts) {
    return texts.map(function (text) {
        return { value: text, label: text };
    });
}

// تأكيد ثم حذف الجلسة. تُرجع true إذا تم الحذف.
async function delete_session_with_confirm(session_id) {
    const confirmed = confirm("سيتم حذف الجلسة وكل تقييماتها نهائياً. هل تريد المتابعة؟");
    if (!confirmed) {
        return false;
    }
    await api_request("/api/sessions/" + session_id, { method: "DELETE" });
    return true;
}
