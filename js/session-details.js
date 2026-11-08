const session_id = get_id_from_url();

const content_box = document.getElementById("content");
const evaluation_form = document.getElementById("evaluation-form");
const student_select = document.getElementById("evaluation-student");
const entries_box = document.getElementById("entries-box");
const submit_button = document.getElementById("evaluation-submit");
const evaluations_body = document.getElementById("evaluations-body");
const evaluations_table = document.getElementById("evaluations-table");
const evaluations_head = evaluations_table.querySelector("thead tr");
const evaluations_empty = document.getElementById("evaluations-empty");

const edit_session_dialog = document.getElementById("edit-session-dialog");
const edit_session_form = document.getElementById("edit-session-form");
const edit_session_title_input = document.getElementById("edit-session-title-input");
const edit_session_date_input = document.getElementById("edit-session-date-input");
const edit_session_end_input = document.getElementById("edit-session-end-input");

const edit_evaluation_dialog = document.getElementById("edit-evaluation-dialog");
const edit_evaluation_form = document.getElementById("edit-evaluation-form");
const edit_evaluation_info = document.getElementById("edit-evaluation-info");
const edit_entries_box = document.getElementById("edit-entries-box");

let current_session = null;
let active_students = [];
let all_fields = [];
let read_new_entries = null;
let read_edit_entries = null;
let editing_evaluation_id = null;
let editing_expected_updated_at = null;

// نرسل كل عمليات الجلسة إلى PATCH /api/sessions/:id، والسيرفر يُرجع الجلسة بعد التحديث
async function send_session_action(body) {
    current_session = await api_request("/api/sessions/" + session_id, {
        method: "PATCH",
        body: body
    });
    render_session();
}

function render_session() {
    document.title = session_title(current_session) + " - دفتر المتابعة اليومية";
    document.getElementById("session-heading").textContent = session_title(current_session);
    document.getElementById("session-date-text").textContent = make_period_text(current_session);
    render_evaluations();
    refresh_student_options();
}

// "من 7 نوفمبر 2026 إلى 14 نوفمبر 2026" أو تاريخ واحد إن لم تُحدد نهاية
function make_period_text(session) {
    if (session.endDate) {
        return "من " + format_date(session.date) + " إلى " + format_date(session.endDate);
    }
    return format_date(session.date);
}

function active_fields() {
    return all_fields.filter(function (field) {
        return field.isActive;
    });
}

// أعمدة الجدول: الأقسام النشطة + أي قسم معطل له بيانات في هذه الجلسة
function table_fields() {
    const used = new Set();
    current_session.evaluations.forEach(function (evaluation) {
        (evaluation.entries || []).forEach(function (entry) {
            used.add(String(entry.fieldId));
        });
    });
    return all_fields.filter(function (field) {
        return field.isActive || used.has(String(field._id));
    });
}

// أقسام نعرضها في نافذة تعديل صف: النشطة + ما فيه بيانات لهذا الصف
function fields_for_evaluation(evaluation) {
    const used = new Set((evaluation.entries || []).map(function (entry) {
        return String(entry.fieldId);
    }));
    return all_fields.filter(function (field) {
        return field.isActive || used.has(String(field._id));
    });
}

// الصفوف بنفس ترتيب الإدخال، وهو نفس ترتيب الجدول المطبوع
function render_evaluations() {
    const evaluations = current_session.evaluations;
    const columns = table_fields();
    const has_legacy = evaluations.some(function (evaluation) {
        return evaluation.material || evaluation.grade;
    });

    document.getElementById("evaluations-count").textContent = evaluations.length + " طالب";
    evaluations_body.replaceChildren();
    evaluations_empty.hidden = evaluations.length > 0;
    evaluations_table.hidden = evaluations.length === 0;

    // ترويسة الجدول: م + الاسم + عمود لكل قسم متابعة + (ملاحظات سابقة إن وُجدت) + الإجراءات
    evaluations_head.replaceChildren();
    evaluations_head.appendChild(create_element("th", "م"));
    evaluations_head.appendChild(create_element("th", "اسم الطالب"));
    columns.forEach(function (field) {
        evaluations_head.appendChild(create_element("th", field.name));
    });
    if (has_legacy) {
        evaluations_head.appendChild(create_element("th", "ملاحظات سابقة"));
    }
    const actions_head = document.createElement("th");
    actions_head.appendChild(create_element("span", "إجراءات", "visually-hidden"));
    evaluations_head.appendChild(actions_head);

    evaluations.forEach(function (evaluation, index) {
        const row = document.createElement("tr");

        const number_cell = create_element("td", index + 1, "cell-number");
        number_cell.dataset.label = "م";

        const name_cell = create_element("td", evaluation.studentName, "cell-name");
        name_cell.dataset.label = "الطالب";

        row.appendChild(number_cell);
        row.appendChild(name_cell);

        const by_field = new Map((evaluation.entries || []).map(function (entry) {
            return [String(entry.fieldId), entry];
        }));
        columns.forEach(function (field) {
            row.appendChild(make_entry_cell(by_field.get(String(field._id)), field.name));
        });

        if (has_legacy) {
            row.appendChild(make_entry_cell(
                { content: evaluation.material || "", grade: evaluation.grade || "" },
                "ملاحظات سابقة"
            ));
        }

        const actions_cell = create_element("td", null, "cell-actions");
        const actions = create_element("div", null, "row-actions");

        const edit_button = create_element("button", "تعديل", "button button-secondary button-small");
        edit_button.type = "button";
        edit_button.addEventListener("click", function () {
            open_edit_evaluation(evaluation);
        });

        const delete_button = create_element("button", "حذف", "button button-danger button-small");
        delete_button.type = "button";
        delete_button.addEventListener("click", function () {
            delete_evaluation(evaluation);
        });

        actions.appendChild(edit_button);
        actions.appendChild(delete_button);
        actions_cell.appendChild(actions);

        row.appendChild(actions_cell);
        evaluations_body.appendChild(row);
    });
}

// القائمة تعرض فقط الطلاب النشطين الذين ليس لهم صف في هذه الجلسة بعد
function refresh_student_options() {
    const used_ids = new Set(current_session.evaluations.map(function (item) {
        return String(item.studentId);
    }));

    const free_students = active_students.filter(function (student) {
        return !used_ids.has(String(student._id));
    });

    const items = free_students.map(function (student) {
        return { value: student._id, label: student.name };
    });
    fill_select(student_select, items, "اختر الطالب");

    const has_fields = active_fields().length > 0;

    document.getElementById("no-students-hint").hidden = active_students.length > 0;
    document.getElementById("all-done-hint").hidden = !(active_students.length > 0 && free_students.length === 0);
    document.getElementById("no-fields-hint").hidden = has_fields;
    evaluation_form.hidden = free_students.length === 0;
    submit_button.disabled = !has_fields;
}

async function load_page() {
    if (!session_id) {
        show_message("رابط الجلسة غير صحيح", "error");
        return;
    }

    document.getElementById("back-to-sessions").href = page_url("sessions");
    document.getElementById("students-link").href = page_url("students");
    document.getElementById("fields-link").href = page_url("fields");

    try {
        const session = await api_request("/api/sessions/" + session_id);

        // الجلسة تتبع قسماً واحداً فقط. لو فُتحت من قسم آخر نذهب إلى قسمها الصحيح.
        if (session.section !== current_section) {
            window.location.replace(
                "./session-details.html?section=" + encodeURIComponent(session.section) +
                "&id=" + encodeURIComponent(session_id)
            );
            return;
        }

        // الطالب المعطل لا يظهر هنا، لأنه لا يمكن إضافة صف جديد له
        const students = await api_request_all("/api/students?active=true&" + section_query());
        const fields = await api_request("/api/fields?" + section_query());

        current_session = session;
        active_students = students;
        all_fields = fields;
        read_new_entries = build_entry_editor(entries_box, active_fields(), []);
        document.getElementById("report-link").href = page_url("session-report", session_id);
        document.getElementById("print-link").href = page_url("session-report", session_id) + "&print=1";
        render_session();
        content_box.hidden = false;
    } catch (error) {
        show_message(error.message, "error");
    }
}

// ---------- إضافة صف ----------

async function add_evaluation(event) {
    event.preventDefault();

    // نعطل الزر أثناء الإرسال حتى لا يُضغط مرتين
    submit_button.disabled = true;
    try {
        await send_session_action({
            action: "add_evaluation",
            studentId: student_select.value,
            entries: read_new_entries()
        });

        // نفرّغ الحقول للطالب التالي
        read_new_entries = build_entry_editor(entries_box, active_fields(), []);
        student_select.focus();
        show_message("تمت إضافة الطالب إلى الجدول", "ok");
    } catch (error) {
        show_message(error.message, "error");
    } finally {
        submit_button.disabled = false;
    }
}

// ---------- تعديل وحذف صف ----------

function open_edit_evaluation(evaluation) {
    editing_evaluation_id = evaluation._id;
    editing_expected_updated_at = evaluation.updatedAt || null;
    edit_evaluation_info.textContent = evaluation.studentName;
    read_edit_entries = build_entry_editor(edit_entries_box, fields_for_evaluation(evaluation), evaluation.entries);
    edit_evaluation_dialog.showModal();
}

async function save_evaluation(event) {
    event.preventDefault();

    try {
        const update_body = {
            action: "update_evaluation",
            evaluationId: editing_evaluation_id,
            entries: read_edit_entries()
        };
        if (editing_expected_updated_at) update_body.expectedUpdatedAt = editing_expected_updated_at;
        await send_session_action(update_body);
        edit_evaluation_dialog.close();
        show_message("تم تعديل الصف", "ok");
    } catch (error) {
        show_message(error.message, "error");
    }
}

async function delete_evaluation(evaluation) {
    const confirmed = confirm("حذف صف «" + evaluation.studentName + "» من هذه الجلسة؟");
    if (!confirmed) {
        return;
    }

    try {
        await send_session_action({
            action: "delete_evaluation",
            evaluationId: evaluation._id
        });
        show_message("تم حذف الصف", "ok");
    } catch (error) {
        show_message(error.message, "error");
    }
}

// ---------- تعديل وحذف الجلسة ----------

function open_edit_session() {
    edit_session_title_input.value = current_session.title || "";
    edit_session_date_input.value = current_session.date;
    edit_session_end_input.value = current_session.endDate || "";
    edit_session_dialog.showModal();
}

async function save_session_info(event) {
    event.preventDefault();

    try {
        await send_session_action({
            action: "update_session",
            title: edit_session_title_input.value,
            date: edit_session_date_input.value,
            endDate: edit_session_end_input.value
        });
        edit_session_dialog.close();
        show_message("تم تعديل الجلسة", "ok");
    } catch (error) {
        show_message(error.message, "error");
    }
}

async function delete_this_session() {
    try {
        const deleted = await delete_session_with_confirm(session_id);
        if (deleted) {
            window.location.href = page_url("sessions");
        }
    } catch (error) {
        show_message(error.message, "error");
    }
}

evaluation_form.addEventListener("submit", add_evaluation);
edit_evaluation_form.addEventListener("submit", save_evaluation);
edit_session_form.addEventListener("submit", save_session_info);
document.getElementById("edit-session-button").addEventListener("click", open_edit_session);
document.getElementById("delete-session-button").addEventListener("click", delete_this_session);
document.getElementById("edit-session-cancel").addEventListener("click", function () {
    edit_session_dialog.close();
});
document.getElementById("edit-evaluation-cancel").addEventListener("click", function () {
    edit_evaluation_dialog.close();
});

if (current_section) {
    load_page();
}
