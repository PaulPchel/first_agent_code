document.getElementById("searchBtn").addEventListener("click", search);

async function search() {
    const query = document.getElementById("query").value.trim();

    if (!query) return;

    const box = document.getElementById("results");

    box.innerHTML = "<p>Загрузка...</p>";

    try {
        const res = await fetch(`/dishes/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();

        console.log(data);

        box.innerHTML = "";

        if (!data.results || data.results.length === 0) {
            box.innerHTML = "<p>Ничего не найдено</p>";
            return;
        }

        data.results.forEach(item => {
            const div = document.createElement("div");
            div.className = "card";

            const nutrition = [
                item.calories != null ? `${item.calories} ккал` : null,
                item.protein != null ? `Б: ${item.protein}г` : null,
                item.fat != null ? `Ж: ${item.fat}г` : null,
                item.carbs != null ? `У: ${item.carbs}г` : null,
            ].filter(Boolean).join(" · ");

            div.innerHTML = `
                <h3>${item.dish_name}</h3>
                <p class="restaurant">${item.restaurant}</p>
                ${item.description ? `<p class="description">${item.description}</p>` : ""}
                ${nutrition ? `<p class="nutrition">${nutrition}</p>` : ""}
                ${item.price != null ? `<p class="price">${item.price} ₽</p>` : ""}
            `;

            box.appendChild(div);
        });

    } catch (error) {
        console.error(error);
        box.innerHTML = "<p>Ошибка подключения к серверу</p>";
    }
}