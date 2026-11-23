/* DSM AWARDS - Acceso a datos (Supabase) y modo demostración
 *
 * Si js/config.js todavía no tiene tu proyecto de Supabase, el sitio
 * funciona en MODO DEMOSTRACIÓN: muestra las 11 categorías y autos de
 * ejemplo, pero NO registra votos.
 */
(function () {
    "use strict";

    var cfg = window.DSM_CONFIG || {};
    var BUCKET = cfg.STORAGE_BUCKET || "car-photos";

    var configured =
        typeof cfg.SUPABASE_URL === "string" &&
        /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.SUPABASE_URL) &&
        cfg.SUPABASE_URL.indexOf("TU-PROYECTO") === -1 &&
        typeof cfg.SUPABASE_KEY === "string" &&
        cfg.SUPABASE_KEY.length > 20 &&
        cfg.SUPABASE_KEY.indexOf("TU_") !== 0 &&
        !!window.supabase;

    var clients = {};

    function client(persist) {
        if (!configured) {
            return null;
        }
        var key = persist ? "persist" : "public";
        if (!clients[key]) {
            clients[key] = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
                auth: {
                    persistSession: !!persist,
                    autoRefreshToken: !!persist,
                    detectSessionInUrl: false
                }
            });
        }
        return clients[key];
    }

    function esc(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    /* ---------- Datos de demostración (claramente identificados) ---------- */

    var DEMO_CATEGORIES = [
        ["el-mas-cuidado", "El más cuidado", "El Eclipse mejor conservado.", null, false],
        ["cliente-frecuente", "Cliente frecuente", "El que más tiempo ha pasado en el taller.", null, false],
        ["el-pozo-sin-fondo", "El pozo sin fondo", "El que más dinero le ha invertido.", null, false],
        ["el-mas-rapido", "El más rápido", "El de mejor desempeño.", "(El que no vote por el líder se va)", false],
        ["proyecto-interminable", "Proyecto interminable", "El que nunca termina de modificarse.", null, false],
        ["orgullo-del-club", "Orgullo del club", "El que mejor representa al club.", null, false],
        ["check-engine-award", "Check Engine Award", "El que siempre tiene una luz encendida.", null, false],
        ["frankenstein-award", "Frankenstein Award", "El que tiene más modificaciones.", null, false],
        ["mejor-auto-de-cochera", "Mejor auto de cochera", "El que casi nunca sale.", null, false],
        ["el-mas-fotogenico", "El más fotogénico", "El que mejor luce en fotografías.", null, false],
        ["eclipse-del-ano", "Eclipse del año", null, null, true]
    ].map(function (c, i) {
        return { id: c[0], slug: c[0], name: c[1], description: c[2], legend: c[3], is_main: c[4], sort_order: i + 1, is_active: true };
    });

    var DEMO_CARS = [
        ["demo-1", "Propietario demo 1", "1G (1990-1994)"],
        ["demo-2", "Propietario demo 2", "2G (1995-1999)"],
        ["demo-3", "Propietario demo 3", "3G (2000-2005)"],
        ["demo-4", "Propietario demo 4", "2G (1995-1999)"]
    ].map(function (c) {
        return { id: c[0], owner_name: c[1], generation: c[2], photo_path: null, description: "[DEMO] Auto de demostración. Reemplazar con datos oficiales." };
    });

    function placeholder(text) {
        var svg =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">' +
            '<rect width="800" height="600" fill="#1c1c1c"/>' +
            '<path d="M-40 600L360 0h150L110 600z" fill="#e87524"/>' +
            '<path d="M170 600L570 0h40L210 600z" fill="#ffffff"/>' +
            '<text x="400" y="548" fill="#c9c9c9" font-family="Arial,sans-serif" font-size="34" font-weight="700" text-anchor="middle">' +
            esc(text) + "</text></svg>";
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    }

    function photoUrl(path) {
        if (!configured) {
            return placeholder("FOTO DEMO");
        }
        if (!path) {
            return placeholder("SIN FOTO");
        }
        return client(false).storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    /* ---------- Consultas públicas ---------- */

    function must(result) {
        if (result.error) {
            throw result.error;
        }
        return result.data;
    }

    async function getCategories() {
        if (!configured) {
            return DEMO_CATEGORIES.slice();
        }
        return must(await client(false)
            .from("categories")
            .select("id,slug,name,description,legend,sort_order,is_main,is_active")
            .order("sort_order"));
    }

    async function getNominees(categoryId) {
        if (!configured) {
            return DEMO_CARS.slice();
        }
        var rows = must(await client(false)
            .from("nominations")
            .select("car:cars(id,owner_name,generation,description,photo_path)")
            .eq("category_id", categoryId));
        return rows
            .map(function (r) { return r.car; })
            .filter(Boolean)
            .sort(function (a, b) { return a.owner_name.localeCompare(b.owner_name, "es"); });
    }

    async function getCarsByIds(ids) {
        if (!configured || !ids.length) {
            return DEMO_CARS.slice();
        }
        return must(await client(false)
            .from("cars")
            .select("id,owner_name,generation,description,photo_path")
            .in("id", ids));
    }

    async function getSettings() {
        if (!configured) {
            return { voting_open: false, results_revealed: false };
        }
        var row = must(await client(false)
            .from("settings")
            .select("voting_open,results_revealed")
            .eq("id", 1)
            .maybeSingle());
        return row || { voting_open: false, results_revealed: false };
    }

    async function verifyCode(code) {
        return must(await client(false).rpc("verify_code", { p_code: code }));
    }

    async function castVote(code, categoryId, carId) {
        return must(await client(false).rpc("cast_vote", {
            p_code: code,
            p_category_id: categoryId,
            p_car_id: carId
        }));
    }

    async function getPublicResults() {
        if (!configured) {
            return [];
        }
        return must(await client(false).rpc("public_results"));
    }

    /* ---------- Código de votante en la sesión de la pestaña ----------
     * Es solo una comodidad para no reescribirlo en cada categoría.
     * NO es un mecanismo de seguridad: el servidor revalida el código
     * en cada voto y es quien impide los duplicados.
     */
    var KEY = "dsm_codigo";
    var code = {
        get: function () { try { return sessionStorage.getItem(KEY) || ""; } catch (e) { return ""; } },
        set: function (v) { try { sessionStorage.setItem(KEY, v); } catch (e) { /* sin almacenamiento */ } },
        clear: function () { try { sessionStorage.removeItem(KEY); } catch (e) { /* sin almacenamiento */ } }
    };

    window.DSM = {
        configured: configured,
        client: client,
        esc: esc,
        photoUrl: photoUrl,
        code: code,
        demoMessage: "Modo demostración: Supabase aún no está configurado. Los autos son de ejemplo y los votos no se registran.",
        api: {
            getCategories: getCategories,
            getNominees: getNominees,
            getCarsByIds: getCarsByIds,
            getSettings: getSettings,
            verifyCode: verifyCode,
            castVote: castVote,
            getPublicResults: getPublicResults
        }
    };
})();
