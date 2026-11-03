// Search terms are user input, so regex metacharacters must be treated as text.
export default function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
