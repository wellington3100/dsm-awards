/* DSM AWARDS - Página de categorías */
(function () {
    "use strict";

    var DSM = window.DSM;
    var esc = DSM.esc;
    var list = document.getElementById("lista-categorias");
    var featured = document.getElementById("categoria-principal");
    var notice = document.getElementById("aviso");

    function showNotice(message, type) {
        notice.innerHTML = message
            ? '<p class="notice' + (type ? " notice-" + type : "") + '">' + esc(message) + "</p>"
            : "";
    }

    function href(category) {
        return "autos.html?categoria=" + encodeURIComponent(category.slug);
    }

    function card(c) {
        return (
            '<a class="category-card" href="' + href(c) + '">' +
            "<h2>" + esc(c.name) + "</h2>" +
            (c.description ? "<p>" + esc(c.description) + "</p>" : "") +
            (c.legend ? '<p class="category-legend">' + esc(c.legend) + "</p>" : "") +
            '<span class="category-cta">Ver nominados</span></a>'
        );
    }

    function main(c) {
        return (
            '<a class="category-featured" href="' + href(c) + '">' +
            '<svg class="category-featured-icon" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">' +
            '<path d="M20 8h24v14a12 12 0 0 1-24 0z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M20 12h-8a8 8 0 0 0 8 12M44 12h8a8 8 0 0 1-8 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
            '<path d="M32 34v12M22 56h20M26 46h12v10H26z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' +
            "</svg><h2>" + esc(c.name) + '</h2><span class="category-cta">Ver nominados</span></a>'
        );
    }

    async function init() {
        if (!DSM.configured) {
            showNotice(DSM.demoMessage);
        }
        try {
            var categories = await DSM.api.getCategories();
            var regular = categories.filter(function (c) { return !c.is_main; });
            var principal = categories.filter(function (c) { return c.is_main; });

            list.innerHTML = regular.map(card).join("");
            featured.innerHTML = principal.map(main).join("");

            if (!categories.length) {
                showNotice("Por ahora no hay categorías activas. Vuelve pronto.");
            }
        } catch (e) {
            showNotice("No se pudieron cargar las categorías. Revisa tu conexión e inténtalo de nuevo.", "error");
        }
    }

    init();
})();
