from app.db.models import Food


class SearchService:
    def __init__(self, db):
        self.db = db

        self.translations = {
            "куриный": "chicken",
            "бургер": "burger",
            "картошка": "fries",
            "фри": "fries",
            "салат": "salad",
            "пицца": "pizza",
            "кола": "coca cola"
        }

    def translate_query(self, query: str):
        words = query.lower().split()
        translated_words = []

        for word in words:
            if word in self.translations:
                translated_words.append(self.translations[word])
            else:
                translated_words.append(word)

        return " ".join(translated_words)

    def search(self, query: str):
        foods = self.db.query(Food).all()
        results = []

        q_original = query.lower()
        q_translated = self.translate_query(query)

        for food in foods:
            name = food.name.lower()

            score = 0

            if q_original in name:
                score += 1

            if q_translated in name:
                score += 1

            for word in q_original.split():
                if word in name:
                    score += 0.5

            for word in q_translated.split():
                if word in name:
                    score += 0.5

            if score > 0.5:
                results.append({
                    "name": food.name,
                    "calories": food.calories,
                    "protein": food.protein,
                    "fat": food.fat,
                    "carbs": food.carbs,
                    "score": round(score, 2)
                })

        results = sorted(results, key=lambda x: x["score"], reverse=True)

        return results