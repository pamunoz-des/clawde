const button = document.getElementById("theme-toggle");
if (button) {
  button.addEventListener("click", () => {
    const dark = document.body.classList.toggle("dark");
    button.textContent = dark ? "Tema claro" : "Tema oscuro";
    button.setAttribute("aria-pressed", String(dark));
  });
}
