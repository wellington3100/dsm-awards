/* DSM AWARDS - Panel administrativo
 *
 * La seguridad NO depende de este archivo: aunque alguien lo modifique,
 * Supabase (RLS + funciones con is_admin()) rechaza cualquier acción
 * que no venga de una cuenta registrada en la tabla "admins".
 */
(function () {
    "use strict";

    var DSM = window.DSM;
    var esc = DSM.esc;
    var db = DSM.client(true);
    var BUCKET = (window.DSM_CONFIG && window.DSM_CONFIG.STORAGE_BUCKET) || "car-photos";
    var MAX_PHOTO = 5 * 1024 * 1024;
    var TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

    function $(id) { return document.getElementById(id); }

    var S = {
        cars: [],
        cats: [],
        noms: [],
        settings: { voting_open: false, results_revealed: false },
        voters: [],
        results: [],
        selCat: null
    };

    /* ---------- Utilidades ---------- */

    async function must(promise) {
        var r = await promise;
        if (r.error) { throw r.error; }
        return r.data;
    }

    function notify(message, type) {
        $("aviso").innerHTML = message
            ? '<p class="notice' + (type === "error" ? " notice-error" : "") + '">' + esc(message) + "</p>"
            : "";
        if (message) { window.scrollTo({ top: 0, behavior: "smooth" }); }
    }

    function uuid() {
        if (window.crypto && crypto.randomUUID) { return crypto.randomUUID(); }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15);
            return (c === "x" ? r : (r & 3) | 8).toString(16);
        });
    }

    function csvCell(value) {
        var s = String(value == null ? "" : value);
        if (/^[=+\-@\t\r]/.test(s)) { s = "'" + s; }   // evita inyección de fórmulas en Excel
        return '"' + s.replace(/"/g, '""') + '"';
    }

    function downloadCsv(filename, rows) {
        var csv = rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n");
        var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }

    function carLabel(id) {
        for (var i = 0; i < S.cars.length; i++) {
            if (S.cars[i].id === id) { return S.cars[i].owner_name + " (" + S.cars[i].generation + ")"; }
        }
        return "Vehículo eliminado";
    }

    /* ---------- Sesión ---------- */

    function showLogin(message) {
        $("vista-login").hidden = false;
        $("vista-panel").hidden = true;
        $("btn-salir").hidden = true;
        $("login-error").textContent = message || "";
    }

    function showPanel() {
        $("vista-login").hidden = true;
        $("vista-panel").hidden = false;
        $("btn-salir").hidden = false;
    }

    async function enter() {
        var res = await db.rpc("is_admin");
        if (res.error || res.data !== true) {
            await db.auth.signOut();
            showLogin("Esta cuenta no tiene permisos de administrador.");
            return;
        }
        showPanel();
        await loadAll();
    }

    async function onLogin(event) {
        event.preventDefault();
        var button = $("btn-login");
        button.disabled = true;
        $("login-error").textContent = "";
        try {
            var r = await db.auth.signInWithPassword({
                email: $("email").value.trim(),
                password: $("password").value
            });
            if (r.error) {
                $("login-error").textContent = "Correo o contraseña incorrectos.";
                return;
            }
            $("password").value = "";
            await enter();
        } catch (e) {
            $("login-error").textContent = "No se pudo iniciar sesión. Revisa tu conexión.";
        } finally {
            button.disabled = false;
        }
    }

    async function onLogout() {
        await db.auth.signOut();
        S.cars = []; S.cats = []; S.noms = []; S.voters = []; S.results = [];
        notify("");
        showLogin("");
    }

    /* ---------- Carga de datos ---------- */

    async function loadCars() { S.cars = await must(db.from("cars").select("*").order("created_at")); }
    async function loadCats() { S.cats = await must(db.from("categories").select("*").order("sort_order")); }
    async function loadNoms() { S.noms = await must(db.from("nominations").select("category_id,car_id")); }
    async function loadSettings() {
        S.settings = await must(db.from("settings").select("voting_open,results_revealed").eq("id", 1).single());
    }
    async function loadVoters() { S.voters = await must(db.rpc("admin_list_voters")); }
    async function loadResults() { S.results = await must(db.rpc("admin_results")); }

    async function loadAll() {
        try {
            await Promise.all([loadCars(), loadCats(), loadNoms(), loadSettings()]);
            if (!S.selCat && S.cats.length) { S.selCat = S.cats[0].id; }
            renderCars();
            renderCats();
            renderVotingState();
        } catch (e) {
            notify("No se pudieron cargar los datos: " + (e.message || e), "error");
        }
    }

    /* ---------- Pestañas ---------- */

    async function selectTab(name) {
        document.querySelectorAll(".admin-tab").forEach(function (b) {
            var on = b.getAttribute("data-tab") === name;
            b.classList.toggle("is-active", on);
            b.setAttribute("aria-selected", String(on));
        });
        ["vehiculos", "categorias", "votantes", "votacion"].forEach(function (t) {
            $("panel-" + t).hidden = t !== name;
        });
        try {
            if (name === "votantes") { await loadVoters(); renderVoters(); }
            if (name === "votacion") { await refreshVoting(); }
        } catch (e) {
            notify("No se pudieron cargar los datos: " + (e.message || e), "error");
        }
    }

    /* ================= VEHÍCULOS ================= */

    function renderCars() {
        if (!S.cars.length) {
            $("lista-autos-admin").innerHTML = '<li class="hint">Todavía no hay vehículos. Registra el primero con el formulario.</li>';
            return;
        }
        $("lista-autos-admin").innerHTML = S.cars.map(function (c) {
            return (
                '<li class="admin-row">' +
                '<img class="admin-thumb" src="' + esc(DSM.photoUrl(c.photo_path)) + '" alt="" loading="lazy">' +
                '<div class="admin-row-main"><strong>' + esc(c.owner_name) +
                (c.is_demo ? ' <span class="tag tag-warn">DEMO</span>' : "") + "</strong>" +
                "<span>" + esc(c.generation) + "</span></div>" +
                '<div class="admin-row-actions">' +
                '<button class="btn btn-ghost btn-small" type="button" data-act="edit-car" data-id="' + esc(c.id) + '">Editar</button>' +
                '<button class="btn btn-danger btn-small" type="button" data-act="del-car" data-id="' + esc(c.id) + '">Eliminar</button>' +
                "</div></li>"
            );
        }).join("");
    }

    function resetCarForm() {
        var f = $("form-auto");
        f.reset();
        f.elements.id.value = "";
        $("titulo-form-auto").textContent = "Nuevo vehículo";
        $("btn-cancelar-auto").hidden = true;
        $("foto-preview").hidden = true;
        $("foto-preview").removeAttribute("src");
    }

    function editCar(id) {
        var car = S.cars.filter(function (c) { return c.id === id; })[0];
        if (!car) { return; }
        var f = $("form-auto");
        f.elements.id.value = car.id;
        f.elements.propietario.value = car.owner_name;
        f.elements.generacion.value = car.generation;
        f.elements.descripcion.value = car.description || "";
        f.elements.foto.value = "";
        $("titulo-form-auto").textContent = "Editar vehículo";
        $("btn-cancelar-auto").hidden = false;
        $("foto-preview").src = DSM.photoUrl(car.photo_path);
        $("foto-preview").hidden = false;
        f.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function saveCar(event) {
        event.preventDefault();
        var f = $("form-auto");
        var button = $("btn-guardar-auto");
        var id = f.elements.id.value;
        var isNew = !id;
        id = id || uuid();

        var owner = f.elements.propietario.value.trim();
        var generation = f.elements.generacion.value.trim();
        var description = f.elements.descripcion.value.trim();
        var file = f.elements.foto.files[0] || null;

        if (!owner || !generation) {
            notify("El propietario y la generación son obligatorios.", "error");
            return;
        }
        if (file && !TYPES[file.type]) {
            notify("La fotografía debe ser JPG, PNG o WebP.", "error");
            return;
        }
        if (file && file.size > MAX_PHOTO) {
            notify("La fotografía supera los 5 MB.", "error");
            return;
        }

        var existing = null;
        if (!isNew) {
            var current = S.cars.filter(function (c) { return c.id === id; })[0];
            existing = current ? current.photo_path : null;
        }

        button.disabled = true;
        var newPath = null;
        try {
            if (file) {
                newPath = "cars/" + id + "-" + Date.now() + "." + TYPES[file.type];
                var up = await db.storage.from(BUCKET).upload(newPath, file, {
                    contentType: file.type, upsert: false, cacheControl: "3600"
                });
                if (up.error) { newPath = null; throw up.error; }
            }

            var row = {
                owner_name: owner,
                generation: generation,
                description: description || null,
                photo_path: newPath || existing
            };
            var res = isNew
                ? await db.from("cars").insert(Object.assign({ id: id }, row))
                : await db.from("cars").update(row).eq("id", id);

            if (res.error) {
                if (newPath) { await db.storage.from(BUCKET).remove([newPath]); }
                throw res.error;
            }
            if (newPath && existing) { await db.storage.from(BUCKET).remove([existing]); }

            notify("Vehículo guardado.");
            resetCarForm();
            await loadCars();
            renderCars();
            renderCats();
        } catch (e) {
            notify("No se pudo guardar el vehículo: " + (e.message || e), "error");
        } finally {
            button.disabled = false;
        }
    }

    async function deleteCar(id) {
        var car = S.cars.filter(function (c) { return c.id === id; })[0];
        if (!car) { return; }
        if (!window.confirm("¿Eliminar el vehículo de " + car.owner_name + "? También se quitará de sus nominaciones.")) { return; }
        var r = await db.from("cars").delete().eq("id", id);
        if (r.error) {
            notify(
                r.error.code === "23503"
                    ? "Este vehículo ya recibió votos y no se puede eliminar."
                    : "No se pudo eliminar: " + r.error.message,
                "error"
            );
            return;
        }
        if (car.photo_path) { await db.storage.from(BUCKET).remove([car.photo_path]); }
        notify("Vehículo eliminado.");
        if ($("form-auto").elements.id.value === id) { resetCarForm(); }
        await Promise.all([loadCars(), loadNoms()]);
        renderCars();
        renderCats();
    }

    /* ================= CATEGORÍAS Y NOMINACIONES ================= */

    function nominatedCount(catId) {
        return S.noms.filter(function (n) { return n.category_id === catId; }).length;
    }

    function renderCats() {
        $("lista-cats-admin").innerHTML = S.cats.map(function (c) {
            return (
                "<li>" +
                '<button class="cat-button' + (c.id === S.selCat ? " is-selected" : "") + '" type="button" data-act="sel-cat" data-id="' + esc(c.id) + '">' +
                esc(c.name) +
                (c.is_active ? "" : ' <span class="tag tag-off">Inactiva</span>') +
                " <span class=\"tag\">" + nominatedCount(c.id) + " nominados</span></button></li>"
            );
        }).join("");

        var cat = S.cats.filter(function (c) { return c.id === S.selCat; })[0];
        if (!cat) { $("detalle-cat").innerHTML = ""; return; }

        var nominated = {};
        S.noms.forEach(function (n) { if (n.category_id === cat.id) { nominated[n.car_id] = true; } });

        $("detalle-cat").innerHTML =
            "<h2>" + esc(cat.name) + "</h2>" +
            '<label class="check-row"><input type="checkbox" data-act="toggle-active" data-id="' + esc(cat.id) + '"' + (cat.is_active ? " checked" : "") + ">" +
            "<span>Categoría activa (visible para los votantes)</span></label>" +
            '<h3 style="margin:24px 0 8px;font-size:22px">Vehículos nominados</h3>' +
            (S.cars.length
                ? S.cars.map(function (car) {
                    return (
                        '<label class="check-row"><input type="checkbox" data-act="toggle-nom" data-cat="' + esc(cat.id) + '" data-car="' + esc(car.id) + '"' +
                        (nominated[car.id] ? " checked" : "") + ">" +
                        "<span>" + esc(car.owner_name) + " · " + esc(car.generation) +
                        (car.is_demo ? ' <span class="tag tag-warn">DEMO</span>' : "") + "</span></label>"
                    );
                }).join("")
                : '<p class="hint">Primero registra vehículos en la pestaña «Vehículos».</p>');
    }

    async function toggleActive(catId, on) {
        var r = await db.from("categories").update({ is_active: on }).eq("id", catId);
        if (r.error) { notify("No se pudo actualizar la categoría: " + r.error.message, "error"); }
        await loadCats();
        renderCats();
    }

    async function toggleNom(catId, carId, on) {
        var r = on
            ? await db.from("nominations").insert({ category_id: catId, car_id: carId })
            : await db.from("nominations").delete().eq("category_id", catId).eq("car_id", carId);
        if (r.error) {
            notify(
                r.error.code === "23503"
                    ? "Esa nominación ya tiene votos y no se puede quitar."
                    : "No se pudo actualizar la nominación: " + r.error.message,
                "error"
            );
        }
        await loadNoms();
        renderCats();
    }

    /* ================= VOTANTES Y CÓDIGOS ================= */

    function renderVoters() {
        var total = S.voters.length;
        var active = S.voters.filter(function (v) { return !v.revoked; }).length;
        var participated = S.voters.filter(function (v) { return Number(v.votes_cast) > 0; }).length;
        $("resumen-votantes").textContent =
            total + " votantes registrados · " + active + " con código activo · " + participated + " ya han votado.";

        $("lista-votantes").innerHTML = S.voters.length
            ? S.voters.map(function (v) {
                return (
                    "<tr><td>" + esc(v.label) + "</td>" +
                    "<td>" + (v.revoked ? '<span class="tag tag-off">Revocado</span>' : '<span class="tag">Activo</span>') + "</td>" +
                    "<td>" + Number(v.votes_cast) + "</td>" +
                    '<td><button class="btn btn-small ' + (v.revoked ? "btn-ghost" : "btn-danger") + '" type="button" data-act="revoke" data-id="' + esc(v.voter_id) + '" data-revoked="' + (v.revoked ? "0" : "1") + '">' +
                    (v.revoked ? "Reactivar" : "Revocar") + "</button></td></tr>"
                );
            }).join("")
            : '<tr><td colspan="4" class="hint">Todavía no has generado códigos.</td></tr>';
    }

    async function onGenerateCodes(event) {
        event.preventDefault();
        var names = $("v-nombres").value.split(/\r?\n/).map(function (n) { return n.trim(); }).filter(Boolean);
        if (!names.length) { notify("Escribe al menos un nombre.", "error"); return; }
        if (names.length > 300) { notify("Máximo 300 nombres por lote.", "error"); return; }

        var button = $("btn-generar");
        button.disabled = true;
        try {
            var codes = await must(db.rpc("admin_create_codes", { p_labels: names }));
            $("v-nombres").value = "";
            showCodes(codes);
            await loadVoters();
            renderVoters();
        } catch (e) {
            notify("No se pudieron generar los códigos: " + (e.message || e), "error");
        } finally {
            button.disabled = false;
        }
    }

    function showCodes(codes) {
        var box = $("codigos-generados");
        box.hidden = false;
        box.className = "codes-box";
        box.innerHTML =
            "<p><strong>Guarda estos códigos ahora.</strong> No se podrán volver a ver. Envía cada uno solo a su dueño.</p>" +
            '<div class="table-wrap"><table class="admin-table"><thead><tr><th>Nombre</th><th>Código</th></tr></thead><tbody>' +
            codes.map(function (c) { return "<tr><td>" + esc(c.label) + '</td><td class="code-cell">' + esc(c.code) + "</td></tr>"; }).join("") +
            "</tbody></table></div>" +
            '<div class="form-actions" style="margin-top:16px">' +
            '<button class="btn btn-ghost" type="button" id="btn-copiar-codigos">Copiar todo</button>' +
            '<button class="btn btn-ghost" type="button" id="btn-csv-codigos">Descargar CSV</button></div>';

        $("btn-copiar-codigos").addEventListener("click", async function () {
            var text = codes.map(function (c) { return c.label + ": " + c.code; }).join("\n");
            try { await navigator.clipboard.writeText(text); notify("Códigos copiados."); }
            catch (e) { notify("No se pudo copiar. Usa «Descargar CSV».", "error"); }
        });
        $("btn-csv-codigos").addEventListener("click", function () {
            downloadCsv("codigos-dsm-awards.csv", [["Nombre", "Código"]].concat(codes.map(function (c) { return [c.label, c.code]; })));
        });
    }

    async function revokeVoter(id, revoked) {
        var r = await db.rpc("admin_revoke_voter", { p_voter_id: id, p_revoked: revoked });
        if (r.error) { notify("No se pudo actualizar el código: " + r.error.message, "error"); return; }
        await loadVoters();
        renderVoters();
    }

    /* ================= VOTACIÓN Y RESULTADOS ================= */

    function renderVotingState() {
        var s = S.settings;
        $("estado-votacion").innerHTML =
            '<div class="state-card"><h3>Votación</h3>' +
            '<p class="state-value ' + (s.voting_open ? "is-on" : "is-off") + '">' + (s.voting_open ? "Abierta" : "Cerrada") + "</p>" +
            '<button class="btn ' + (s.voting_open ? "btn-danger" : "btn-primary") + '" type="button" data-act="toggle-voting">' +
            (s.voting_open ? "Cerrar votación" : (s.results_revealed ? "Reabrir votación (oculta resultados)" : "Abrir votación")) + "</button></div>" +

            '<div class="state-card"><h3>Resultados públicos</h3>' +
            '<p class="state-value ' + (s.results_revealed ? "is-on" : "is-off") + '">' + (s.results_revealed ? "Revelados" : "Ocultos") + "</p>" +
            '<button class="btn ' + (s.results_revealed ? "btn-danger" : "btn-primary") + '" type="button" data-act="toggle-reveal"' +
            (s.voting_open && !s.results_revealed ? " disabled" : "") + ">" +
            (s.results_revealed ? "Volver a ocultar" : "Revelar ganadores") + "</button>" +
            (s.voting_open && !s.results_revealed ? '<p class="hint" style="margin:12px 0 0">Cierra la votación para poder revelar.</p>' : "") +
            "</div>";
    }

    async function setState(open, revealed) {
        var r = await db.rpc("admin_set_state", { p_voting_open: open, p_results_revealed: revealed });
        if (r.error) {
            notify(r.error.message.indexOf("close_voting_first") >= 0
                ? "Cierra la votación antes de revelar los resultados."
                : "No se pudo cambiar el estado: " + r.error.message, "error");
            return;
        }
        await loadSettings();
        renderVotingState();
    }

    function onStateClick(event) {
        var btn = event.target.closest("button[data-act]");
        if (!btn || btn.disabled) { return; }
        var s = S.settings;
        if (btn.dataset.act === "toggle-voting") {
            if (s.voting_open) {
                if (!window.confirm("¿Cerrar la votación? Nadie más podrá votar hasta que la reabras.")) { return; }
                setState(false, s.results_revealed);
            } else {
                if (s.results_revealed && !window.confirm("Reabrir la votación volverá a ocultar los resultados. ¿Continuar?")) { return; }
                setState(true, false);
            }
        }
        if (btn.dataset.act === "toggle-reveal") {
            if (!s.results_revealed) {
                if (!window.confirm("¿Revelar públicamente los ganadores? Cualquier visitante podrá verlos.")) { return; }
                setState(false, true);
            } else {
                setState(false, false);
            }
        }
    }

    function resultsByCategory() {
        var map = {};
        S.results.forEach(function (r) {
            (map[r.category_id] = map[r.category_id] || []).push({ car_id: r.car_id, votes: Number(r.votes) });
        });
        Object.keys(map).forEach(function (k) { map[k].sort(function (a, b) { return b.votes - a.votes; }); });
        return map;
    }

    function renderResults() {
        var byCat = resultsByCategory();
        var totalVotes = S.results.reduce(function (sum, r) { return sum + Number(r.votes); }, 0);
        var participated = S.voters.filter(function (v) { return Number(v.votes_cast) > 0; }).length;
        $("resumen-votacion").textContent =
            totalVotes + " votos en total · " + participated + " de " + S.voters.length + " votantes han participado.";

        $("resultados-admin").innerHTML = S.cats.map(function (cat) {
            var rows = byCat[cat.id] || [];
            var total = rows.reduce(function (s, r) { return s + r.votes; }, 0);
            var top = rows.length ? rows[0].votes : 0;
            return (
                '<div class="result-block"><h3>' + esc(cat.name) +
                (cat.is_active ? "" : ' <span class="tag tag-off">Inactiva</span>') +
                ' <span class="tag">' + total + " votos</span></h3>" +
                (rows.length
                    ? rows.map(function (r) {
                        var winner = top > 0 && r.votes === top;
                        var pct = total ? Math.round((r.votes / total) * 100) : 0;
                        return (
                            '<div class="result-row' + (winner ? " is-winner" : "") + '">' +
                            '<span class="result-name">' + esc(carLabel(r.car_id)) + (winner ? " · líder" : "") + "</span>" +
                            '<span class="bar"><span style="width:' + pct + '%"></span></span>' +
                            '<span class="result-votes">' + r.votes + "</span></div>"
                        );
                    }).join("")
                    : '<p class="hint">Sin nominados.</p>') +
                "</div>"
            );
        }).join("");
    }

    async function refreshVoting() {
        await Promise.all([loadSettings(), loadResults(), loadVoters(), loadCars(), loadCats()]);
        renderVotingState();
        renderResults();
    }

    function downloadResults() {
        var byCat = resultsByCategory();
        var rows = [["Categoría", "Vehículo", "Votos"]];
        S.cats.forEach(function (cat) {
            (byCat[cat.id] || []).forEach(function (r) { rows.push([cat.name, carLabel(r.car_id), r.votes]); });
        });
        downloadCsv("resultados-dsm-awards.csv", rows);
    }

    /* ---------- Eventos ---------- */

    function init() {
        if (!DSM.configured || !db) {
            $("form-login").hidden = true;
            notify("Falta configurar Supabase en js/config.js (URL y publishable key).", "error");
            return;
        }

        $("form-login").addEventListener("submit", onLogin);
        $("btn-salir").addEventListener("click", onLogout);

        document.querySelector(".admin-tabs").addEventListener("click", function (e) {
            var tab = e.target.closest(".admin-tab");
            if (tab) { selectTab(tab.getAttribute("data-tab")); }
        });

        $("form-auto").addEventListener("submit", saveCar);
        $("btn-cancelar-auto").addEventListener("click", resetCarForm);
        $("form-auto").elements.foto.addEventListener("change", function (e) {
            var file = e.target.files[0];
            if (file) {
                $("foto-preview").src = URL.createObjectURL(file);
                $("foto-preview").hidden = false;
            }
        });

        $("lista-autos-admin").addEventListener("click", function (e) {
            var btn = e.target.closest("button[data-act]");
            if (!btn) { return; }
            if (btn.dataset.act === "edit-car") { editCar(btn.dataset.id); }
            if (btn.dataset.act === "del-car") { deleteCar(btn.dataset.id); }
        });

        $("lista-cats-admin").addEventListener("click", function (e) {
            var btn = e.target.closest("button[data-act='sel-cat']");
            if (btn) { S.selCat = btn.dataset.id; renderCats(); }
        });

        $("detalle-cat").addEventListener("change", function (e) {
            var el = e.target;
            if (el.dataset.act === "toggle-active") { toggleActive(el.dataset.id, el.checked); }
            if (el.dataset.act === "toggle-nom") { toggleNom(el.dataset.cat, el.dataset.car, el.checked); }
        });

        $("form-codigos").addEventListener("submit", onGenerateCodes);
        $("lista-votantes").addEventListener("click", function (e) {
            var btn = e.target.closest("button[data-act='revoke']");
            if (btn) { revokeVoter(btn.dataset.id, btn.dataset.revoked === "1"); }
        });

        $("estado-votacion").addEventListener("click", onStateClick);
        $("btn-refrescar").addEventListener("click", function () {
            refreshVoting().catch(function (e) { notify("No se pudo actualizar: " + (e.message || e), "error"); });
        });
        $("btn-csv-resultados").addEventListener("click", downloadResults);

        db.auth.getSession().then(function (r) {
            if (r.data && r.data.session) { enter(); } else { showLogin(""); }
        });
    }

    init();
})();
