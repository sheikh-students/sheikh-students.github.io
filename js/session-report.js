const report_box = document.getElementById("report");
const report_session_id = get_id_from_url();
const auto_print = new URLSearchParams(window.location.search).get("print") === "1";

// "السبت الموافق ٧ نوفمبر ٢٠٢٦م"
function make_week_line(report) {
    if (!report.endDate) {
        return make_date_line(report.date);
    }
    return "من " + make_date_line(report.date) + " إلى " + make_date_line(report.endDate);
}

function make_date_line(date_text) {
    const date = date_from_text(date_text);
    if (!date || Number.isNaN(date.getTime())) {
        return date_text;
    }
    const weekday = date.toLocaleDateString("ar-EG", { weekday: "long" });
    const full_date = date.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
    return weekday + " الموافق " + full_date + "م";
}

function make_th(text, class_name, colspan, rowspan) {
    const th = create_element("th", text, class_name);
    if (colspan) {
        th.colSpan = colspan;
    }
    if (rowspan) {
        th.rowSpan = rowspan;
    }
    return th;
}

// الجدول: م | اسم الطالب | لكل قسم متابعة عمودان (ما أحضره + التقدير) | ملاحظات سابقة (إن وُجدت)
function make_follow_table(report) {
    const columns = report.columns;
    const table = create_element("table", null, "follow-table");

    // صف عناوين الأقسام، وتحته صف العناوين الفرعية
    const top_row = document.createElement("tr");
    top_row.appendChild(make_th("م", "col-number", 0, 2));
    top_row.appendChild(make_th("الأسماء", "col-name", 0, 2));
    columns.forEach(function (column) {
        top_row.appendChild(make_th(column.name, "col-group", 2, 0));
    });
    if (report.hasLegacy) {
        top_row.appendChild(make_th("ملاحظات سابقة", "col-group", 2, 0));
    }

    const sub_row = document.createElement("tr");
    columns.forEach(function (column) {
        sub_row.appendChild(make_th(column.kind === "range" ? "من / إلى" : "ما أحضره", "col-sub", 0, 0));
        sub_row.appendChild(make_th("التقدير", "col-sub col-grade", 0, 0));
    });
    if (report.hasLegacy) {
        sub_row.appendChild(make_th("المادة", "col-sub", 0, 0));
        sub_row.appendChild(make_th("التقدير", "col-sub col-grade", 0, 0));
    }

    const thead = document.createElement("thead");
    thead.appendChild(top_row);
    thead.appendChild(sub_row);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    report.evaluations.forEach(function (evaluation, index) {
        const tr = document.createElement("tr");
        tr.appendChild(create_element("td", (index + 1).toLocaleString("ar-EG"), "col-number"));
        tr.appendChild(create_element("td", evaluation.studentName, "col-name"));

        columns.forEach(function (column) {
            const cell = evaluation.cells[column.id];
            tr.appendChild(create_element("td", entry_text(cell), "col-entry"));
            tr.appendChild(create_element("td", cell ? cell.grade : "", "col-grade"));
        });

        if (report.hasLegacy) {
            tr.appendChild(create_element("td", evaluation.legacy.material, "col-entry"));
            tr.appendChild(create_element("td", evaluation.legacy.grade, "col-grade"));
        }

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
}

function render_report(report) {
    report_box.replaceChildren();
    document.title = (report.endDate ? "جدول المتابعة الأسبوعي - " : "جدول المتابعة اليومي - ") + format_date(report.date);

    // الإطار يتكرر في كل صفحة مطبوعة (position: fixed في الطباعة)
    const frame = create_element("div", null, "sheet-frame");
    frame.setAttribute("aria-hidden", "true");
    report_box.appendChild(frame);

    const content = create_element("div", null, "sheet-content");

    const banner_wrap = create_element("div", null, "banner-wrap");
    banner_wrap.appendChild(create_element("p", SECTIONS[report.section].banner, "banner"));
    content.appendChild(banner_wrap);

    const head = create_element("header", null, "title-block");
    head.appendChild(create_element("h1", report.endDate ? "جدول المتابعة الأسبوعي" : "جدول المتابعة اليومي", "title-ribbon"));
    head.appendChild(create_element("p", make_week_line(report), "date-pill"));
    if (report.title) {
        head.appendChild(create_element("p", report.title, "session-name"));
    }
    content.appendChild(head);

    if (report.totalEvaluations === 0) {
        content.appendChild(create_element("p", "لا توجد صفوف في هذه الجلسة بعد.", "report-empty"));
    } else if (report.columns.length === 0 && !report.hasLegacy) {
        content.appendChild(create_element("p", "لا توجد أقسام متابعة نشطة لعرضها في الجدول.", "report-empty"));
    } else {
        const wrap = create_element("div", null, "follow-wrap");
        wrap.appendChild(make_follow_table(report));
        content.appendChild(wrap);
    }

    report_box.appendChild(content);
}

async function load_report() {
    if (!report_session_id) {
        show_message("رابط التقرير غير صحيح", "error");
        return;
    }

    document.getElementById("back-link").href = page_url("session-details", report_session_id);

    try {
        const report = await api_request("/api/sessions/" + report_session_id + "/report");

        if (report.section !== current_section) {
            window.location.replace(
                "/pages/session-report.html?section=" + encodeURIComponent(report.section) +
                "&id=" + encodeURIComponent(report_session_id) + (auto_print ? "&print=1" : "")
            );
            return;
        }

        render_report(report);

        // زر «طباعة الجلسة» في صفحة الجلسة يفتح نافذة الطباعة مباشرة
        if (auto_print && report.totalEvaluations > 0) {
            setTimeout(function () {
                window.print();
            }, 400);
        }
    } catch (error) {
        show_message(error.message, "error");
    }
}

document.getElementById("print-button").addEventListener("click", function () {
    window.print();
});

if (current_section) {
    load_report();
}
