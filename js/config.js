/* DSM AWARDS - Configuración pública de Supabase
 *
 * Aquí solo va la URL del proyecto y la "publishable key" (o "anon key").
 * Ambas son públicas por diseño: la seguridad real la dan las políticas
 * RLS y las funciones de supabase/schema.sql.
 *
 * NUNCA pegues aquí la clave "service_role" ni "secret".
 */
window.DSM_CONFIG = {
    SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
    SUPABASE_KEY: "TU_PUBLISHABLE_KEY",
    STORAGE_BUCKET: "car-photos"
};
