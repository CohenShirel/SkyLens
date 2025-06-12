from pathlib import Path

from flask import Flask, render_template, request, redirect, url_for, jsonify, send_from_directory, flash

current_path = Path(__file__).parent
client_path = current_path / 'src' / 'client'


app = Flask(
    __name__,
    static_folder=str(client_path / 'static'),
    template_folder=str(client_path / 'templates')
)

app.secret_key = "super-secret"
app.url_map.strict_slashes = False

UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

users_db = [
    {"id": 1, "name": "Moshe", "age": 30},
    {"id": 2, "name": "David", "age": 25},
]


@app.route("/")
def index():
    return render_template("index.html", app_name="Flask Example")

@app.route("/hello/<username>")
def hello(username):
    return render_template("hello.html", name=username)

@app.route("/users")
def users():
    return render_template("users.html", users=users_db)

@app.route("/user/<int:user_id>")
def get_user(user_id):
    user = next((u for u in users_db if u['id'] == user_id), None)
    if user:
        return jsonify(user)
    return jsonify({"error": "User not found"}), 404

@app.route("/add_user", methods=["GET", "POST"])
def add_user():
    if request.method == "POST":
        name = request.form.get("name")
        age = request.form.get("age")
        if not name:
            flash("Name is required!", "danger")
            return redirect(url_for('add_user'))
        new_id = max(u["id"] for u in users_db) + 1 if users_db else 1
        users_db.append({"id": new_id, "name": name, "age": int(age) if age else None})
        flash("User added!", "success")
        return redirect(url_for("users"))
    return render_template("add_user.html")

@app.route("/delete_user/<int:user_id>", methods=["POST"])
def delete_user(user_id):
    global users_db
    orig_len = len(users_db)
    users_db = [u for u in users_db if u['id'] != user_id]
    if len(users_db) < orig_len:
        flash(f"User {user_id} deleted!", "success")
    else:
        flash(f"User {user_id} not found!", "danger")
    return redirect(url_for("users"))


@app.route("/upload", methods=["GET", "POST"])
def upload_file():
    if request.method == "POST":
        if "file" not in request.files:
            flash("No file part", "danger")
            return redirect(request.url)
        file = request.files["file"]
        if file.filename == "":
            flash("No selected file", "danger")
            return redirect(request.url)
        filepath = UPLOAD_FOLDER / file.filename
        file.save(filepath)
        flash(f"File {file.filename} uploaded!", "success")
        return redirect(url_for("uploaded_file", filename=file.filename))
    return render_template("upload.html")

@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route("/analyze", methods=["POST"])
def analyze():
    video_file = request.files.get("file")
    srt_file = request.files.get("srt")
    if not video_file or not srt_file:
        return jsonify({"error": "Both video and SRT files are required"}), 400

    # Save uploaded files to disk
    video_path = UPLOAD_FOLDER / video_file.filename
    srt_path = UPLOAD_FOLDER / srt_file.filename
    video_file.save(video_path)
    srt_file.save(srt_path)

    # Import handle_video from extractions_in_threads
    from extractions_in_threads import handle_video
    result_json_path = handle_video(video_path, srt_path)

    # Read and return the result JSON
    import json
    with open(result_json_path, encoding="utf-8") as f:
        result_data = json.load(f)
    return jsonify(result_data)
