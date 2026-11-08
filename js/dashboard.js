const latest_sessions_list = document.getElementById("latest-sessions");

function render_latest_sessions(sessions) {
    latest_sessions_list.replaceChildren();

    if (sessions.length === 0) {
        const item = create_element("li", "لا توجد جلسات بعد. أنشئ أول جلسة من زر «جلسة جديدة».", "empty");
        latest_sessions_list.appendChild(item);
        return;
    }

    sessions.forEach(function (session) {
        const item = document.createElement("li");

        const main = create_element("div", null, "row-main");
        const link = create_element("a", session_title(session), "row-title");
        link.href = page_url("session-details", session._id);
        main.appendChild(link);
        main.appendChild(create_element("span", format_date(session.date), "row-meta"));

        item.appendChild(main);
        item.appendChild(create_element("span", session.evaluationsCount + " طالب", "row-meta"));
        latest_sessions_list.appendChild(item);
    });
}

async function load_dashboard() {
    try {
        const data = await api_request("/api/dashboard?" + section_query());
        document.getElementById("active-students-count").textContent = data.activeStudents;
        document.getElementById("sessions-count").textContent = data.totalSessions;
        render_latest_sessions(data.latestSessions);
    } catch (error) {
        show_message(error.message, "error");
    }
}

if (current_section) {
    document.getElementById("new-session-link").href = page_url("sessions");
    load_dashboard();
}
