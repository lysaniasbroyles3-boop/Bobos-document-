const $ = id => document.getElementById(id);

let state = {
    notes: [],
    projects: [],
    level: 1,
    completed_studies: [],
    cash: 10000,
    portfolio: {},
    transactions: [],
    products: [],
    credits: 100
};

async function api(url, body) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}

function money(value) {
    return "$" + Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showPage(name) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("active", page.id === "page-" + name);
    });

    document.querySelectorAll(".nav").forEach(button => {
        button.classList.toggle("active", button.dataset.page === name);
    });

    const titles = {
        home: "Dashboard",
        ai: "BobAI",
        bible: "BobBible",
        trade: "BobTrade",
        code: "BobCode Studio",
        shop: "BobShop",
        business: "BobBusiness",
        files: "BobFiles & Notes",
        lab: "Bob3D + BobPCB"
    };

    $("page-title").textContent = titles[name] || "Dashboard";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.go);
    });
});

async function refresh() {
    try {
        const response = await fetch("/api/state");

        if (!response.ok) {
            throw new Error("Could not load BOBOS data.");
        }

        state = await response.json();
        render();
    } catch (error) {
        console.error(error);
    }
}

function render() {
    $("credits").textContent = state.credits;
    $("level").textContent = state.level;
    $("cash").textContent = money(state.cash);
    $("portfolio-cash").textContent = money(state.cash);
    $("project-count").textContent = state.projects.length;
    $("note-count").textContent = state.notes.length;

    $("notes-list").innerHTML = state.notes
        .slice()
        .reverse()
        .map(note => `
            <div class="list-item">
                <span>${escapeHtml(note.text)}</span>
                <small>${escapeHtml(note.created || "")}</small>
            </div>
        `)
        .join("") || '<p class="hint">No notes yet. Save your first idea!</p>';

    $("projects-list").innerHTML = state.projects
        .map((project, index) => ({ project, index }))
        .reverse()
        .map(({ project, index }) => `
            <div class="list-item">
                <span>
                    <b>${escapeHtml(project.name)}</b><br>
                    <small>${escapeHtml(project.created || "Saved project")}</small>
                </span>
                <button class="secondary" data-load-project="${index}">
                    Load
                </button>
            </div>
        `)
        .join("") || '<p class="hint">No saved projects yet.</p>';

    document.querySelectorAll("[data-load-project]").forEach(button => {
        button.addEventListener("click", () => {
            const project = state.projects[Number(button.dataset.loadProject)];

            $("project-name").value = project.name;
            $("project-code").value = project.code || "";

            showPage("code");
        });
    });

    $("portfolio").innerHTML = Object.entries(state.portfolio)
        .filter(([symbol, quantity]) => quantity > 0)
        .map(([symbol, quantity]) => `
            <div class="list-item">
                <b>${escapeHtml(symbol)}</b>
                <span>${quantity} shares</span>
            </div>
        `)
        .join("") || '<p class="hint">No shares yet. Try a practice trade.</p>';

    $("transactions").innerHTML = state.transactions.length
        ? `
            <table>
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Action</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.transactions.map(trade => `
                        <tr>
                            <td>${escapeHtml(trade.symbol)}</td>
                            <td>${escapeHtml(trade.action)}</td>
                            <td>${trade.quantity}</td>
                            <td>${money(trade.price)}</td>
                            <td>${money(trade.total)}</td>
                            <td>${escapeHtml(trade.time)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `
        : "No trades yet.";

    $("products").innerHTML = (state.products || [])
        .map(product => `
            <div class="launch-card">
                <span class="launch-icon purple">▦</span>
                <b>${escapeHtml(product.name)}</b>
                <small>${escapeHtml(product.description)}</small>
                <strong>${Number(product.price) === 0
                    ? "Free"
                    : money(product.price)}</strong>
                <span class="pill">DEMO LISTING</span>
            </div>
        `)
        .join("");
}

// BOBAI
function addBubble(message, type) {
    const bubble = document.createElement("div");
    bubble.className = "bubble " + type;
    bubble.textContent = message;

    $("chat").appendChild(bubble);
    $("chat").scrollTop = $("chat").scrollHeight;
}

$("ai-form").addEventListener("submit", async event => {
    event.preventDefault();

    const input = $("ai-input");
    const message = input.value.trim();

    if (!message) return;

    addBubble(message, "user");
    input.value = "";

    try {
        const result = await api("/api/ai", { message });
        addBubble(result.reply, "bot");
    } catch (error) {
        addBubble(error.message, "bot");
    }
});

// BOBBIBLE
$("complete-study").addEventListener("click", async () => {
    try {
        const today = new Date().toLocaleDateString("en-CA");

        const result = await api("/api/study", {
            id: today
        });

        state.level = result.level;
        state.credits = result.credits;

        $("level").textContent = result.level;
        $("credits").textContent = result.credits;

        $("study-message").textContent =
            "Study completed! Your current level is " +
            result.level + ".";

    } catch (error) {
        $("study-message").textContent = error.message;
    }
});

$("lookup-verse").addEventListener("click", () => {
    const book = $("book").value.trim().toLowerCase();
    const chapter = $("chapter").value;
    const verse = $("verse").value;

    if (book === "joshua" && chapter === "1" && verse === "9") {
        $("verse-result").textContent =
            "Joshua 1:9 — Be strong and courageous. " +
            "This is the sample passage in BOBOS.";
    } else {
        $("verse-result").textContent =
            "The starter includes Joshua 1:9 only. " +
            "Connect a Bible text source to search other passages.";
    }
});

// BOBTRADE
async function doTrade(action) {
    $("trade-message").textContent = "";

    try {
        const result = await api("/api/trade", {
            symbol: $("symbol").value,
            quantity: $("quantity").value,
            price: $("price").value,
            action: action
        });

        state.cash = result.cash;
        state.portfolio = result.portfolio;
        state.transactions = result.transactions;

        render();

        $("trade-message").textContent =
            action === "buy"
                ? "Practice purchase completed!"
                : "Practice sale completed!";

    } catch (error) {
        $("trade-message").textContent = error.message;
    }
}

$("buy").addEventListener("click", () => doTrade("buy"));
$("sell").addEventListener("click", () => doTrade("sell"));

// BOBCODE
$("project-form").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        await api("/api/projects", {
            name: $("project-name").value,
            code: $("project-code").value
        });

        await refresh();

        $("project-name").value = "";
        alert("Project saved!");

    } catch (error) {
        alert(error.message);
    }
});

$("preview-code").addEventListener("click", () => {
    const frame = document.createElement("iframe");

    frame.setAttribute("sandbox", "");
    frame.style.width = "100%";
    frame.style.minHeight = "180px";
    frame.style.border = "0";

    $("code-preview").replaceChildren(frame);
    frame.srcdoc = $("project-code").value;
});

// BOBFILES
$("note-form").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        await api("/api/notes", {
            text: $("note-text").value
        });

        $("note-text").value = "";
        await refresh();

    } catch (error) {
        alert(error.message);
    }
});

// BOBBUSINESS
$("calculate-profit").addEventListener("click", () => {
    const name = $("biz-product").value.trim() || "Your item";
    const cost = Number($("biz-cost").value);
    const price = Number($("biz-price").value);

    if (!Number.isFinite(cost) || !Number.isFinite(price) ||
        cost < 0 || price < 0) {
        $("profit-result").textContent =
            "Enter valid amounts of zero or more.";
        return;
    }

    const profit = price - cost;

    $("profit-result").textContent =
        name + ": estimated profit is " + money(profit) +
        " per item before other expenses.";
});

// EXPORT BOBOS DATA
$("export-data").addEventListener("click", async () => {
    try {
        const response = await fetch("/api/state");
        const data = await response.json();

        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "bobos-workspace.json";
        link.click();

        URL.revokeObjectURL(url);

    } catch (error) {
        alert("Could not export workspace data.");
    }
});

// LOAD SAVED DATA ON STARTUP
refresh();
