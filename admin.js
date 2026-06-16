const list = document.querySelector("#article-list");
const editor = document.querySelector("#editor");
const toast = document.querySelector("#toast");
let articles = [];

function notify(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function populate(article) {
  [...editor.elements].forEach((field) => { if (field.name) field.value = article[field.name] || ""; });
}

async function load() {
  articles = (await (await fetch("/api/knowledge")).json()).articles;
  list.innerHTML = "";
  articles.forEach((article) => {
    const button = document.createElement("button");
    button.className = "article-row";
    button.innerHTML = `<span class="status">${article.status}</span><strong>${article.title}</strong><small>${article.category} · Updated ${article.updatedAt}</small>`;
    button.onclick = () => populate(article);
    list.append(button);
  });
}

editor.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(editor));
  const response = await fetch("/api/admin/knowledge", {
    method: "POST",
    headers: { "content-type": "application/json", "x-nest-role": "admin" },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) return notify(result.error);
  notify("Article saved.");
  editor.reset();
  load();
});

load();
