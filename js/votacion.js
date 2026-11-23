/* DSM AWARDS - Página de votación (autos.html) */
(function () {
    "use strict";

    var DSM = window.DSM;
    var esc = DSM.esc;

    function $(id) { return document.getElementById(id); }

    var state = {
        categories: [],
        category: null,
        cars: [],
        settings: { voting_open: false, results_revealed: false },
        voter: null,
        voted: {},
        selected: null,
        busy: false,
        justVoted: false
    };
    var lastFocus = null;

    /* ---------- Mensajes ---------- */

    function notify(message, type) {
        $("aviso").innerHTML = message
            ? '<p class="notice' + (type ? " notice-" + type : "") + '">' + esc(message) + "</p>"
            : "";
    }

    function selectedCar() {
        for (var i = 0; i < state.cars.length; i++) {
            if (state.cars[i].id === state.selected) { return state.cars[i]; }
        }
        return null;
    }

    function canVote() {
        return DSM.configured && state.settings.voting_open && !state.voted[state.category.id];
    }

    function selectable() {
        return !DSM.configured || canVote();
    }

    /* ---------- Render ---------- */

    function renderHeader() {
        var c = state.category;
        document.title = c.name + " | DSM Awards 2026";
        $("titulo-categoria").textContent = c.name;
        $("desc-categoria").textContent = c.description || "";
        $("desc-categoria").hidden = !c.description;
        $("leyenda-categoria").textContent = c.legend || "";
        $("leyenda-categoria").hidden = !c.legend;
    }

    function renderStatus() {
        var text = "";
        if (!DSM.configured) {
            text = DSM.demoMessage;
        } else if (!state.settings.voting_open) {
            text = state.settings.results_revealed
                ? "La votación terminó. Los ganadores ya están en la página de Resultados."
                : "La votación está cerrada por ahora.";
        } else if (state.voted[state.category.id] && !state.justVoted) {
            text = "Ya votaste en esta categoría. Un voto emitido no se puede cambiar.";
        }
        $("estado").innerHTML = text ? '<p class="notice">' + esc(text) + "</p>" : "";
    }

    function renderCode() {
        var hasVoter = !!state.voter;
        $("codigo-form").hidden = hasVoter;
        $("codigo-info").hidden = !hasVoter;
        if (hasVoter) {
            var total = state.categories.length;
            var done = state.categories.filter(function (c) { return state.voted[c.id]; }).length;
            $("codigo-nombre").textContent = state.voter.label;
            $("codigo-progreso").textContent = "Has votado en " + done + " de " + total + " categorías.";
        }
    }

    function renderCars() {
        var disabled = !selectable();
        if (!state.cars.length) {
            $("lista-autos").innerHTML = '<li class="empty-state">Aún no hay autos nominados en esta categoría.</li>';
            return;
        }
        $("lista-autos").innerHTML = state.cars.map(function (car) {
            var alt = "Eclipse de " + car.owner_name + ", " + car.generation;
            return (
                "<li>" +
                '<label class="car-card">' +
                '<input type="radio" name="auto" value="' + esc(car.id) + '"' +
                (disabled ? " disabled" : "") +
                (state.selected === car.id ? " checked" : "") + ">" +
                '<span class="car-frame">' +
                '<span class="car-photo"><img src="' + esc(DSM.photoUrl(car.photo_path)) + '" alt="' + esc(alt) + '" loading="lazy"></span>' +
                '<span class="car-body">' +
                '<span class="car-owner">' + esc(car.owner_name) + "</span>" +
                '<span class="car-gen">' + esc(car.generation) + "</span>" +
                (car.description ? '<span class="car-desc">' + esc(car.description) + "</span>" : "") +
                "</span>" +
                '<span class="car-badge">Tu elección</span>' +
                "</span></label></li>"
            );
        }).join("");
    }

    function renderBar() {
        var car = selectedCar();
        var show = !!car && selectable();
        $("barra-voto").hidden = !show;
        if (show) {
            $("barra-seleccion").textContent = car.owner_name + " (" + car.generation + ")";
        }
    }

    function render() {
        renderStatus();
        renderCode();
        renderCars();
        renderBar();
    }

    function showMissing() {
        $("titulo-categoria").textContent = "Categoría no encontrada";
        $("desc-categoria").textContent = "El enlace no corresponde a ninguna categoría activa.";
        $("panel-codigo").hidden = true;
        $("lista-autos").innerHTML = '<li class="empty-state"><a class="primary-button" href="categorias.html">Ver las categorías</a></li>';
    }

    /* ---------- Código de votante ---------- */

    async function validate(code, silent) {
        var clean = String(code || "").trim();
        if (!clean) {
            if (!silent) { notify("Escribe tu código de votante.", "error"); }
            return false;
        }
        if (!DSM.configured) {
            if (!silent) { notify(DSM.demoMessage, "error"); }
            return false;
        }
        var res = await DSM.api.verifyCode(clean);
        if (res && res.valid) {
            state.voter = { label: res.label };
            state.voted = {};
            (res.voted || []).forEach(function (id) { state.voted[id] = true; });
            DSM.code.set(clean);
            notify("");
            return true;
        }
        DSM.code.clear();
        state.voter = null;
        state.voted = {};
        if (!silent) {
            notify(
                res && res.error === "too_many_attempts"
                    ? "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo."
                    : "Código no válido. Revisa que esté bien escrito.",
                "error"
            );
        }
        return false;
    }

    async function onCodeSubmit(event) {
        event.preventDefault();
        var button = $("codigo-boton");
        button.disabled = true;
        try {
            await validate($("codigo").value, false);
            $("codigo").value = "";
            render();
        } catch (e) {
            notify("No se pudo validar el código. Revisa tu conexión e inténtalo de nuevo.", "error");
        } finally {
            button.disabled = false;
        }
    }

    function onChangeCode() {
        DSM.code.clear();
        state.voter = null;
        state.voted = {};
        state.justVoted = false;
        $("mensaje-final").hidden = true;
        notify("");
        render();
        $("codigo").focus();
    }

    /* ---------- Votar ---------- */

    function onVoteClick() {
        if (!DSM.configured) {
            notify(DSM.demoMessage, "error");
            return;
        }
        if (!state.voter) {
            notify("Ingresa tu código de votante para poder votar.", "error");
            $("panel-codigo").scrollIntoView({ behavior: "smooth", block: "center" });
            $("codigo").focus();
            return;
        }
        openModal();
    }

    function openModal() {
        var car = selectedCar();
        if (!car) { return; }
        lastFocus = document.activeElement;
        $("modal-texto").textContent =
            "Vas a votar por " + car.owner_name + " (" + car.generation + ") en la categoría «" +
            state.category.name + "». Un voto emitido no se puede cambiar ni eliminar.";
        $("modal-confirmar").hidden = false;
        $("modal-aceptar").focus();
    }

    function closeModal() {
        $("modal-confirmar").hidden = true;
        if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }

    function nextCategory() {
        var index = state.categories.findIndex(function (c) { return c.id === state.category.id; });
        for (var k = 1; k < state.categories.length; k++) {
            var c = state.categories[(index + k) % state.categories.length];
            if (!state.voted[c.id]) { return c; }
        }
        return null;
    }

    function showDone() {
        var next = nextCategory();
        var box = $("mensaje-final");
        box.innerHTML =
            "<h2>¡Voto registrado!</h2>" +
            "<p>Gracias por votar en «" + esc(state.category.name) + "». Tu voto es definitivo.</p>" +
            (next
                ? '<a class="primary-button" href="autos.html?categoria=' + encodeURIComponent(next.slug) + '">Siguiente: ' + esc(next.name) + "</a>"
                : "<p>Ya votaste en todas las categorías. ¡Gracias por participar!</p>" +
                  '<a class="primary-button" href="categorias.html">Ver las categorías</a>');
        box.hidden = false;
        box.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    var VOTE_ERRORS = {
        invalid_code: "Tu código ya no es válido. Vuelve a ingresarlo.",
        voting_closed: "La votación está cerrada.",
        category_inactive: "Esta categoría ya no está disponible.",
        not_nominated: "Ese auto no está nominado en esta categoría.",
        too_many_attempts: "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo."
    };

    async function submitVote() {
        if (state.busy) { return; }
        state.busy = true;
        $("modal-aceptar").disabled = true;
        try {
            var res = await DSM.api.castVote(DSM.code.get(), state.category.id, state.selected);
            closeModal();
            if (res && res.ok) {
                state.voted[state.category.id] = true;
                state.justVoted = true;
                state.selected = null;
                notify("");
                render();
                showDone();
            } else if (res && res.error === "already_voted") {
                state.voted[state.category.id] = true;
                state.selected = null;
                notify("Ya habías votado en esta categoría. Tu voto no se puede cambiar.", "error");
                render();
            } else {
                if (res && res.error === "invalid_code") { onChangeCode(); }
                if (res && res.error === "voting_closed") { state.settings.voting_open = false; render(); }
                notify((res && VOTE_ERRORS[res.error]) || "No se pudo registrar el voto. Inténtalo de nuevo.", "error");
            }
        } catch (e) {
            closeModal();
            notify("No se pudo registrar el voto. Revisa tu conexión e inténtalo de nuevo.", "error");
        } finally {
            state.busy = false;
            $("modal-aceptar").disabled = false;
        }
    }

    /* ---------- Arranque ---------- */

    async function init() {
        var slug = new URLSearchParams(window.location.search).get("categoria");
        try {
            state.categories = await DSM.api.getCategories();
            state.category = state.categories.filter(function (c) { return c.slug === slug; })[0] || null;
            if (!state.category) { showMissing(); return; }

            renderHeader();
            var loaded = await Promise.all([
                DSM.api.getNominees(state.category.id),
                DSM.api.getSettings()
            ]);
            state.cars = loaded[0];
            state.settings = loaded[1];

            var saved = DSM.code.get();
            if (saved) {
                try { await validate(saved, true); } catch (e) { /* se pedirá de nuevo */ }
            }
            render();
        } catch (e) {
            notify("No se pudo cargar la categoría. Revisa tu conexión e inténtalo de nuevo.", "error");
        }
    }

    $("codigo-form").addEventListener("submit", onCodeSubmit);
    $("btn-cambiar-codigo").addEventListener("click", onChangeCode);
    $("btn-votar").addEventListener("click", onVoteClick);
    $("modal-aceptar").addEventListener("click", submitVote);
    $("modal-cancelar").addEventListener("click", closeModal);

    $("lista-autos").addEventListener("change", function (event) {
        if (event.target && event.target.name === "auto") {
            state.selected = event.target.value;
            state.justVoted = false;
            renderBar();
        }
    });

    $("modal-confirmar").addEventListener("click", function (event) {
        if (event.target === $("modal-confirmar")) { closeModal(); }
    });

    document.addEventListener("keydown", function (event) {
        if ($("modal-confirmar").hidden) { return; }
        if (event.key === "Escape") { closeModal(); }
        if (event.key === "Tab") {
            var first = $("modal-cancelar");
            var last = $("modal-aceptar");
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });

    init();
})();
