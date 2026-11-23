/* ==========================================================
   DSM AWARDS 2026 — Estilos del panel administrativo
   Se carga después de styles.css y usa sus variables.
   ========================================================== */

.admin-badge {
    margin-left: 10px;
    padding: 3px 10px;
    background-color: var(--orange);
    color: var(--black);
    font-size: 15px;
    letter-spacing: .06em;
    text-transform: uppercase;
    vertical-align: middle;
}

.admin-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.admin-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 5% 100px;
}

.admin-card {
    margin-bottom: 24px;
    padding: 28px;
    background-color: var(--gray-900);
    border: 1px solid var(--gray-700);
    border-top: 4px solid var(--orange);
}

.admin-card h1,
.admin-card h2 {
    margin-bottom: 18px;
    font-size: 32px;
}

.admin-card-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.admin-login {
    max-width: 440px;
    margin: 40px auto;
}

/* Botones */

.btn {
    display: inline-block;
    padding: 10px 18px;
    border: 1px solid transparent;
    background: none;
    color: var(--white);
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: background-color .2s var(--ease), color .2s var(--ease), border-color .2s var(--ease);
}

.btn[disabled] {
    opacity: .4;
    cursor: not-allowed;
}

.btn-primary {
    background-color: var(--orange);
    color: var(--black);
}

.btn-primary:not([disabled]):hover {
    background-color: var(--white);
}

.btn-ghost {
    border-color: var(--gray-500);
}

.btn-ghost:not([disabled]):hover {
    border-color: var(--white);
}

.btn-danger {
    border-color: #f85149;
    color: #ff7b72;
}

.btn-danger:not([disabled]):hover {
    background-color: #f85149;
    color: var(--black);
}

.btn-small {
    padding: 6px 12px;
    font-size: 14px;
}

/* Formularios */

.field {
    margin-bottom: 18px;
}

.field label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--gray-300);
}

.field input[type="text"],
.field input[type="email"],
.field input[type="password"],
.field textarea {
    width: 100%;
    padding: 11px 13px;
    background-color: var(--black);
    border: 1px solid var(--gray-500);
    color: var(--white);
    font: inherit;
}

.field input[type="file"] {
    width: 100%;
    color: var(--gray-300);
    font: inherit;
}

.form-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.form-error {
    min-height: 1.4em;
    margin-bottom: 12px;
    color: #ff7b72;
}

.hint {
    margin-bottom: 18px;
    color: var(--gray-500);
    font-size: 15px;
}

.photo-preview {
    display: block;
    width: 100%;
    max-width: 320px;
    margin-top: 12px;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border: 1px solid var(--gray-700);
}

/* Pestañas */

.admin-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 28px;
    border-bottom: 2px solid var(--gray-700);
}

.admin-tab {
    margin-bottom: -2px;
    padding: 12px 20px;
    background: none;
    border: 0;
    border-bottom: 4px solid transparent;
    color: var(--gray-300);
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: .03em;
    text-transform: uppercase;
    cursor: pointer;
}

.admin-tab:hover {
    color: var(--white);
}

.admin-tab.is-active {
    color: var(--white);
    border-bottom-color: var(--orange);
}

.admin-panel[hidden] {
    display: none;
}

/* Disposición */

.admin-split {
    display: grid;
    grid-template-columns: minmax(280px, 380px) 1fr;
    gap: 24px;
    align-items: start;
}

.admin-split-narrow {
    grid-template-columns: minmax(260px, 340px) 1fr;
}

/* Listas */

.admin-list {
    list-style: none;
}

.admin-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid var(--gray-700);
}

.admin-row:last-child {
    border-bottom: 0;
}

.admin-thumb {
    flex-shrink: 0;
    width: 76px;
    height: 57px;
    object-fit: cover;
    background-color: var(--gray-800);
}

.admin-row-main {
    flex: 1;
    min-width: 0;
}

.admin-row-main strong {
    display: block;
    overflow-wrap: anywhere;
}

.admin-row-main span {
    font-size: 14px;
    color: var(--gray-500);
}

.admin-row-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.tag {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    background-color: var(--gray-700);
    color: var(--gray-300);
    font-size: 12px;
    font-weight: 600;
    vertical-align: middle;
}

.tag-warn {
    background-color: var(--orange);
    color: var(--black);
}

.tag-off {
    background-color: #5b1d1a;
    color: #ffb4ae;
}

.cat-button {
    display: block;
    width: 100%;
    padding: 12px 14px;
    background: none;
    border: 0;
    border-left: 4px solid var(--gray-700);
    color: var(--white);
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.cat-button:hover {
    background-color: var(--gray-800);
}

.cat-button.is-selected {
    border-left-color: var(--orange);
    background-color: var(--gray-800);
}

.check-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--gray-700);
    cursor: pointer;
}

.check-row input {
    width: 20px;
    height: 20px;
    accent-color: var(--orange);
}

/* Tablas */

.table-wrap {
    overflow-x: auto;
}

.admin-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
}

.admin-table th,
.admin-table td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--gray-700);
    text-align: left;
}

.admin-table th {
    color: var(--gray-500);
    font-weight: 600;
}

.code-cell {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: .12em;
}

.codes-box {
    margin-top: 24px;
    padding: 20px;
    background-color: var(--black);
    border: 1px dashed var(--orange);
}

/* Estado de votación */

.state-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 24px;
    margin-bottom: 24px;
}

.state-card {
    padding: 26px;
    background-color: var(--gray-900);
    border: 1px solid var(--gray-700);
    border-top: 4px solid var(--gray-500);
}

.state-card h3 {
    margin-bottom: 10px;
    font-size: 22px;
    color: var(--gray-300);
}

.state-value {
    margin-bottom: 18px;
    font-family: var(--font-display);
    font-size: 44px;
    font-weight: 800;
    text-transform: uppercase;
}

.state-value.is-on {
    color: #3fb950;
}

.state-value.is-off {
    color: var(--gray-500);
}

/* Resultados */

.result-block {
    margin-bottom: 30px;
}

.result-block h3 {
    margin-bottom: 10px;
    font-size: 26px;
}

.result-row {
    display: grid;
    grid-template-columns: minmax(140px, 1.2fr) 3fr 56px;
    align-items: center;
    gap: 14px;
    padding: 7px 0;
}

.result-row.is-winner .result-name {
    color: var(--orange);
    font-weight: 600;
}

.bar {
    height: 12px;
    background-color: var(--gray-800);
}

.bar span {
    display: block;
    height: 100%;
    background-color: var(--gray-500);
}

.is-winner .bar span {
    background-color: var(--orange);
}

.result-votes {
    text-align: right;
    font-variant-numeric: tabular-nums;
}

@media (max-width: 820px) {
    .admin-split,
    .admin-split-narrow {
        grid-template-columns: 1fr;
    }

    .result-row {
        grid-template-columns: 1fr 48px;
    }

    .result-row .bar {
        grid-column: 1 / -1;
        order: 3;
    }

    .admin-row {
        flex-wrap: wrap;
    }
}
