function safeSort(value, allowed, fallback) {
  if (!value) return fallback;
  return allowed.includes(value) ? value : fallback;
}
function safeOrder(value) {
  return (String(value || "").toLowerCase() === "asc") ? "ASC" : "DESC";
}
module.exports = { safeSort, safeOrder };
