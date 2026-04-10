const user_id = 1;

async function setRestaurant() {
    const restaurant = document.getElementById("restaurant").value;

    const res = await fetch(`/user/restaurant?user_id=${user_id}&restaurant=${restaurant}`, {
        method: "POST"
    });

    const data = await res.json();

    if (data.error) {
        alert(data.error);
        return;
    }

    alert("✅ Ресторан выбран");
}

async function setMeal() {
    const meal = document.getElementById("meal").value;

    const res = await fetch(`/user/meal?user_id=${user_id}&meal=${meal}`, {
        method: "POST"
    });

    const data = await res.json();

    if (data.error) {
        alert(data.error);
        return;
    }

    alert("✅ Блюдо выбрано");
}

async function getNutrition() {
    const res = await fetch(`/user/nutrition?user_id=${user_id}`);
    const data = await res.json();

    const box = document.getElementById("results");

    if (data.error) {
        box.innerHTML = `<p>${data.error}</p>`;
        return;
    }

    box.innerHTML = `
        <div class="card">
            <h3>${data.name}</h3>
            <p>🔥 Calories: ${data.calories}</p>
            <p>💪 Protein: ${data.protein}</p>
            <p>🥑 Fat: ${data.fat}</p>
            <p>🍞 Carbs: ${data.carbs}</p>
        </div>
    `;
}