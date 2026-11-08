const student_form = document.getElementById("student-form");
const student_name_input = document.getElementById("student-name");
const search_input = document.getElementById("search-input");
const active_filter = document.getElementById("active-filter");
const students_list = document.getElementById("students-list");

const edit_dialog = document.getElementById("edit-dialog");
const edit_form = document.getElementById("edit-form");
const edit_name_input = document.getElementById("edit-name");
const edit_cancel_button = document.getElementById("edit-cancel");

let editing_student_id = null;
let search_timer = null;
let last_request_number = 0;

function render_students(students) {
    students_list.replaceChildren();

    if (students.length === 0) {
        const has_filter = search_input.value.trim() !== "" || active_filter.value !== "";
        const text = has_filter ? "لا يوجد طلاب مطابقون للبحث." : "لم تُضف أي طلاب بعد.";
        students_list.appendChild(create_element("li", text, "empty"));
        return;
    }

    students.forEach(function (student) {
        const item = document.createElement("li");

        const main = create_element("div", null, "row-main");
        main.appendChild(create_element("span", student.name, "row-title"));
        if (student.isActive) {
            main.appendChild(create_element("span", "نشط", "badge badge-active"));
        } else {
            main.appendChild(create_element("span", "معطل", "badge badge-inactive"));
        }

        const actions = create_element("div", null, "row-actions");

        const edit_button = create_element("button", "تعديل", "button button-secondary button-small");
        edit_button.type = "button";
        edit_button.addEventListener("click", function () {
            open_edit_dialog(student);
        });

        const toggle_text = student.isActive ? "تعطيل" : "إعادة تفعيل";
        const toggle_button = create_element("button", toggle_text, "button button-secondary button-small");
        toggle_button.type = "button";
        toggle_button.addEventListener("click", function () {
            toggle_student(student);
        });

        actions.appendChild(edit_button);
        actions.appendChild(toggle_button);

        item.appendChild(main);
        item.appendChild(actions);
        students_list.appendChild(item);
    });
}

async function load_students() {
    // إذا كتب المستخدم بسرعة قد تصل الردود بترتيب مختلف، فنتجاهل القديم منها
    last_request_number = last_request_number + 1;
    const this_request_number = last_request_number;

    try {
        const params = new URLSearchParams();
        params.set("section", current_section);
        if (search_input.value.trim() !== "") {
            params.set("search", search_input.value.trim());
        }
        if (active_filter.value !== "") {
            params.set("active", active_filter.value);
        }

        const students = await api_request_all("/api/students?" + params.toString());

        if (this_request_number === last_request_number) {
            render_students(students);
        }
    } catch (error) {
        show_message(error.message, "error");
    }
}

async function add_student(event) {
    event.preventDefault();

    try {
        await api_request("/api/students", {
            method: "POST",
            body: { name: student_name_input.value, section: current_section }
        });
        student_form.reset();
        student_name_input.focus();
        show_message("تمت إضافة الطالب", "ok");
        await load_students();
    } catch (error) {
        show_message(error.message, "error");
    }
}

function open_edit_dialog(student) {
    editing_student_id = student._id;
    edit_name_input.value = student.name;
    edit_dialog.showModal();
    edit_name_input.focus();
}

async function save_student_name(event) {
    event.preventDefault();

    try {
        await api_request("/api/students/" + editing_student_id, {
            method: "PATCH",
            body: { name: edit_name_input.value }
        });
        edit_dialog.close();
        show_message("تم تعديل الاسم. التقييمات القديمة تبقى بالاسم الذي سُجلت به.", "ok");
        await load_students();
    } catch (error) {
        show_message(error.message, "error");
    }
}

async function toggle_student(student) {
    if (student.isActive) {
        const confirmed = confirm("تعطيل الطالب «" + student.name + "»؟\nلن تُحذف تقييماته القديمة، لكن لن تستطيع إضافة تقييم جديد له حتى تعيد تفعيله.");
        if (!confirmed) {
            return;
        }
    }

    try {
        await api_request("/api/students/" + student._id, {
            method: "PATCH",
            body: { isActive: !student.isActive }
        });
        show_message(student.isActive ? "تم تعطيل الطالب" : "تمت إعادة تفعيل الطالب", "ok");
        await load_students();
    } catch (error) {
        show_message(error.message, "error");
    }
}

student_form.addEventListener("submit", add_student);
edit_form.addEventListener("submit", save_student_name);
edit_cancel_button.addEventListener("click", function () {
    edit_dialog.close();
});

search_input.addEventListener("input", function () {
    clearTimeout(search_timer);
    search_timer = setTimeout(load_students, 300);
});
active_filter.addEventListener("change", load_students);

if (current_section) {
    load_students();
}
