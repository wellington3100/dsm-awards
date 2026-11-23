/* DSM AWARDS - Utilidades comunes del sitio */

(function () {
    "use strict";

    var toggle = document.querySelector(".nav-toggle");
    var menu = document.getElementById("menu-principal");

    if (!toggle || !menu) {
        return;
    }

    function setMenu(open) {
        menu.classList.toggle("is-open", open);
        toggle.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.querySelector(".visually-hidden").textContent = open ? "Cerrar menú" : "Abrir menú";
    }

    toggle.addEventListener("click", function () {
        setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    menu.addEventListener("click", function (event) {
        if (event.target.closest("a")) {
            setMenu(false);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
            setMenu(false);
            toggle.focus();
        }
    });

    window.matchMedia("(min-width: 821px)").addEventListener("change", function (e) {
        if (e.matches) {
            setMenu(false);
        }
    });
})();
