document.getElementById("searchBtn").addEventListener("click", search);

async function search() {
    const query = document.getElementById("query").value.trim();

    if (!query) return;

    const box = document.getElementById("results");

    // 👉 показываем загрузку
    box.innerHTML = "<p>Загрузка...</p>";

    try {
        const res = await fetch(`http://127.0.0.1:8000/rag/search?query=${encodeURIComponent(query)}`);
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

            div.innerHTML = `
                <h3>${item.restaurant}</h3>
                <p>📄 ${item.raw_text.substring(0, 200)}...</p>
                <p>⚡ Score: ${item.score}</p>
            `;

            box.appendChild(div);
        });

    } catch (error) {
        console.error(error);
        box.innerHTML = "<p>Ошибка подключения к серверу</p>";
    }
}