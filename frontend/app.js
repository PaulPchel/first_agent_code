function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatNum(v) {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return escapeHtml(String(v));
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function nutritionGridHtml(item) {
    const cal = item.calories;
    const hasAny =
        cal != null || item.protein != null || item.fat != null || item.carbs != null;
    if (!hasAny) return "";

    return `
        <div class="nutrition-grid">
            <div class="nutrition-cell nutrition-cell--accent">
                <span class="label">Калории</span>
                <span class="value">${cal != null ? `${formatNum(cal)} <small>ккал</small>` : "—"}</span>
            </div>
            <div class="nutrition-cell">
                <span class="label">Белки</span>
                <span class="value">${item.protein != null ? `${formatNum(item.protein)} г` : "—"}</span>
            </div>
            <div class="nutrition-cell">
                <span class="label">Жиры</span>
                <span class="value">${item.fat != null ? `${formatNum(item.fat)} г` : "—"}</span>
            </div>
            <div class="nutrition-cell">
                <span class="label">Углеводы</span>
                <span class="value">${item.carbs != null ? `${formatNum(item.carbs)} г` : "—"}</span>
            </div>
        </div>
    `;
}

function getUserId() {
    const key = "nutrition_user_id";
    let id = localStorage.getItem(key);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(key, id);
    }
    return id;
}

const userId = getUserId();

let selectedRestaurantId = null;
let dishSearchTimer = null;
let dishesCache = [];

function setResultsHtml(html) {
    document.getElementById("results").innerHTML = html;
}

function dedupeDishesById(rows) {
    const seen = new Set();
    const out = [];
    for (const d of rows) {
        const id = d.id;
        if (id == null || seen.has(id)) continue;
        seen.add(id);
        out.push(d);
    }
    return out;
}

async function loadRestaurants() {
    const q = document.getElementById("restaurantSearch").value.trim();
    const url = q
        ? `/restaurants?query=${encodeURIComponent(q)}`
        : `/restaurants`;

    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
        setResultsHtml(`<p>${escapeHtml(data.detail || "Ошибка загрузки ресторанов")}</p>`);
        return;
    }

    const sel = document.getElementById("restaurantSelect");
    sel.innerHTML = "";

    (data.results || []).forEach(r => {
        const opt = document.createElement("option");
        opt.value = String(r.id);
        opt.textContent = r.name;
        sel.appendChild(opt);
    });
}

function dishNameMatches(d, qLower) {
    const name = (d.dish_name ?? "").toLowerCase();
    const desc = (d.description ?? "").toLowerCase();
    return !qLower || name.includes(qLower) || desc.includes(qLower);
}

function renderDishSelectFromCache() {
    const sel = document.getElementById("dishSelect");
    const q = document.getElementById("dishSearch").value.trim().toLowerCase();
    const rows = dishesCache.filter(d => dishNameMatches(d, q));

    const prev = sel.value;
    sel.innerHTML = "";

    if (!rows.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = dishesCache.length ? "Ничего не найдено" : "Нет блюд";
        opt.disabled = true;
        sel.appendChild(opt);
        return;
    }

    rows.forEach(d => {
        const opt = document.createElement("option");
        opt.value = String(d.id);
        opt.textContent = d.dish_name;
        sel.appendChild(opt);
    });

    if (prev && rows.some(d => String(d.id) === prev)) {
        sel.value = prev;
    }
}

async function refreshDishesCache() {
    if (!selectedRestaurantId) return;

    const url = `/dishes?restaurant_id=${encodeURIComponent(selectedRestaurantId)}&limit=300`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
        dishesCache = [];
        renderDishSelectFromCache();
        setResultsHtml(`<p>${escapeHtml(data.detail || "Ошибка загрузки блюд")}</p>`);
        return;
    }

    dishesCache = dedupeDishesById(data.results || []);
    renderDishSelectFromCache();
}

function scheduleFilterDishes() {
    if (dishSearchTimer) clearTimeout(dishSearchTimer);
    dishSearchTimer = setTimeout(() => renderDishSelectFromCache(), 120);
}

async function saveRestaurant() {
    const sel = document.getElementById("restaurantSelect");
    const restaurantId = Number(sel.value);
    if (!restaurantId) {
        alert("Выбери ресторан из списка");
        return;
    }

    const res = await fetch("/user/restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, restaurant_id: restaurantId }),
    });

    const data = await res.json();
    if (!res.ok) {
        alert(data.detail || "Ошибка сохранения ресторана");
        return;
    }

    selectedRestaurantId = restaurantId;

    document.getElementById("dishSearch").disabled = false;
    document.getElementById("dishSelect").disabled = false;
    document.getElementById("saveDishBtn").disabled = false;

    await refreshDishesCache();
    alert("✅ Ресторан сохранён");
}

async function saveDish() {
    const sel = document.getElementById("dishSelect");
    const dishId = Number(sel.value);
    if (!dishId) {
        alert("Выбери блюдо из списка");
        return;
    }

    const res = await fetch("/user/dish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, dish_id: dishId }),
    });

    const data = await res.json();
    if (!res.ok) {
        alert(data.detail || "Ошибка сохранения блюда");
        return;
    }

    alert("✅ Блюдо сохранено");
}

async function showResult() {
    setResultsHtml("<p>Загрузка...</p>");

    const res = await fetch(`/user/result?user_id=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if (!res.ok) {
        setResultsHtml(`<p>${escapeHtml(data.detail || "Ошибка запроса")}</p>`);
        return;
    }

    const nutrition = nutritionGridHtml(data);
    const priceBlock =
        data.price != null
            ? `<p class="price">${escapeHtml(formatNum(data.price))} ₽</p>`
            : "";

    setResultsHtml(`
        <div class="card">
            <h3>${escapeHtml(data.dish_name)}</h3>
            <p class="restaurant">${escapeHtml(data.restaurant_name)}</p>
            ${nutrition}
            ${priceBlock}
        </div>
    `);
}

async function search() {
    const queryInput = document.getElementById("query");
    const query = queryInput ? queryInput.value.trim() : "";

    const restaurantSearch = document.getElementById("restaurantSearch");
    const restaurant = restaurantSearch ? restaurantSearch.value.trim() : "";

    if (!query && !restaurant) return;

    setResultsHtml("<p>Загрузка...</p>");

    try {
        let url = `/dishes/search?query=${encodeURIComponent(query)}`;
        if (restaurant) {
            url += `&restaurant=${encodeURIComponent(restaurant)}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
            setResultsHtml(`<p>${escapeHtml(data.detail || "Ошибка запроса")}</p>`);
            return;
        }

        if (!data.results || data.results.length === 0) {
            setResultsHtml("<p>Ничего не найдено</p>");
            return;
        }

        const box = document.getElementById("results");
        box.innerHTML = "";

        data.results.forEach(item => {
            const div = document.createElement("div");
            div.className = "card";

            const nutrition = nutritionGridHtml(item);
            const priceBlock =
                item.price != null
                    ? `<p class="price">${escapeHtml(formatNum(item.price))} ₽</p>`
                    : "";

            div.innerHTML = `
                <h3>${escapeHtml(item.dish_name)}</h3>
                <p class="restaurant">${escapeHtml(item.restaurant)}</p>
                ${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ""}
                ${nutrition}
                ${priceBlock}
            `;

            box.appendChild(div);
        });
    } catch (error) {
        console.error(error);
        setResultsHtml("<p>Ошибка подключения к серверу</p>");
    }
}

document.getElementById("searchBtn")?.addEventListener("click", search);

document.getElementById("restaurantSearch")?.addEventListener("input", () => {
    loadRestaurants().catch(console.error);
});

document.getElementById("dishSearch")?.addEventListener("input", () => {
    scheduleFilterDishes();
});

loadRestaurants().catch(console.error);