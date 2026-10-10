from flask import Flask, render_template, request, jsonify
import os
import json
import datetime

app = Flask(__name__)

DATA_FILE = "bobos_data.json"

DEFAULT_DATA = {
    "notes": [],
    "projects": [],
    "level": 1,
    "completed_studies": [],
    "cash": 10000.0,
    "portfolio": {},
    "transactions": [],
    "products": [
        {
            "name": "BOBOS Starter Pack",
            "price": 0,
            "description": "A demo digital product."
        },
        {
            "name": "Website Template",
            "price": 4.99,
            "description": "An example store listing."
        }
    ],
    "credits": 100
}


def load_data():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)

        for key, value in DEFAULT_DATA.items():
            if key not in data:
                data[key] = value

        return data

    except (OSError, json.JSONDecodeError):
        return json.loads(json.dumps(DEFAULT_DATA))


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/state")
def get_state():
    return jsonify(load_data())


@app.route("/api/notes", methods=["POST"])
def add_note():
    data = load_data()
    payload = request.get_json(silent=True) or {}

    text = payload.get("text", "").strip()

    if not text:
        return jsonify({"error": "Write a note first."}), 400

    data["notes"].append({
        "text": text,
        "created": datetime.datetime.now().strftime(
            "%Y-%m-%d %H:%M"
        )
    })

    save_data(data)
    return jsonify(data["notes"])


@app.route("/api/study", methods=["POST"])
def complete_study():
    data = load_data()
    payload = request.get_json(silent=True) or {}

    today = datetime.date.today().isoformat()
    study_id = payload.get("id", today)

    if study_id != today:
        return jsonify({
            "error": "Only today's lesson can be completed here."
        }), 400

    if study_id not in data["completed_studies"]:
        data["completed_studies"].append(study_id)
        data["level"] += 1
        data["credits"] = max(0, data["credits"] - 1)

    save_data(data)

    return jsonify({
        "level": data["level"],
        "completed": data["completed_studies"],
        "credits": data["credits"]
    })


@app.route("/api/trade", methods=["POST"])
def trade():
    data = load_data()
    payload = request.get_json(silent=True) or {}

    symbol = str(payload.get("symbol", "DEMO")).upper().strip()[:10]
    action = payload.get("action")

    try:
        quantity = int(payload.get("quantity", 1))
        price = float(payload.get("price", 0))
    except (ValueError, TypeError):
        return jsonify({
            "error": "Enter a valid quantity and price."
        }), 400

    if not symbol:
        return jsonify({"error": "Enter a stock symbol."}), 400

    if quantity < 1 or quantity > 100000 or price <= 0:
        return jsonify({
            "error": "Quantity and price must be positive."
        }), 400

    total = round(quantity * price, 2)
    shares = int(data["portfolio"].get(symbol, 0))

    if action == "buy":
        if total > data["cash"]:
            return jsonify({
                "error": "Not enough virtual cash."
            }), 400

        data["cash"] = round(data["cash"] - total, 2)
        data["portfolio"][symbol] = shares + quantity

    elif action == "sell":
        if quantity > shares:
            return jsonify({
                "error": "You don't own enough virtual shares."
            }), 400

        data["cash"] = round(data["cash"] + total, 2)
        data["portfolio"][symbol] = shares - quantity

    else:
        return jsonify({"error": "Choose buy or sell."}), 400

    data["transactions"].insert(0, {
        "symbol": symbol,
        "action": action,
        "quantity": quantity,
        "price": price,
        "total": total,
        "time": datetime.datetime.now().strftime(
            "%Y-%m-%d %H:%M"
        )
    })

    save_data(data)

    return jsonify({
        "cash": data["cash"],
        "portfolio": data["portfolio"],
        "transactions": data["transactions"]
    })


@app.route("/api/projects", methods=["POST"])
def save_project():
    data = load_data()
    payload = request.get_json(silent=True) or {}

    name = str(payload.get("name", "")).strip()[:80]
    code = str(payload.get("code", ""))

    if not name:
        return jsonify({
            "error": "Give your project a name."
        }), 400

    data["projects"].append({
        "name": name,
        "code": code,
        "created": datetime.datetime.now().strftime(
            "%Y-%m-%d %H:%M"
        )
    })

    save_data(data)
    return jsonify(data["projects"])


@app.route("/api/ai", methods=["POST"])
def bob_ai():
    payload = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()

    if not message:
        return jsonify({
            "reply": "Ask me about coding, studying, business, or BOBOS."
        })

    question = message.lower()

    if any(word in question for word in [
        "python", "code", "program", "website", "html"
    ]):
        reply = (
            "BobAI Demo: Break your project into small steps. "
            "Save a backup before changing code, and test one "
            "feature at a time. Tell me what you are building "
            "if you need coding help."
        )

    elif any(word in question for word in [
        "bible", "verse", "study"
    ]):
        reply = (
            "BobAI Demo: Read the passage, identify its main idea, "
            "write down what you learned, and think of one way "
            "to apply it. A complete Bible search needs a text source."
        )

    elif any(word in question for word in [
        "stock", "trade", "invest"
    ]):
        reply = (
            "BobAI Demo: BobTrade uses virtual money and practice "
            "prices. It does not fetch live market prices or provide "
            "personalized investment advice."
        )

    elif any(word in question for word in [
        "business", "sell", "shop", "price"
    ]):
        reply = (
            "BobAI Demo: Track your costs, choose a clear price, "
            "record sales, and ask permission before selling "
            "at school or online."
        )

    else:
        reply = (
            "Welcome to BobAI! This starter version has basic "
            "responses about BOBOS, coding, Bible study, stocks, "
            "and business. Connect an AI service to enable "
            "open-ended AI conversations."
        )

    return jsonify({"reply": reply})


@app.route("/api/credits", methods=["POST"])
def use_credits():
    data = load_data()
    payload = request.get_json(silent=True) or {}

    try:
        amount = int(payload.get("amount", 1))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid credit amount."}), 400

    amount = max(0, min(100, amount))

    if amount > data["credits"]:
        return jsonify({
            "error": "Not enough credits.",
            "credits": data["credits"]
        }), 400

    data["credits"] -= amount
    save_data(data)

    return jsonify({"credits": data["credits"]})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
