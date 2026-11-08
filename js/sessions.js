const session_form = document.getElementById("session-form");
const session_title_input = document.getElementById("session-title");
const session_date_input = document.getElementById("session-date");
const session_end_input = document.getElementById("session-end-date");
const sessions_list = document.getElementById("sessions-list");

function render_sessions(sessions) {
    sessions_list.replaceChildren();

    if (sessions.length === 0) {
        sessions_list.appendChild(create_element("li", "لا توجد جلسات بعد. أنشئ أول جلسة من النموذج أعلاه.", "empty"));
        return;
    }

    sessions.forEach(function (session) {
        const item = document.createElement("li");

        const main = create_element("div", null, "row-main");
        main.appendChild(create_element("span", session_title(session), "row-title"));
        const period = session.endDate
            ? "من " + format_date(session.date) + " إلى " + format_date(session.endDate)
            : format_date(session.date);
        main.appendChild(create_element("span", period, "row-meta"));
        main.appendChild(create_element("span", session.evaluationsCount + " طالب", "row-meta"));

        const actions = create_element("div", null, "row-actions");

        const open_link = create_element("a", "فتح", "button button-small");
        open_link.href = page_url("session-details", session._id);

        const delete_button = create_element("button", "حذف", "button button-danger button-small");
        delete_button.type = "button";
        delete_button.addEventListener("click", function () {
            delete_session(session._id);
        });

        actions.appendChild(open_link);
        actions.appendChild(delete_button);

        item.appendChild(main);
        item.appendChild(actions);
        sessions_list.appendChild(item);
    });
}

async function load_sessions() {
    try {
        const sessions = await api_request_all("/api/sessions?" + section_query());
        render_sessions(sessions);
    } catch (error) {
        show_message(error.message, "error");
    }
}

async function add_session(event) {
    event.preventDefault();

    try {
        const session = await api_request("/api/sessions", {
            method: "POST",
            body: { title: session_title_input.value, date: session_date_input.value, endDate: session_end_input.value, section: current_section }
        });
        // بعد الإنشاء نفتح الجلسة مباشرة لبدء التقييم
        window.location.href = page_url("session-details", session._id);
    } catch (error) {
        show_message(error.message, "error");
    }
}

async function delete_session(session_id) {
    try {
        const deleted = await delete_session_with_confirm(session_id);
        if (deleted) {
            show_message("تم حذف الجلسة", "ok");
            await load_sessions();
        }
    } catch (error) {
        show_message(error.message, "error");
    }
}

session_date_input.value = today_string();
session_form.addEventListener("submit", add_session);
if (current_section) {
    load_sessions();
}
