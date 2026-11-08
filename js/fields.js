const field_form = document.getElementById("field-form");
const field_name_input = document.getElementById("field-name");
const field_kind_select = document.getElementById("field-kind");
const fields_list = document.getElementById("fields-list");

const edit_dialog = document.getElementById("edit-dialog");
const edit_form = document.getElementById("edit-form");
const edit_name_input = document.getElementById("edit-name");
const edit_cancel_button = document.getElementById("edit-cancel");

let editing_field_id = null;

const KIND_LABELS = {
    text: "نص",
    range: "من / إلى"
};

function render_fields(fields) {
    fields_list.replaceChildren();

    if (fields.length === 0) {
        fields_list.appendChild(create_element("li", "لا توجد أقسام متابعة بعد.", "empty"));
        return;
    }

    fields.forEach(function (field, index) {
        const item = document.createElement("li");

        const main = create_element("div", null, "row-main");
        main.appendChild(create_element("span", field.name, "row-title"));
        main.appendChild(create_element("span", KIND_LABELS[field.kind] || field.kind, "kind-label"));
        if (field.isActive) {
            main.appendChild(create_element("span", "نشط", "badge badge-active"));
        } else {
            main.appendChild(create_element("span", "معطل", "badge badge-inactive"));
        }

        const actions = create_element("div", null, "row-actions");

        const up_button = create_element("button", "↑", "button button-secondary button-small");
        up_button.type = "button";
        up_button.setAttribute("aria-label", "تحريك القسم للأعلى");
        up_button.disabled = index === 0;
        up_button.addEventListener("click", function () {
            patch_field(field._id, { move: "up" }, "تم تغيير الترتيب");
        });

        const down_button = create_element("button", "↓", "button button-secondary button-small");
        down_button.type = "button";
        down_button.setAttribute("aria-label", "تحريك القسم للأسفل");
        down_button.disabled = index === fields.length - 1;
        down_button.addEventListener("click", function () {
            patch_field(field._id, { move: "down" }, "تم تغيير الترتيب");
        });

        const edit_button = create_element("button", "تعديل", "button button-secondary button-small");
        edit_button.type = "button";
        edit_button.addEventListener("click", function () {
            open_edit_dialog(field);
        });

        const toggle_button = create_element("button", field.isActive ? "تعطيل" : "إعادة تفعيل", "button button-secondary button-small");
        toggle_button.type = "button";
        toggle_button.addEventListener("click", function () {
            toggle_field(field);
        });

        actions.appendChild(up_button);
        actions.appendChild(down_button);
        actions.appendChild(edit_button);
        actions.appendChild(toggle_button);

        item.appendChild(main);
        item.appendChild(actions);
        fields_list.appendChild(item);
    });
}

async function load_fields() {
    try {
        const fields = await api_request("/api/fields?" + section_query());
        render_fields(fields);
    } catch (error) {
        show_message(error.message, "error");
    }
}

async function add_field(event) {
    event.preventDefault();

    try {
        await api_request("/api/fields", {
            method: "POST",
            body: { name: field_name_input.value, kind: field_kind_select.value, section: current_section }
        });
        field_form.reset();
        field_name_input.focus();
        show_message("تمت إضافة القسم. سيظهر في الجلسات الجديدة والقديمة.", "ok");
        await load_fields();
    } catch (error) {
        show_message(error.message, "error");
    }
}

async function patch_field(field_id, body, ok_text) {
    try {
        await api_request("/api/fields/" + field_id, { method: "PATCH", body: body });
        show_message(ok_text, "ok");
        await load_fields();
    } catch (error) {
        show_message(error.message, "error");
    }
}

function open_edit_dialog(field) {
    editing_field_id = field._id;
    edit_name_input.value = field.name;
    edit_dialog.showModal();
    edit_name_input.focus();
}

async function save_field_name(event) {
    event.preventDefault();

    await patch_field(editing_field_id, { name: edit_name_input.value }, "تم تعديل الاسم. الجداول القديمة تعرض الاسم الجديد في العنوان.");
    edit_dialog.close();
}

async function toggle_field(field) {
    if (field.isActive) {
        const confirmed = confirm("تعطيل قسم «" + field.name + "»؟\nلن تُحذف بياناته القديمة، لكنه لن يظهر في النماذج الجديدة.");
        if (!confirmed) {
            return;
        }
    }
    await patch_field(
        field._id,
        { isActive: !field.isActive },
        field.isActive ? "تم تعطيل القسم" : "تمت إعادة تفعيل القسم"
    );
}

field_form.addEventListener("submit", add_field);
edit_form.addEventListener("submit", save_field_name);
edit_cancel_button.addEventListener("click", function () {
    edit_dialog.close();
});

if (current_section) {
    load_fields();
}
